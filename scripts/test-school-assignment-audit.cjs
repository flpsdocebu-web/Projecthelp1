const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps){const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;const ctx={exports:{},require(name){if(!(name in deps))throw Error(name);return deps[name];}};vm.runInNewContext(code,ctx);return ctx.exports;}
const districts=load('lib/district.ts',{});
const coverage=load('lib/school-coverage.ts',{'./district':districts});
const audit=load('lib/school-assignment-audit.ts',{'./district':districts,'@/data/registration-schools.json':JSON.parse(fs.readFileSync(path.join(__dirname,'../data/registration-schools.json'),'utf8'))});
const offices=[
 {district:'Carmen',schoolName:'District Office',schoolId:'000000',accounts:2},
 {district:'Carmen',schoolName:'Carmen Office',schoolId:' 000000 ',accounts:3},
 {district:'Compostela',schoolName:'District Office',schoolId:'000000',accounts:4},
 {district:null,schoolName:'District Office',schoolId:'000000',accounts:1},
];
const counts=coverage.schoolCoverageSummary(offices);
assert.equal(counts.schools,0);assert.equal(counts.districtOffices,2);assert.equal(counts.districtOfficeAccounts,10);assert.equal(counts.unassignedDistrictOfficeAccounts,1);assert.equal(counts.reviewAccounts,0);
assert.ok(counts.districtCounts.every(row=>row.schools===0));
const grouped=coverage.groupRegisteredSchools(offices);assert.equal(grouped.find(group=>group.district==='Carmen').schools.length,1);assert.equal(grouped.find(group=>group.district==='Carmen').schools[0].accounts,5);assert.equal(grouped.find(group=>group.district==='Carmen').schools[0].needsReview,false);
const rows=[
 ...offices.map(row=>({...row,role:'school'})),
 {district:'Compostela',schoolName:'Compostela Central Elementary School',schoolId:'119226',accounts:5,role:'school'},
 {district:'Compostela',schoolName:'  compostela central elementary school  ',schoolId:'119226',accounts:2,role:'student'},
 {district:'Carmen',schoolName:'Compostela Central Elementary School',schoolId:'119226',accounts:1,role:'school'},
 {district:'Compostela',schoolName:'Compostela Central ES',schoolId:'119226',accounts:3,role:'school'},
 {district:'Compostela',schoolName:'New School',schoolId:'999999',accounts:2,role:'school'},
 {district:'Compostela',schoolName:'School without ID',schoolId:'',accounts:4,role:'student'},
 {district:'Minglanilla II',schoolName:'CAMP 7 ELEMENTARY SCHOOL',schoolId:'302969',accounts:1,role:'school'},
];
const result=audit.auditSchoolAssignments(rows);
assert.equal(result.summary.totalAccounts,28);assert.equal(result.summary.matchedAccounts,7);assert.equal(result.summary.reviewAccounts,11);assert.equal(result.summary.districtOfficeAccounts,10);assert.equal(result.summary.unassignedOfficeAccounts,1);
assert.equal(result.summary.matchedAccounts+result.summary.reviewAccounts+result.summary.districtOfficeAccounts,result.summary.totalAccounts);
assert.ok(result.issues.some(issue=>issue.reason.includes('District differs')));assert.ok(result.issues.some(issue=>issue.reason.includes('School name differs')));assert.ok(result.issues.some(issue=>issue.reason.includes('shared by multiple')));
assert.ok(result.issues.some(issue=>issue.reason.includes('not found')));assert.ok(result.issues.some(issue=>issue.reason.includes('School ID missing')));assert.ok(result.issues.some(issue=>issue.reason.includes('no assigned district')));
assert.ok(result.issues.every(issue=>!('email' in issue)&&!('username' in issue)));
console.log('Assignment audit checks passed: separate per-district office counts, preserved accounts, school/student reference matching, source conflicts, unlisted IDs, missing IDs, and reconciled totals.');
