const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const context={exports:{},URL,console,require(name){if(!(name in dependencies))throw Error(`Unexpected dependency: ${name}`);return dependencies[name];}};
  vm.runInNewContext(code,context,{filename:file});return context.exports;
}
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/registration-schools.json'),'utf8'));
const district=load('lib/district.ts',{});
const registry=load('lib/registration-schools.ts',{'@/data/registration-schools.json':catalog,'./district':district});
assert.equal(catalog.source,'list of schools - Updated.xlsx');
assert.equal(catalog.schools.length,1146);
assert.equal(new Set(catalog.schools.map(row=>row.key)).size,1146);
const available=catalog.schools.filter(row=>district.officialDistrict(row.district||'')&&row.schoolName.trim()&&row.schoolId.trim());
assert.equal(available.length,1143);
assert.equal(catalog.schools.filter(row=>!row.district).length,2);
assert.equal(catalog.schools.filter(row=>!row.schoolName.trim()).length,1);
assert.equal(district.CEBU_DISTRICTS.length,58);
let options=0;
for(const name of district.CEBU_DISTRICTS){
  const schools=registry.registrationSchoolsForDistrict(name);
  assert.ok(schools.length>0,`Missing choices for ${name}`);
  options+=schools.length;
  for(const school of schools){assert.equal(school.district,name);assert.equal(registry.selectedRegistrationSchool(school.key,name).schoolId,school.schoolId);}
}
assert.equal(options,1143);
assert.equal(registry.registrationSchoolsForDistrict('Not a district').length,0);
assert.equal(registry.selectedRegistrationSchool('school-row-262','Bantayan II'),null); // Blank school name.
assert.equal(registry.selectedRegistrationSchool('school-row-372','Carmen'),null); // Missing source district.
assert.equal(registry.registrationSchoolsForDistrict('Minglanilla II').filter(s=>s.schoolId==='302969').length,2);
assert.equal(registry.registrationSchoolsForDistrict('San Remigio II').filter(s=>s.schoolId==='502824').length,2);
assert.ok(registry.registrationSchoolsForDistrict('Minglanilla 2').length>0);
const sample=registry.registrationSchoolsForDistrict('Compostela')[0];
assert.equal(registry.selectedRegistrationSchool(sample.key,'Carmen'),null);

(async()=>{
  const json=(body,options={})=>({body,status:options.status||200,headers:options.headers});
  const catalogRoute=load('app/api/school-catalog/route.ts',{'next/server':{NextResponse:{json}},'@/lib/district':district,'@/lib/registration-schools':registry});
  assert.equal((await catalogRoute.GET(new Request('https://example.test/api/school-catalog'))).status,400);
  const result=await catalogRoute.GET(new Request('https://example.test/api/school-catalog?district=Compostela'));
  assert.equal(result.status,200);assert.ok(result.body.schools.length>0);assert.equal(result.headers['Cache-Control'],'no-store');
  assert.ok(result.body.schools.every(s=>s.district==='Compostela'));
  const writes=[];let duplicate=false;
  const registration=load('app/api/auth/register/route.ts',{
    'next/server':{NextResponse:{json}},
    '@/lib/auth':{randomUUID:()=> 'new-user-id',bcrypt:{hash:async()=> 'hashed-password'}},
    '@/lib/db':{db:{execute:async(sql,values)=>{if(duplicate)throw {code:'ER_DUP_ENTRY'};writes.push({sql,values});}}},
    '@/lib/district':district,'@/lib/registration-schools':registry,
  });
  const input={role:'school',username:'sample.teacher',email:'TEACHER@example.test',password:'password-for-tests',name:'Sample Teacher',district:sample.district,schoolKey:sample.key,schoolName:sample.schoolName,schoolId:sample.schoolId};
  const request=(body)=>new Request('https://example.test/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  for(const patch of [{schoolKey:''},{schoolKey:'not-a-school'},{district:'Carmen'},{schoolName:'Typed school'},{schoolId:'999999'},{role:'administrator'}]){
    writes.length=0;assert.equal((await registration.POST(request({...input,...patch}))).status,400);assert.equal(writes.length,0);
  }
  for(const role of ['school','student']){
    writes.length=0;
    const saved=await registration.POST(request({...input,role,lrn:'123456789012'}));
    assert.equal(saved.status,201);assert.equal(writes.length,1);
    assert.equal(writes[0].values[6],sample.district);assert.equal(writes[0].values[7],sample.schoolName);assert.equal(writes[0].values[8],sample.schoolId);
    assert.equal(writes[0].values[9],role==='student'?'123456789012':null);
    assert.ok(writes[0].sql.startsWith('INSERT INTO users')); // Never mutate existing users or resources.
  }
  writes.length=0;assert.equal((await registration.POST(request({...input,role:'student',lrn:'123'}))).status,400);assert.equal(writes.length,0);
  // Clients cannot choose a name for the other row that happens to share an ID.
  const sameId=registry.registrationSchoolsForDistrict('Minglanilla II').filter(s=>s.schoolId==='302969');
  assert.notEqual(sameId[0].key,sameId[1].key);
  for(const school of sameId){
    writes.length=0;assert.equal((await registration.POST(request({...input,district:school.district,schoolKey:school.key,schoolName:school.schoolName,schoolId:school.schoolId}))).status,201);
    assert.equal(writes[0].values[7],school.schoolName);
  }
  duplicate=true;assert.equal((await registration.POST(request(input))).status,409);
  console.log('Registration checks passed: 1,146 source rows, 1,143 selectable schools in all 58 districts, duplicate-ID choices preserved, incomplete rows retained, canonical school details, school and student accounts, LRN validation, and rejected tampering.');
})().catch(error=>{console.error(error);process.exitCode=1;});
