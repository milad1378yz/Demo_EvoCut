import { escapeHtml } from "../utils.js";

/**
 * Insert cut text into a template code string.
 * If marker is present, insert there; otherwise append at end.
 */
export function injectCut(templateCode, cutText){
  const marker = "# <EVOCUT_INSERT_CUT_HERE>";
  const cutBlock = cutText?.trim()
    ? `# >>> EvoCut: inserted cut\n${cutText.trim()}\n# <<< EvoCut\n`
    : `# >>> EvoCut: no cut for this generation\n# <<< EvoCut\n`;

  if (templateCode.includes(marker)){
    return templateCode.replace(marker, cutBlock + marker);
  }
  return templateCode.trimEnd() + "\n\n" + cutBlock;
}

/**
 * Render a readable line diff (added/removed/unchanged) as HTML.
 * Uses jsdiff (window.Diff) loaded from CDN.
 */
export function renderLineDiff(oldStr, newStr){
  const Diff = window.Diff;
  if (!Diff){
    return `<pre class="text-xs leading-5 p-4 overflow-auto mini-scroll">${escapeHtml(newStr)}</pre>`;
  }

  const parts = Diff.diffLines(oldStr, newStr);
  let html = `<pre class="text-xs leading-5 p-4 overflow-auto mini-scroll">`;

  for (const p of parts){
    const cls = p.added ? "bg-emerald-500/15 text-emerald-100"
              : p.removed ? "bg-rose-500/15 text-rose-100 line-through decoration-rose-400/60"
              : "text-white/80";
    const safe = escapeHtml(p.value);
    // Wrap each part in a span so background applies to full lines
    html += `<span class="${cls}">${safe}</span>`;
  }
  html += `</pre>`;
  return html;
}
