import test from 'node:test';
import assert from 'node:assert/strict';
import {studentHint, located, locationLabel, findingNumber, layoutMarkers, layoutCallouts, markerMarkup, calloutMarkup, detailMarkup, questionHintMarkup} from '../annotations.mjs';
const finding={id:'q3:3a',pageIndex:2,x:.6,y:.3,kind:'line',category:'Notation error',message:'Check notation here.',boxes:[{x:.2,y:.28,width:.35,height:.04}]};
test('circles preserve the actual saved error point at every zoom and page',()=>{
 const [a]=layoutMarkers([finding],2,600,800),[b]=layoutMarkers([finding],2,900,1200);
 assert.equal(a.x,360);assert.equal(a.y,240);assert.equal(b.x,a.x*1.5);assert.equal(b.y,a.y*1.5);
 assert.equal(a.targetX,a.x);assert.equal(a.targetY,a.y);
 assert.deepEqual(layoutMarkers([finding],1,600,800),[]);
 assert.equal(located({...finding,x:NaN}),false);assert.equal(located({...finding,y:-.1}),false);
});
test('overlapping errors retain exact anchors while hint boxes remain separate',()=>{
 const pins=layoutMarkers([finding,{...finding,id:'second'},{...finding,id:'third'}],2,600,800);
 assert(pins.every(p=>p.x===360&&p.y===240));
 const layout=layoutCallouts(pins,600,800,{'q3:3a':96,second:220,third:120});
 for(let i=1;i<layout.cards.length;i++)assert(layout.cards[i].top>=layout.cards[i-1].top+layout.cards[i-1].height+12);
 assert(layout.cards.every(c=>c.left>600));
 const html=calloutMarkup(layout,null);
 assert.equal((html.match(/class="pdf-hint-box/g)||[]).length,3);
 assert.equal((html.match(/<polyline/g)||[]).length,3);
 assert.match(html,/points="360,240 /);
});
test('hint numbers match sidebar identity across page filtering and sorting',()=>{
 const second={...finding,id:'second',y:.1},third={...finding,id:'third',pageIndex:3};
 const findings=[finding,second,third],pins=layoutMarkers(findings,2,600,800);
 assert.deepEqual(pins.map(p=>p.number),[2,1]);assert.equal(findingNumber(findings,'second'),2);
 assert.match(markerMarkup(pins,'second'),/Hint 2: Marked line/);
 assert.match(calloutMarkup(layoutCallouts(pins,600,800),null),/id="pdf-hint-2"/);
});
test('bottom-edge notes extend the annotation gutter without clipping or moving the error',()=>{
 const [p]=layoutMarkers([{...finding,x:.99,y:.99}],2,320,500);
 const layout=layoutCallouts([p],320,500,{'q3:3a':320});
 assert.equal(p.targetY,495);assert(layout.height>=layout.cards[0].top+320);
 assert.equal(layout.width,596);assert.equal(layout.cards[0].left,348);
});
test('work and uncertain part anchors keep their location qualifiers',()=>{
 assert.match(locationLabel(finding),/Marked line/);assert.match(locationLabel({...finding,kind:'work'}),/Related work/);
 assert.match(locationLabel({...finding,x:undefined}),/No precise location available/);
 for(const kind of ['work','part']){
  const f={...finding,kind};const html=calloutMarkup(layoutCallouts(layoutMarkers([f],2,600,800),600,800),null);
  assert.match(html,kind==='work'?/not an incorrect symbol/:/exact mistaken line has not been identified/);
 }
});
test('all hint text and identifiers are escaped',()=>{
 const f={...finding,id:'" onclick="bad()',category:'<script>bad()</script>',message:'<img onerror="bad()">'};
 const pins=layoutMarkers([f],2,600,800);const html=markerMarkup(pins,f.id)+calloutMarkup(layoutCallouts(pins,600,800),f.id);
 assert.doesNotMatch(html,/<script>|<img/);assert.doesNotMatch(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);
 assert.doesNotMatch(html,/data-marker="" onclick=/);
});
test('missing locations and malformed regions never produce invented highlights',()=>{
 assert.deepEqual(detailMarkup(null,null),{highlights:'',note:''});
 assert.deepEqual(layoutMarkers([{...finding,x:undefined}],2,600,800),[]);
 const [p]=layoutMarkers([finding],2,600,800);
 assert.equal(detailMarkup({...finding,boxes:[null,{x:.5,y:.5,width:2,height:.1}]},p).highlights,'');
 assert.match(detailMarkup(finding,p).highlights,/left:20%/);
});

test('student hints omit diagnosis labels and later sentences without altering grader data',()=>{
 const f={...finding,category:'Circular reasoning',message:'The next case is assumed rather than derived. Use the induction hypothesis to justify it.'};
 const pins=layoutMarkers([f],2,600,800);
 const html=markerMarkup(pins,null)+calloutMarkup(layoutCallouts(pins,600,800),null);
 assert.match(html,/The next case is assumed rather than derived\./);
 assert.doesNotMatch(html,/Circular reasoning|Use the induction hypothesis/);
 assert.equal(f.category,'Circular reasoning');
 assert.match(f.message,/Use the induction hypothesis/);
 assert.equal(studentHint('The value 2.5 may need another look. Replace it with 3.'),'The value 2.5 may need another look.');
 assert.equal(studentHint('Is this step supported? Write the missing proof.'),'Is this step supported?');
 assert.equal(studentHint('A single observation without punctuation'),'A single observation without punctuation');
 assert.equal(studentHint(null),'');
});

test('question hints work without inventing a paper location or exposing another question',()=>{
 const unlocated={id:'q6:d',questionId:'q6',message:'Check whether a matrix can equal its own negative. The answer is zero.'};
 const html=questionHintMarkup([unlocated,{...finding,questionId:'q3'}],'q6',6);
 assert.match(html,/Show hint for Question 6/);
 assert.match(html,/popovertarget="question-hint"/);
 assert.match(html,/Check whether a matrix can equal its own negative/);
 assert.doesNotMatch(html,/The answer is zero|Check notation here|paper-marker|left:/);
 assert.equal(questionHintMarkup([unlocated],'q1',1),'');
 assert.deepEqual(layoutMarkers([unlocated],0,600,800),[]);
 assert.match(questionHintMarkup([{...unlocated,message:'<script>Bad</script>'}],'q6',6),/&lt;script&gt;/);
});
