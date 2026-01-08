function mean(arr){
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a,b)=>a+b,0) / arr.length;
}

function stddev(arr){
  if (!arr || arr.length === 0) return 0;
  const m = mean(arr);
  const v = arr.reduce((acc,x)=>acc + (x-m)*(x-m), 0) / arr.length;
  return Math.sqrt(v);
}

export function getAverageFitness(population){
  const fits = (population || []).map(ind => Number(ind.fitness ?? 0));
  return mean(fits);
}

export function getStdDevFitness(population){
  const fits = (population || []).map(ind => Number(ind.fitness ?? 0));
  return stddev(fits);
}

export function getBestIndividual(population){
  if (!population || population.length === 0) return null;
  return population.reduce((best, cur) => (Number(cur.fitness ?? -Infinity) > Number(best.fitness ?? -Infinity) ? cur : best), population[0]);
}

export function buildGenerations(runJson){
  const prev = Array.isArray(runJson.prev_populations) ? runJson.prev_populations : [];
  const current = Array.isArray(runJson.current_population) ? runJson.current_population : [];
  const combined = [...prev, [current, runJson.best_fitness ?? null]];

  // Generation objects
  const gens = combined.map((entry, idx) => {
    const pop = entry?.[0] ?? [];
    const bestFitness = entry?.[1] ?? null;

    const bestIndiv = getBestIndividual(pop);
    const meanFitness = getAverageFitness(pop);
    const stdFitness = getStdDevFitness(pop);

    return {
      gen: idx,                 // 0..N
      population: pop,
      bestFitness,
      meanFitness,
      stdFitness,
      bestIndiv
    };
  });

  return gens;
}

export function normalizeCutText(cut){
  if (!cut) return "";
  // Avoid huge whitespace spikes in the UI
  return String(cut).replace(/\r\n/g, "\n").trim();
}

export function extractCut(indiv){
  const c = indiv?.chromosome?.added_cut ?? "";
  return normalizeCutText(c);
}

export function extractFullCode(indiv){
  return String(indiv?.chromosome?.full_code ?? "").trim();
}

export function extractIdea(indiv){
  return String(indiv?.chromosome?.idea ?? "").trim();
}
