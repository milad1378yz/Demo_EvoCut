import { attachParticles } from "./particles.js";
import { qs, sleep, formatNumber, loadConfig } from "./utils.js";
import { buildGenerations, extractCut, extractFullCode, extractIdea, getBestIndividual } from "./data/population.js";
import { createFitnessChart } from "./ui/chart.js";
import { renderTimeline, markRunning, markDone } from "./ui/timeline.js";

async function fetchJSON(path){
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

function animateText(el, newText){
  if (!el) return;
  if (window.gsap){
    gsap.to(el, { opacity: 0, duration: 0.12, onComplete: () => {
      el.textContent = newText;
      gsap.to(el, { opacity: 1, duration: 0.18 });
    }});
  } else {
    el.textContent = newText;
  }
}

function setHTML(el, html){
  if (!el) return;
  el.innerHTML = html;
}

function animateKPI(el, value){
  if (!el) return;
  if (!window.gsap){
    el.textContent = value;
    return;
  }
  const obj = { val: 0 };
  const current = Number(el.dataset.raw ?? 0);
  const target = Number(value);
  obj.val = current;

  gsap.to(obj, {
    val: target,
    duration: 0.45,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = formatNumber(obj.val, 3);
      el.dataset.raw = String(obj.val);
    }
  });
}

function shortCut(cut, maxLines=6){
  const lines = String(cut ?? "").split("\n");
  const head = lines.slice(0, maxLines).join("\n");
  return lines.length > maxLines ? head + "\n# ..." : head;
}

function deriveSkeleton(fullCode, cutText){
  if (!fullCode) return "";
  const cut = String(cutText ?? "").replace(/\r\n/g, "\n").trim();
  const normalizedFull = String(fullCode).replace(/\r\n/g, "\n");
  if (!cut) return normalizedFull.trimEnd();

  const idx = normalizedFull.indexOf(cut);
  if (idx !== -1){
    const before = normalizedFull.slice(0, idx);
    const after = normalizedFull.slice(idx + cut.length);
    return (before + after).replace(/\n{3,}/g, "\n\n").trimEnd();
  }

  const fullLines = normalizedFull.split("\n");
  const cutLines = cut.split("\n").map(line => line.trim()).filter(Boolean);
  if (cutLines.length === 0) return normalizedFull.trimEnd();

  for (let i = 0; i < fullLines.length; i++){
    if (fullLines[i].trim() !== cutLines[0]) continue;
    let j = 0;
    let k = i;
    while (j < cutLines.length && k < fullLines.length){
      const current = fullLines[k].trim();
      if (current === cutLines[j]){
        j++;
        k++;
        continue;
      }
      if (current === ""){
        k++;
        continue;
      }
      break;
    }
    if (j === cutLines.length){
      const kept = fullLines.slice(0, i).concat(fullLines.slice(k));
      return kept.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
    }
  }

  const cutSet = new Set(cutLines);
  const filtered = fullLines.filter(line => {
    const trimmed = line.trim();
    return trimmed === "" || !cutSet.has(trimmed);
  });
  return filtered.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function findCodeSourceFromGens(gens){
  for (const g of gens){
    const pop = g?.population ?? [];
    const best = g?.bestIndiv ?? getBestIndividual(pop);
    if (best?.chromosome?.full_code) return best;
    const candidate = pop.find(ind => ind?.chromosome?.full_code);
    if (candidate) return candidate;
  }
  return null;
}

function renderPopulationTable(pop){
  const sorted = [...(pop ?? [])].sort((a,b) => Number(b.fitness ?? 0) - Number(a.fitness ?? 0)).slice(0, 6);
  const rows = sorted.map((ind, i) => {
    const idea = (extractIdea(ind) || "-").slice(0, 60);
    const fit = formatNumber(ind.fitness, 3);
    return `
      <tr class="border-b border-white/10">
        <td class="py-2 pr-2 text-xs text-white/60">${i+1}</td>
        <td class="py-2 pr-2 text-xs font-semibold">${fit}</td>
        <td class="py-2 text-xs text-white/70">${idea}</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="w-full text-left">
      <thead>
        <tr class="text-[11px] uppercase tracking-wider text-white/45 border-b border-white/10">
          <th class="py-2 pr-2">#</th>
          <th class="py-2 pr-2">Fitness</th>
          <th class="py-2">Idea</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function main(){
  // Background particles
  attachParticles(qs("#bgParticles"));

  const cfg = loadConfig();
  if (!cfg){
    qs("#missingCfg").classList.remove("hidden");
    return;
  }

  // Header
  qs("#runTitle").textContent = `${cfg.problem?.name ?? cfg.problem?.id} - EvoCut Replay`;
  qs("#runMeta").textContent = `Run ${cfg.runId} | target: ${cfg.objective?.target ?? "-"} | max generations: ${cfg.evolution?.maxGenerations ?? "-"}`;

  // Fetch JSON run
  const problemId = cfg.problem?.id;
  const runJsonPath = cfg.problem?.runJsonPath ?? `data/${problemId}.json`;
  const run = await fetchJSON("./" + runJsonPath.replace(/^\//,""));

  // Build gens and apply max generations
  let gens = buildGenerations(run);

  const maxG = Number(cfg.evolution?.maxGenerations ?? (gens.length-1));
  // keep 0..maxG inclusive (if available)
  gens = gens.slice(0, Math.min(gens.length, maxG + 1));

  // Render timeline skeleton
  renderTimeline(qs("#timeline"), gens);

  // Chart
  const { appendPoint } = createFitnessChart(qs("#fitnessChart"));

  // Skeleton: derive from full_code by removing cuts to ensure clean skeleton
  const configCode = String(cfg.model?.code ?? "");
  const skeletonSource = cfg.model?.source ?? "run_json";
  const bestRunInd = run?.best_indiv || run?.bestIndiv;
  const codeSource = findCodeSourceFromGens(gens) || bestRunInd;
  const initialFullCode = extractFullCode(codeSource);
  const initialCut = extractCut(codeSource);

  const preferUploaded = (skeletonSource === "uploaded") && !!configCode;

  // Derive skeleton by removing any cuts from the full code unless an uploaded skeleton is present
  let skeleton = preferUploaded ? configCode : deriveSkeleton(initialFullCode, initialCut);

  // Fallback to run JSON skeleton fields if derivation failed
  if (!skeleton) {
    skeleton = run?.skeleton || run?.base_code || run?.model_code || configCode;
  }

  const skeletonEl = qs("#skeletonCode");
  if (skeletonEl) skeletonEl.textContent = String(skeleton).trimEnd() || "# (skeleton missing in run JSON)";

  // Start with no cut displayed - it will be updated during replay
  const cutEl = qs("#cutCode");
  if (cutEl) cutEl.textContent = "# (waiting for replay to start...)";

  // Baseline metrics
  const baselineBest = gens[0]?.bestFitness ?? gens[0]?.meanFitness ?? 0;
  qs("#baselineBest").textContent = formatNumber(baselineBest, 3);

  // Replay
  const ms = Number(cfg.replay?.msPerGeneration ?? 1100);

  for (let i=0; i<gens.length; i++){
    const g = gens[i];
    markRunning(qs("#timeline"), i);

    // Pick best indiv for this gen (for cut display)
    const bestInd = g.bestIndiv ?? getBestIndividual(g.population);
    const cut = extractCut(bestInd);
    const idea = extractIdea(bestInd);

    if (cutEl){
      cutEl.textContent = cut || "# (no cut)";
      if (window.gsap){
        gsap.fromTo(cutEl, { opacity: 0.6 }, { opacity: 1, duration: 0.22, ease: "power1.out" });
      }
    }

    // KPIs
    animateKPI(qs("#kpiBest"), g.bestFitness ?? 0);
    animateKPI(qs("#kpiMean"), g.meanFitness ?? 0);
    animateKPI(qs("#kpiStd"), g.stdFitness ?? 0);

    // Idea + cut snippet
    animateText(qs("#bestIdea"), idea || "-");
    qs("#cutSnippet").textContent = shortCut(cut || "# (no cut)", 10);

    // Population preview
    setHTML(qs("#popTable"), renderPopulationTable(g.population));

    // Chart point
    const lower = (g.meanFitness ?? 0) - (g.stdFitness ?? 0);
    const upper = (g.meanFitness ?? 0) + (g.stdFitness ?? 0);
    appendPoint({ gen: g.gen, best: g.bestFitness ?? 0, mean: g.meanFitness ?? 0, lower, upper });

    // done
    markDone(qs("#timeline"), i, g);

    // pacing
    await sleep(ms);
  }

  // Final summary
  const final = gens[gens.length - 1];
  const finalBest = final?.bestFitness ?? 0;
  const absImprovement = finalBest - baselineBest;
  const pct = baselineBest !== 0 ? (absImprovement / Math.abs(baselineBest)) : 0;

  qs("#finalBest").textContent = formatNumber(finalBest, 3);
  qs("#finalDelta").textContent = `${absImprovement >= 0 ? "+" : ""}${formatNumber(absImprovement, 3)}`;
  qs("#finalPct").textContent = baselineBest !== 0 ? `${(pct*100).toFixed(1)}%` : "-";

  qs("#summary").classList.remove("hidden");
  if (window.gsap){
    gsap.fromTo("#summary", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "power2.out" });
  }

  // Replay button
  qs("#replayBtn").addEventListener("click", async () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // lightweight restart: reload the page
    location.reload();
  });
}

main().catch(err => {
  console.error(err);
  const box = document.getElementById("fatal");
  if (box){
    box.classList.remove("hidden");
    box.textContent = String(err?.message ?? err);
  }
});
