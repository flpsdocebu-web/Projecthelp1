const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const context = { exports: {}, require(name) { if (!(name in dependencies)) throw Error(`Unexpected dependency: ${name}`); return dependencies[name]; } };
  vm.runInNewContext(source, context); return context.exports;
}
const district = load("lib/district.ts");
const coverage = load("lib/school-coverage.ts", { "./district": district });
const audit = load('lib/school-assignment-audit.ts', { '@/data/registration-schools.json': JSON.parse(fs.readFileSync(path.join(__dirname,'../data/registration-schools.json'),'utf8')), './district': district });
const rows = [
  { district: "Argao I", schoolName: "Central School", schoolId: "119100", accounts: "2" },
  { district: "District of Argao 1", schoolName: " CENTRAL ES ", schoolId: "119100", accounts: "3" },
  { district: "Argao I", schoolName: "Central School", schoolId: "119101", accounts: 1 },
  { district: "Argao II", schoolName: "Central School", schoolId: "119100", accounts: 4 },
  { district: null, schoolName: "Unassigned School", schoolId: null, accounts: 1 },
  { district: "Carmen", schoolName: " ", schoolId: "119300", accounts: 1 },
  { district: "Carmen", schoolName: "Invalid ID School", schoolId: "6100447", accounts: 2 },
  { district: "Carmen", schoolName: "Zero ID School", schoolId: "000000", accounts: 1 },
];
const grouped = coverage.groupRegisteredSchools(rows);
assert.equal(grouped.length, 4);
const argao = grouped.find((item) => item.district === "Argao I");
assert.equal(argao.schools.length, 2);
const shared = argao.schools.find((school) => school.key === 'id:119100');
assert.equal(shared.accounts, 5);
assert.equal(shared.names.length, 2);
assert.equal(shared.needsReview, true); // Same ID in two districts.
assert.equal(argao.schools.find((school) => school.key === 'id:119101').needsReview, true); // Same name, different IDs.
assert.equal(grouped.find((item) => item.district === "Argao II").schools[0].schoolIds[0], "119100");
assert.equal(grouped.find((item) => item.key === "UNASSIGNED").schools[0].schoolName, "Unassigned School");
assert.equal(coverage.groupRegisteredSchools([]).length, 0);
const summary = coverage.schoolCoverageSummary(rows);
assert.equal(summary.schools, 5); // Office 000000 is counted separately.
assert.equal(summary.reviewAccounts, 3);
assert.equal(summary.districtOffices, 1);
assert.equal(summary.districtOfficeAccounts, 1);
assert.equal(summary.districtCounts.find((row) => row.district === 'Argao I').schools, 2);
assert.equal(summary.districtCounts.find((row) => row.district === 'Carmen').schools, 2);
assert.equal(summary.districtCounts.reduce((sum, row) => sum + row.accounts, 0), 14);
assert.equal(coverage.countedSchoolId(' 119100 '), '119100');
for (const absent of ['', null, '   ']) assert.equal(coverage.countedSchoolId(absent), null);
for (const entered of ['000000', '0009', '6100447', '119A00']) assert.equal(coverage.countedSchoolId(entered), entered);
const fallbackRows = [
  { district: 'Carmen', schoolName: 'Sample School', schoolId: null, accounts: 2 },
  { district: 'Carmen', schoolName: ' SAMPLE   SCHOOL ', schoolId: '', accounts: 3 },
  { district: 'Catmon', schoolName: 'Sample School', schoolId: null, accounts: 1 },
  { district: 'Carmen', schoolName: 'Sample School', schoolId: '0009', accounts: 1 },
  { district: 'Carmen', schoolName: 'Other Name', schoolId: '0009', accounts: 1 },
  { district: 'Carmen', schoolName: 'Sample School', schoolId: '0010', accounts: 1 },
  { district: 'Carmen', schoolName: '', schoolId: '', accounts: 1 },
];
assert.equal(coverage.schoolCoverageSummary(fallbackRows).schools, 4);
assert.equal(coverage.schoolCoverageSummary(fallbackRows).reviewAccounts, 10);
assert.equal(coverage.schoolCoverageSummary(fallbackRows).districtCounts.find((row) => row.district === 'Carmen').schools, 3);
const fallbackGroup = coverage.groupRegisteredSchools(fallbackRows).find((group) => group.district === 'Carmen');
assert.equal(fallbackGroup.schools.find((school) => school.key.startsWith('name:')).accounts, 5);
assert.equal(fallbackGroup.schools.find((school) => school.key === 'id:0009').accounts, 2);
assert.equal(coverage.groupRegisteredSchools(rows).reduce((sum, group) => sum + group.schools.reduce((n, school) => n + school.accounts, 0), 0), 15);
(async () => {
  let administrator = false, queried = false;
  const route = load("app/api/schools/by-district/route.ts", {
    "next/server": { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers }) } },
    "@/lib/auth": { requireAdministrator: async () => administrator },
    "@/lib/db": { db: { query: async () => { queried = true; return [rows.map(row=>({...row,role:'school'}))]; } } },
    "@/lib/school-coverage": coverage,
    "@/lib/school-assignment-audit": audit,
  });
  assert.equal((await route.GET()).status, 403);
  assert.equal(queried, false);
  administrator = true;
  const response = await route.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers["Cache-Control"], "private, no-store");
  assert.equal(response.body.districts.length, 4);
  const statsRoute = load('app/api/stats/route.ts', {
    'next/server': { NextResponse: { json: (body) => ({body}) } },
    '@/lib/school-coverage': coverage,
    '@/lib/db': { db: { query: async (sql) => {
      assert.ok(!/\b(UPDATE|DELETE|INSERT|ALTER|DROP)\b/i.test(sql));
      if (sql.includes('SUM(role=')) return [[{students: 5, teachers: 15, schools: 999}]];
      if (sql.includes('school_id AS schoolId')) return [rows];
      return [[]];
    } } },
  });
  const stats = (await statsRoute.GET()).body;
  assert.equal(stats.schools, 5);
  assert.equal(stats.schoolIdReviewAccounts, 3);
  assert.equal(stats.districtOffices, 1);
  assert.equal(stats.districtOfficeAccounts, 1);
  assert.equal(stats.teachers, 15);
  assert.equal(stats.totalUsers, 20);
  assert.ok(!JSON.stringify(stats).includes('Central School')); // No private roster on public stats.
  console.log("School coverage checks passed: ID deduplication, preserved accounts, name variations, conflicting assignments, invalid IDs, read-only stats, and administrator-only roster access.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
