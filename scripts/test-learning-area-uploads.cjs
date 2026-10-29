const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps){const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const context={exports:{},require(name){if(!(name in deps))throw Error(name);return deps[name];}};vm.runInNewContext(code,context);return context.exports;}
const helper=load('lib/learning-area-uploads.ts',{});
const rows=[
 {learningArea:'MATHEMATICS',term:'Term 1',uploads:'45'},
 {learningArea:'MATHEMATICS - SPS',term:'Term 2',uploads:13},
 {learningArea:'MATHEMATICS - REGULAR',term:'Term 3',uploads:18},
 {learningArea:'SPED',term:'Term 1',uploads:48},
 {learningArea:'SNED',term:'Full Year',uploads:2},
 {learningArea:'KINDERGARTEN',term:'Term 1',uploads:17},
 {learningArea:'Kindergarten - Literacy',term:'Term 2',uploads:4},
 {learningArea:'Kindergarten - Numeracy',term:'Term 2',uploads:27},
 {learningArea:'ENGLISH',term:' full year ',uploads:3},
 {learningArea:' english ',term:'3',uploads:2},
 {learningArea:'ENGLISH',term:'Unspecified',uploads:5},
 {learningArea:null,term:null,uploads:1},
];
const result=helper.summarizeLearningAreaUploads(rows);
assert.equal(result.areas.find(r=>r.learningArea==='MATHEMATICS - SPS').total,58);
assert.equal(result.areas.find(r=>r.learningArea==='MATHEMATICS - REGULAR').total,18);
assert.equal(result.areas.find(r=>r.learningArea==='SNED').total,50);
assert.equal(result.areas.find(r=>r.learningArea==='Kindergarten - Literacy').total,21);
assert.equal(result.areas.find(r=>r.learningArea==='Kindergarten - Numeracy').total,27);
assert.equal(result.areas.find(r=>r.learningArea==='ENGLISH').other,5);
assert.equal(result.totals.total,185);
assert.equal(result.totals.other,6);
assert.equal(result.totals.term1+result.totals.term2+result.totals.term3+result.totals.fullYear+result.totals.other,result.totals.total);
assert.equal(result.areas.reduce((sum,row)=>sum+row.total,0),185);
assert.equal(helper.summarizeLearningAreaUploads([]).totals.total,0);
assert.throws(()=>helper.summarizeLearningAreaUploads([{learningArea:'English',term:'Term 1',uploads:'bad'}]),/Invalid upload count/);
(async()=>{
 let fail=false;const queries=[];
 const route=load('app/api/resources/uploads-by-area/route.ts',{
  'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200,headers:options.headers})}},
  '@/lib/db':{db:{query:async(sql)=>{queries.push(sql);if(fail)throw Error('database unavailable');return [rows];}}},
  '@/lib/learning-area-uploads':helper,
 });
 const response=await route.GET();assert.equal(response.status,200);assert.equal(response.headers['Cache-Control'],'no-store');assert.equal(response.body.totals.total,185);
 assert.ok(queries[0].includes('GROUP BY learning_area,term'));assert.ok(!/\b(INSERT|UPDATE|DELETE|DROP)\b/i.test(queries[0]));
 fail=true;const failed=await route.GET();assert.equal(failed.status,503);assert.equal(failed.body.areas,undefined);assert.ok(!JSON.stringify(failed).includes('database unavailable'));
 console.log('Learning-area upload checks passed: current labels, all four periods, unknown terms preserved, exact total reconciliation, read-only grouped query, empty data, and honest error responses.');
})().catch(error=>{console.error(error);process.exitCode=1;});
