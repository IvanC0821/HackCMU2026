import {activeRubric, scoreQuestion, total} from './model.mjs';

export function finalFor(student, version) {
  return student.attempts.filter(a => a.version === version && a.final).at(-1) || null;
}
export function gradingQueue(state, qid, search = '') {
  const rubric = activeRubric(state), question = rubric?.questions.find(q => q.id === qid);
  if (!question) return [];
  return state.submissions.flatMap(student => {
    const attempt = finalFor(student, rubric.id), review = attempt?.questions[qid];
    if (!attempt || !student.name.toLowerCase().includes(search.toLowerCase())) return [];
    return [{student, attempt, review, checked: !!review?.skimmed,
      score: scoreQuestion(question, review), max: total(question),
      needsDecision: question.criteria.some(c => !review?.results[c.id]?.band),
      unclear: Object.values(review?.results || {}).some(r => r.unclear),
      disputed: Object.values(review?.results || {}).some(r => r.dispute?.status === 'open')}];
  });
}
export function submissionQueue(state, search = '') {
  const rubric = activeRubric(state); if (!rubric) return [];
  return state.submissions.flatMap(student => {
    const attempt = finalFor(student, rubric.id);
    if (!attempt || !student.name.toLowerCase().includes(search.toLowerCase())) return [];
    const checked = rubric.questions.filter(q => attempt.questions[q.id]?.skimmed).length;
    return [{student, attempt, checked, complete: !!attempt.reviewedAt, count: rubric.questions.length}];
  });
}
export function teachingSignals(state) {
  const rubric = activeRubric(state); if (!rubric) return [];
  return rubric.questions.map(question => {
    const patterns = question.criteria.map(c => ({id: c.id, label: c.label, category: c.category,
      initial: 0, current: 0, absentLater: 0, overturned: 0, assessed: 0, examples: []}));
    for (const student of state.submissions) {
      const attempts = student.attempts.filter(a => a.version === rubric.id);
      const latest = attempts.at(-1);
      for (const [i, criterion] of question.criteria.entries()) {
        const points = (r, original = false) => criterion.bands.find(b => b.id === (original ? r?.proposed ?? r?.band : r?.band))?.points;
        const first = attempts.find(a => points(a.questions[question.id]?.results[criterion.id], true) !== undefined);
        const a = first?.questions[question.id]?.results[criterion.id];
        const b = latest?.questions[question.id]?.results[criterion.id];
        const before = points(a, true), after = points(b), p = patterns[i];
        if (before !== undefined) p.assessed++;
        if (before < criterion.max) {
          p.initial++;
          p.examples.push({name: student.name, attempt: first, questionId: question.id});
          if (latest.id !== first.id && after === criterion.max && b?.dispute?.status !== 'overturned') p.absentLater++;
        }
        if (after < criterion.max) p.current++;
        if (b?.dispute?.status === 'overturned' || (b?.confirmed && points(b, true) < criterion.max && after === criterion.max)) p.overturned++;
      }
    }
    return {...question, patterns};
  });
}
export const gradeLink = (qid, sid = '') => `#/homework/1/grade/${encodeURIComponent(qid)}${sid ? `/${encodeURIComponent(sid)}` : ''}`;

export function reviewedComments(state, qid, cid) {
  const version = activeRubric(state)?.id;
  return [...new Set(state.submissions.flatMap(s => s.attempts.filter(a => a.version === version).flatMap(a => {
    const r = a.questions[qid]?.results[cid];
    return r?.confirmed && r.reason?.trim() ? [r.reason.trim()] : [];
  })))].slice(-5);
}
export function helpRequests(state) {
  const version = activeRubric(state)?.id;
  return state.submissions.flatMap(student => student.attempts.filter(a => a.version === version).flatMap(attempt =>
    (attempt.helpRequests || []).filter(h => h.status === 'open').map(h => ({...h, student, attempt}))));
}
export function reviewTotal(rubric, attempt, drafts = {}, showAI = false, currentQuestion = '') {
  let earned = 0, decided = 0, count = 0, max = 0;
  for (const q of rubric.questions) for (const c of q.criteria) {
    const review = attempt.questions[q.id], draft = drafts[`${attempt.id}:${q.id}`];
    const selected = draft?.[c.id]?.band ?? (review?.skimmed || (showAI && q.id === currentQuestion) ? review?.results[c.id]?.band : null);
    const band = c.bands.find(b => b.id === selected);
    max += Math.round(c.max * 100); count++;
    if (band) { earned += Math.round(band.points * 100); decided++; }
  }
  return {earned: earned / 100, max: max / 100, decided, count};
}
export function reviewTotalLabel(value) {
  return value.decided === value.count ? `Total: ${value.earned} / ${value.max}`
    : `${value.earned} points so far · ${value.decided} / ${value.count} items scored`;
}
