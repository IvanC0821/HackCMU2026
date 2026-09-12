import katex from './vendor/katex.mjs';

const reasonEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

function typesetReasonMath(source, display = false) {
  if (source.length > 2000) return reasonEscape(source);
  try {
    // MathML needs no CDN/fonts and is also readable by assistive technology.
    return `<span class="reason-math${display ? ' reason-math-block' : ''}">${katex.renderToString(source, {
      output: 'mathml', displayMode: display, throwOnError: true,
      trust: false, strict: 'error', maxSize: 8, maxExpand: 200, macros: {},
    })}</span>`;
  } catch {
    // Malformed/unsupported math must never hide the actual evidence or crash review.
    return `<span class="reason-math-fallback">${reasonEscape(source)}</span>`;
  }
}

function legacyReasonMath(text) {
  // Only unambiguous runs: never guess that ordinary words are math or repair a value.
  const atom = String.raw`(?:(?:\d+(?:\.\d+)?)?[Rxyz]\d+|\d+(?:\.\d+)?(?:°)?|[A-Za-zα-ωΑ-Ω](?:_\{?[\dA-Za-z]+\}?)?)`;
  const operand = String.raw`(?:[−-]?${atom}|\([−-]?${atom}\))`;
  const run = new RegExp(String.raw`(?<![\w\\])(?:cos\s+|sin\s+|tan\s+)?${operand}(?:\s*[=≈≠≤≥<>·×+−*/→←-]\s*${operand})+(?![\w])`, 'gu');
  const tex = source => source.replace(/([Rxyz])(\d+)/g, '$1_{$2}')
    .replace(/\b(cos|sin|tan)\s+/g, '\\$1 ')
    .replace(/°/g, '^{\\circ}').replace(/→/g, '\\to ').replace(/←/g, '\\leftarrow ')
    .replace(/·/g, '\\cdot ').replace(/×/g, '\\times ')
    .replace(/θ/g, '\\theta ').replace(/π/g, '\\pi ')
    .replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');
  // A standalone numeric calculation can contain adjacent factors such as (2)(-4).
  if (/^[\d\s().+−*/=\-]+$/.test(text) && text.includes('=')) return typesetReasonMath(tex(text));
  let html = '', end = 0;
  for (const match of text.matchAll(run)) {
    html += reasonEscape(text.slice(end, match.index)) + typesetReasonMath(tex(match[0]));
    end = match.index + match[0].length;
  }
  return html + reasonEscape(text.slice(end));
}

export function renderReasonText(value) {
  const text = String(value ?? '');
  const math = /\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\$(?!\s)[^$\n]+\$/g;
  let html = '', end = 0;
  for (const match of text.matchAll(math)) {
    const raw = match[0], dollar = raw.startsWith('$') && !raw.startsWith('$$');
    html += legacyReasonMath(text.slice(end, match.index));
    html += typesetReasonMath(raw.slice(dollar ? 1 : 2, dollar ? -1 : -2), raw.startsWith('\\[') || raw.startsWith('$$'));
    end = match.index + raw.length;
  }
  return (html + legacyReasonMath(text.slice(end))).replace(/\n/g, '<br>');
}

export function explainAssessment(value) {
  const original = String(value ?? '').trim();
  if (!original) return {original, reason: 'No explanation provided. Check the work before approving.', check: '', rule: ''};
  const fields = [...original.matchAll(/^(Reason|Check|Rule):[ \t]*([\s\S]*?)(?=^(?:Reason|Check|Rule):|(?![\s\S]))/gm)];
  if (fields.length && fields[0].index === 0 && fields.filter(m => m[1] === 'Reason').length === 1) {
    const grouped = Object.fromEntries(['Reason', 'Check', 'Rule'].map(key => [key.toLowerCase(), fields.filter(m => m[1] === key).map(m => m[2].trim()).join('\n')]));
    return {original, ...grouped};
  }
  // Old saved assessments remain intact. Only remove the leading score/code from
  // the short preview; the complete original remains under the disclosure below.
  const clean = original.replace(/^[−-]\d+(?:\.\d+)?\s+(?:(?:[A-Z]\d+)(?:\s*[,/]\s*[A-Z]\d+)*\s+)?/, '');
  // A colon often introduces the long arithmetic, while the clause before it is
  // already the diagnosis. Never split inside explicitly delimited mathematics.
  const masked = clean.replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$[^$]+\$/g, m => ' '.repeat(m.length));
  const split = masked.search(/:\s|[.!?]\s+(?=[A-Z])/);
  const reason = split > 0 ? clean.slice(0, split).replace(/[.!?]$/, '') + '.' : clean;
  const once = /\bcarried(?: through)? consistently\b/i.test(clean)
    && /\b(?:is|was) (?:only )?deducted once\b/i.test(clean);
  return {original, reason, check: '', rule: once ? 'This error is deducted once; its later consequences are not deducted again.' : ''};
}

export function renderAssessmentExplanation(result, criterion) {
  const note = explainAssessment(result.evidence);
  const assessed = criterion.bands.find(b => b.id === (result.proposed || result.band));
  const deduction = assessed ? Math.round((criterion.max - assessed.points) * 100) / 100 : null;
  const label = deduction === null ? 'Needs review' : deduction === 0 ? 'Full credit' : `−${deduction} ${deduction === 1 ? 'point' : 'points'}`;
  return `<div class="proposal-reason"><p class="deduction-label">${reasonEscape(label)}${result.proposed && result.band !== result.proposed ? ' · original assessment' : ''}</p><p class="deduction-summary">${renderReasonText(note.reason)}</p>${note.check ? `<div class="deduction-check"><span>Check</span><div>${renderReasonText(note.check)}</div></div>` : ''}${note.rule ? `<p class="deduction-rule">${renderReasonText(note.rule)}</p>` : ''}${note.original ? `<details class="reason-details"><summary>Original explanation</summary><div>${renderReasonText(note.original)}</div></details>` : ''}</div>`;
}
