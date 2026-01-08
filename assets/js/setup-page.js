import { attachParticles } from "./particles.js";
import { qs, qsa, saveConfig, uid } from "./utils.js";

const ACTIONS = [
  { id: "add_cuts", label: "Add Valid Inequalities / Cuts", desc: "Inject learned cuts into the model", enabled: true },
  { id: "warm_start", label: "Warm-start / MIP Starts", desc: "Seed the solver with good primal solutions", enabled: false },
  { id: "param_tuning", label: "Parameter Tuning", desc: "Tune solver parameters for your objective", enabled: false },
  { id: "reformulate", label: "Reformulation", desc: "Change formulation (extended vars, perspective, etc.)", enabled: false },
  { id: "branching", label: "Branching / Search Control", desc: "Custom branching priorities & callbacks", enabled: false },
  { id: "heuristics", label: "Primal Heuristics", desc: "Add or improve heuristics to find incumbents", enabled: false }
];

const TARGETS = [
  { id: "gap_within_time", label: "Reduce gap within a time budget", params: ["time_limit_s", "target_gap"] },
  { id: "time_to_gap", label: "Reach a target gap as fast as possible", params: ["target_gap", "time_cap_s"] },
  { id: "reduce_nodes", label: "Reduce nodes to reach a fixed gap", params: ["target_gap", "node_cap"] },
  { id: "reduce_pdi", label: "Reduce Primal-Dual Integral (PDI)", params: ["time_limit_s"] },
  { id: "improve_bound", label: "Improve best bound quickly", params: ["time_limit_s"] },
  { id: "custom", label: "Custom metric (advanced)", params: ["custom_metric_name"] }
];

async function fetchJSON(path){
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

async function fetchText(path){
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.text();
}

function normalizeCutText(cut){
  if (!cut) return "";
  return String(cut).replace(/\r\n/g, "\n").trim();
}

function deriveSkeleton(fullCode, cutText){
  if (!fullCode) return "";
  const cut = normalizeCutText(cutText);
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

function pickCodeSourceFromPopulation(pop){
  if (!Array.isArray(pop) || pop.length === 0) return null;
  let best = pop[0];
  for (const ind of pop){
    if (Number(ind?.fitness ?? -Infinity) > Number(best?.fitness ?? -Infinity)) best = ind;
  }
  if (best?.chromosome?.full_code) return best;
  return pop.find(ind => ind?.chromosome?.full_code) ?? null;
}

function getSkeletonFromRun(run){
  const direct = run?.skeleton || run?.base_code || run?.model_code || "";
  if (direct){
    return { skeleton: String(direct).trimEnd(), hint: "Loaded skeleton from run JSON" };
  }

  const bestIndiv = run?.best_indiv || run?.bestIndiv;
  if (bestIndiv?.chromosome?.full_code){
    const fullCode = bestIndiv.chromosome.full_code;
    const cut = bestIndiv.chromosome.added_cut ?? "";
    const skeleton = deriveSkeleton(String(fullCode), cut);
    if (skeleton){
      return { skeleton, hint: "Loaded skeleton from best_indiv full_code" };
    }
  }

  const pools = [];
  if (Array.isArray(run?.current_population)) pools.push(run.current_population);
  if (Array.isArray(run?.prev_populations)){
    for (let i = run.prev_populations.length - 1; i >= 0; i--){
      const pop = run.prev_populations[i]?.[0];
      if (Array.isArray(pop) && pop.length) pools.push(pop);
    }
  }

  for (const pop of pools){
    const source = pickCodeSourceFromPopulation(pop);
    if (!source) continue;
    const fullCode = source?.chromosome?.full_code ?? "";
    const cut = source?.chromosome?.added_cut ?? "";
    const skeleton = deriveSkeleton(String(fullCode), cut);
    if (skeleton){
      return { skeleton, hint: "Loaded skeleton from population full_code" };
    }
  }

  return { skeleton: "", hint: "Skeleton missing in run JSON" };
}

function makeActionCard(a){
  const disabledCls = a.enabled ? "" : "opacity-50 cursor-not-allowed";
  const badge = a.enabled ? `<span class="badge">enabled</span>` : `<span class="badge">coming soon</span>`;
  return `
    <label class="glass rounded-2xl p-4 flex gap-3 items-start ${disabledCls} hover:translate-y-[-1px] transition-all duration-300">
      <input type="checkbox" class="mt-1 accent-indigo-400" value="${a.id}" ${a.enabled ? "checked" : "disabled"} />
      <div class="flex-1">
        <div class="flex items-center justify-between gap-3">
          <div class="font-semibold text-sm">${a.label}</div>
          ${badge}
        </div>
        <div class="text-xs text-white/60 mt-1">${a.desc}</div>
      </div>
    </label>
  `;
}

function renderActions(){
  const wrap = qs("#actionsWrap");
  wrap.innerHTML = ACTIONS.map(makeActionCard).join("");
}

function renderTargets(){
  const sel = qs("#targetSelect");
  sel.innerHTML = TARGETS.map(t => `<option value="${t.id}">${t.label}</option>`).join("");
}

function renderTargetParams(targetId){
  const t = TARGETS.find(x => x.id === targetId) ?? TARGETS[0];
  const box = qs("#targetParams");
  const fields = [];

  const mk = (id, label, placeholder, type="text", def="") => `
    <div>
      <label class="block text-xs text-white/60 mb-1">${label}</label>
      <input id="param_${id}" type="${type}" placeholder="${placeholder}" value="${def}"
        class="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50" />
    </div>
  `;

  for (const p of t.params){
    if (p === "time_limit_s") fields.push(mk(p, "Time limit (seconds)", "e.g. 600", "number", "600"));
    if (p === "time_cap_s") fields.push(mk(p, "Hard time cap (seconds)", "e.g. 3600", "number", "3600"));
    if (p === "target_gap") fields.push(mk(p, "Target gap", "e.g. 0.01 (1%)", "number", "0.01"));
    if (p === "node_cap") fields.push(mk(p, "Node cap", "e.g. 50000", "number", "50000"));
    if (p === "custom_metric_name") fields.push(mk(p, "Metric name", "Describe your metric", "text", "my_metric"));
  }

  box.innerHTML = `
    <div class="grid md:grid-cols-3 gap-3">
      ${fields.join("")}
    </div>
  `;
}

function getTargetParams(targetId){
  const t = TARGETS.find(x => x.id === targetId);
  const params = {};
  for (const p of (t?.params ?? [])){
    const el = qs(`#param_${p}`);
    if (!el) continue;
    params[p] = (el.type === "number") ? Number(el.value) : el.value;
  }
  return params;
}

async function main(){
  // Particles background
  const canvas = qs("#bgParticles");
  attachParticles(canvas);

  // Fancy entrance
  if (window.gsap){
    gsap.fromTo(".enter", { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: "power2.out" });
  }

  // Load problems metadata
  const meta = await fetchJSON("./data/problems.json");
  const problemSelect = qs("#problemSelect");
  problemSelect.innerHTML = meta.problems.map(p => `<option value="${p.id}">${p.name} - ${p.tagline}</option>`).join("");

  // CodeMirror
  const textarea = qs("#codeEditor");
  const cm = window.CodeMirror.fromTextArea(textarea, {
    mode: "python",
    theme: "dracula",
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    lineWrapping: true
  });
  cm.setSize("100%", "420px");

  // Load skeleton from run JSON
  async function loadSkeleton(problemId){
    const p = meta.problems.find(x => x.id === problemId);
    if (!p) return;
    if (!p.runJson){
      cm.setValue("");
      qs("#codeHint").textContent = "No run JSON configured";
      return;
    }

    const runPath = "./" + String(p.runJson).replace(/^\//, "");
    try{
      if (/\.(py|txt)$/i.test(runPath)){
        const code = await fetchText(runPath);
        cm.setValue(code || "# (template empty)");
        qs("#codeHint").textContent = `Loaded template: ${p.runJson}`;
        return;
      }
      const run = await fetchJSON(runPath);
      const { skeleton, hint } = getSkeletonFromRun(run);
      const code = skeleton || "# (skeleton missing in run JSON)";
      cm.setValue(code);
      qs("#codeHint").textContent = `${hint}: ${p.runJson}`;
    }catch(err){
      console.error(err);
      cm.setValue("# (failed to load skeleton)");
      qs("#codeHint").textContent = `Load failed: ${p.runJson}`;
    }
  }

  await loadSkeleton(problemSelect.value);

  problemSelect.addEventListener("change", async () => {
    await loadSkeleton(problemSelect.value);
    if (window.gsap){
      gsap.fromTo("#codeCard", { scale: 0.985, opacity: 0.6 }, { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" });
    }
  });

  // Actions
  renderActions();

  // Targets
  renderTargets();
  renderTargetParams(qs("#targetSelect").value);
  qs("#targetSelect").addEventListener("change", (e) => renderTargetParams(e.target.value));

  // Sliders
  const maxPops = qs("#maxPops");
  const maxPopsValue = qs("#maxPopsValue");
  maxPopsValue.textContent = maxPops.value;
  maxPops.addEventListener("input", () => maxPopsValue.textContent = maxPops.value);

  const speed = qs("#speed");
  const speedValue = qs("#speedValue");
  speedValue.textContent = speed.value + " ms";
  speed.addEventListener("input", () => speedValue.textContent = speed.value + " ms");

  // Start
  qs("#startBtn").addEventListener("click", () => {
    const chosenProblemId = problemSelect.value;
    const chosenProblem = meta.problems.find(p => p.id === chosenProblemId);

    const actions = qsa('#actionsWrap input[type="checkbox"]:checked').map(x => x.value);
    const targetId = qs("#targetSelect").value;
    const targetParams = getTargetParams(targetId);

    const cfg = {
      runId: uid("demo"),
      createdAt: new Date().toISOString(),
      problem: {
        id: chosenProblemId,
        name: chosenProblem?.name ?? chosenProblemId,
        runJsonPath: chosenProblem?.runJson
      },
      model: {
        language: "pyomo",
        code: cm.getValue()
      },
      strategy: {
        actions,
        // you can later add mutation/crossover settings, population size, etc
      },
      objective: {
        target: targetId,
        params: targetParams
      },
      evolution: {
        maxGenerations: Number(maxPops.value)
      },
      replay: {
        msPerGeneration: Number(speed.value)
      }
    };

    saveConfig(cfg);

    // Animate + navigate
    const go = () => window.location.href = `run.html?problem=${encodeURIComponent(chosenProblemId)}`;

    if (window.gsap){
      gsap.to("body", { opacity: 0, duration: 0.35, ease: "power2.in", onComplete: go });
    } else {
      go();
    }
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
