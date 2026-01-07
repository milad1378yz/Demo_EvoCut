import { formatNumber } from "../utils.js";

export function renderTimeline(container, gens){
  container.innerHTML = "";

  const ul = document.createElement("ul");
  ul.className = "space-y-3";

  gens.forEach((g, idx) => {
    const li = document.createElement("li");
    li.className = "glass rounded-2xl p-3 border border-white/10 opacity-70 transition-all duration-300";
    li.dataset.gen = String(idx);

    li.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="mt-1">
          <div class="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-semibold">
            ${idx}
          </div>
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-semibold">Generation ${idx}</div>
            <div class="badge"><span class="w-2 h-2 rounded-full bg-white/25"></span> queued</div>
          </div>

          <div class="mt-2 grid grid-cols-3 gap-2">
            <div class="shimmer rounded-xl h-10"></div>
            <div class="shimmer rounded-xl h-10"></div>
            <div class="shimmer rounded-xl h-10"></div>
          </div>
        </div>
      </div>
    `;
    ul.appendChild(li);
  });

  container.appendChild(ul);
}

export function markRunning(container, idx){
  const li = container.querySelector(`[data-gen="${idx}"]`);
  if (!li) return;
  li.classList.remove("opacity-70");
  li.classList.add("opacity-100", "ring-1", "ring-indigo-500/40");

  const badge = li.querySelector(".badge");
  if (badge){
    badge.innerHTML = `<span class="pulse-dot"></span><span>running</span>`;
  }
}

export function markDone(container, idx, g){
  const li = container.querySelector(`[data-gen="${idx}"]`);
  if (!li) return;

  li.classList.remove("ring-1", "ring-indigo-500/40");
  li.classList.add("opacity-100");

  const badge = li.querySelector(".badge");
  if (badge){
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span>done</span>`;
  }

  // Replace shimmers with KPIs
  const grid = li.querySelector(".grid");
  if (grid){
    grid.innerHTML = `
      <div class="rounded-xl bg-white/5 border border-white/10 p-2">
        <div class="text-[11px] text-white/60">Best</div>
        <div class="text-sm font-semibold">${formatNumber(g.bestFitness, 3)}</div>
      </div>
      <div class="rounded-xl bg-white/5 border border-white/10 p-2">
        <div class="text-[11px] text-white/60">Mean</div>
        <div class="text-sm font-semibold">${formatNumber(g.meanFitness, 3)}</div>
      </div>
      <div class="rounded-xl bg-white/5 border border-white/10 p-2">
        <div class="text-[11px] text-white/60">Std</div>
        <div class="text-sm font-semibold">${formatNumber(g.stdFitness, 3)}</div>
      </div>
    `;
  }
}
