import test from 'node:test';
import assert from 'node:assert/strict';
import {mapDraft} from '../api.mjs';
import {generateConnectedDraft} from '../../connected/rubrics.mjs';
import {newWorkspace, loadSampleRubric, publishDraft} from '../model.mjs';
import {renderWorkspace} from '../view.mjs';

function fixture() {
  const s = newWorkspace(); loadSampleRubric(s); publishDraft(s);
  const spec = {criteria: s.draft.flatMap(q => q.criteria.map(c => ({id: c.id, question_id: q.id,
    requirement: 'Inspect the requested notation and required work. Accept mathematically equivalent presentation unless the assignment requires a particular form.',
    max_points: c.max, bands: c.bands.map(b => ({id: b.id, description: b.label, points: b.points})),
    concept_ids: ['notation'], source_refs: [{document_id: s.documents.blank.id, page_index: 0}]}))),
    patterns: [{id: 'missing-graph', criterion_ids: ['row-work'], concept_id: 'notation', category: 'incomplete',
      definition: 'A graph explicitly required by the assignment is absent.',
      exclusions: 'Do not require a graph just because one appears in the answer key.', hints: []}],
    standards: ['Deduct once for a small arithmetic slip, not repeatedly for correct follow-through.']};
  return {s, spec};
}

test('imports readable criteria with source pages, concepts, exceptions and exact points', () => {
  const {s, spec} = fixture(), old = structuredClone(s);
  const mapped = mapDraft(spec, s.draft, [s.documents.blank]);
  assert.equal(mapped[0].criteria[0].sourceRefs[0].name, 'questions.pdf');
  assert.equal(mapped[0].criteria[0].sourceRefs[0].page_index, 0);
  assert.match(mapped[0].criteria[0].patterns[0].exclusions, /Do not require a graph/);
  assert.equal(mapped[0].criteria[0].max, 7);
  assert.deepEqual(s, old);
});

test('connected drafting uses saved references and returns an unpublished candidate without grades changing', async () => {
  const {s, spec} = fixture(), before = structuredClone(s), calls = [];
  const transport = {
    async post(path, body) {calls.push({path, body}); return {id:'job',status:'running',revision:s.revision,coverage:{documents:3,pages:6}};},
    async json(path) {calls.push({path}); return {id:'job',status:'succeeded',revision:s.revision,coverage:{documents:3,pages:6},spec};},
  };
  const result = await generateConnectedDraft(s, () => {}, undefined, transport, async () => {});
  assert.equal(result.rubricId, 'job'); assert.equal(result.questions.length, 2);
  assert.equal(calls[0].body.expectedRevision, s.revision);
  assert.equal(calls[0].body.consent, true);
  assert.deepEqual(s, before);
  assert.equal(calls.length, 2);
});

test('failed or stale requests never produce a usable draft', async () => {
  const {s, spec} = fixture();
  for (const job of [{status:'failed',error:'Unreadable reference'}, {status:'succeeded',revision:0,spec}]) {
    await assert.rejects(generateConnectedDraft(s, () => {}, undefined, {post:async()=>({id:'job',...job})}, async()=>{}));
  }
});

test('TA setup wraps long explanations and keeps consent, sources and checks accessible', () => {
  const {s,spec}=fixture(); s.draft=mapDraft(spec,s.draft,[s.documents.blank]);
  const html=renderWorkspace(s,{route:'standards',connected:true,editQ:0,docURLs:{}});
  assert.match(html, /Requirement<\/span><textarea rows="1"/);
  assert.match(html, /textarea rows="1" aria-label="Criterion 1, outcome 1"/);
  assert.match(html, /Error checks and exceptions/);
  assert.match(html, /questions.pdf, page 1/);
  assert.match(html, /paid API credits/);
  assert.doesNotMatch(html, /id="api-token"|id="api-origin"/);
  assert(html.indexOf('Generate a rubric from your PDFs') > html.indexOf('id="studio-panel-references"')); // Optional drafting stays in Files & settings.
  s.draft[0].criteria[0].patterns[0].definition='<img src=x onerror=alert(1)>';
  assert.doesNotMatch(renderWorkspace(s,{route:'standards',connected:true,editQ:0,docURLs:{}}),/<img src=x/);
});
