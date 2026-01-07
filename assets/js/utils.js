export const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export function clamp(v, lo, hi){
  return Math.max(lo, Math.min(hi, v));
}

export function formatNumber(v, digits=3){
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  // Use compact format for large numbers
  if (Math.abs(n) >= 1e6) return n.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  // Keep small numbers readable
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function qs(sel, root=document){ return root.querySelector(sel); }
export function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }

export function getQueryParams(){
  const url = new URL(window.location.href);
  const params = {};
  url.searchParams.forEach((v,k)=>{ params[k]=v; });
  return params;
}

export function saveConfig(cfg){
  localStorage.setItem("alphaevolve_demo_config", JSON.stringify(cfg));
}

export function loadConfig(){
  try{
    const s = localStorage.getItem("alphaevolve_demo_config");
    return s ? JSON.parse(s) : null;
  }catch(e){
    return null;
  }
}

export function uid(prefix="run"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function percent(v){
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${(Number(v)*100).toFixed(1)}%`;
}

export function escapeHtml(str){
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
