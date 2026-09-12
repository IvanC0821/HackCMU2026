// Coordinates are fractions of the displayed page, independent of zoom or pixels.
export function cropRect(start, end) {
  const clamp = n => Math.max(0, Math.min(1, n));
  const [ax, ay] = start.map(clamp), [bx, by] = end.map(clamp);
  return [Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)].map(n => Math.round(n * 100000) / 100000);
}
export function validCropRect(rect) {
  return Array.isArray(rect) && rect.length === 4 && rect.every(Number.isFinite)
    && rect[0] >= 0 && rect[1] >= 0 && rect[2] >= .002 && rect[3] >= .002
    && rect[0] + rect[2] <= 1.00001 && rect[1] + rect[3] <= 1.00001;
}
export function solutionCropErrors(question, document) {
  const crops = question.solutionCrops ?? [];
  if (!Array.isArray(crops) || crops.length > 12) return ['Use up to 12 answer crops per question.'];
  const errors = [], ids = new Set();
  for (const crop of crops) {
    if (!crop.id || ids.has(crop.id) || !validCropRect(crop.rect)) errors.push('An answer crop has invalid bounds. Select it again.');
    ids.add(crop.id);
    if (crop.documentId !== document?.id) errors.push('Review answer crops for the replacement solution PDF before finalizing.');
    if (!Number.isInteger(crop.page) || crop.page < 1 || (document?.pageCount && crop.page > document.pageCount)) errors.push('An answer crop refers to a missing solution page.');
  }
  return [...new Set(errors)];
}
export function putSolutionCrop(question, document, {id, page, rect, label = ''}) {
  if (!document?.id) throw Error('Attach a solution PDF first.');
  const crop = {id: id || crypto.randomUUID(), documentId: document.id, page, rect: [...rect], label: String(label).trim().slice(0, 100) || 'Answer excerpt'};
  const errors = solutionCropErrors({solutionCrops: [crop]}, document);
  if (errors.length) throw Error(errors.join(' '));
  const crops = question.solutionCrops ?? [];
  if (!id && crops.length >= 12) throw Error('Use up to 12 answer crops per question.');
  if (id && !crops.some(c => c.id === id)) throw Error('This crop changed. Select it again.');
  question.solutionCrops = id ? crops.map(c => c.id === id ? crop : c) : [...crops, crop];
  question.solutionPages = [...new Set([...(question.solutionPages || []), page])].sort((a, b) => a - b);
  return crop;
}
export function gradingSignature(questions) {
  return JSON.stringify(questions.map(({solutionCrops, ...question}) => question));
}
