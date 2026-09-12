import {PDFDocument, StandardFonts, rgb} from 'pdf-lib';
import {mkdir,writeFile} from 'node:fs/promises';
const doc=await PDFDocument.create();
const serif=await doc.embedFont(StandardFonts.TimesRoman);
const italic=await doc.embedFont(StandardFonts.TimesRomanItalic);
const sans=await doc.embedFont(StandardFonts.Helvetica);
const pages=[
 {title:'1. Direct proof',prompt:['Prove that the sum of two even integers is even.'],lines:[
 [636,'Let a and b be even integers.'],[596,'Then a = 2m and b = 2n for some integers m and n.'],[546,'So a + b = 2m + 2n'],[514,'                = 2(m + n).'],[464,'Because m + n is an integer, a + b is even.'],[422,'This completes the proof.']]},
 {title:'2. Mathematical induction',prompt:['Prove that 1 + 2 + ... + n = n(n + 1) / 2','for every positive integer n.'],lines:[
 [606,'Base case: n = 1.'],[574,'1 = 1(1 + 1) / 2 = 1.'],[516,'Suppose the formula holds for k.'],[480,'1 + 2 + ... + k = k(k + 1) / 2.'],[402,'For k + 1, assume that'],[370,'1 + 2 + ... + k + (k + 1) = (k + 1)(k + 2) / 2.'],[310,'Therefore the formula holds for every positive integer n.']]},
 {title:'3. Sets & notation',prompt:['Express the positive even integers in set-builder notation.','State the domain explicitly.'],lines:[
 [606,'The positive even integers are 2, 4, 6, 8, ...'],[536,'My set-builder notation:'],[500,'E = { 2k | k > 0 }'],[420,'This generates the even numbers greater than zero.']]}
];
for(const [i,p] of pages.entries()) {
 const page=doc.addPage([612,792]);
 page.drawText('DISCRETE MATHEMATICS  /  HOMEWORK 1',{x:58,y:744,size:10,font:sans,color:rgb(.29,.34,.36)});
 page.drawText(p.title,{x:58,y:705,size:21,font:serif});
 for(const [n,line] of p.prompt.entries()) page.drawText(line,{x:58,y:677-18*n,size:12,font:serif});
 for(const [y,text] of p.lines) page.drawText(text,{x:68,y,size:15,font:italic,color:rgb(.14,.22,.30)});
 page.drawLine({start:{x:58,y:72},end:{x:554,y:72},thickness:.5,color:rgb(.8,.83,.85)});
 page.drawText('Fictional sample submission. Feedback and scores are preset.',{x:58,y:52,size:9,font:sans,color:rgb(.4,.44,.46)});
 page.drawText(String(i+1),{x:546,y:52,size:10,font:sans});
}
doc.setTitle('Sample homework 1');
await mkdir(new URL('../assets/',import.meta.url),{recursive:true});
await writeFile(new URL('../assets/sample-homework.pdf',import.meta.url),await doc.save());
console.log('Created the three-page fictional sample PDF.');
