const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = { exports: {}, require(name) { if (!(name in dependencies)) throw Error(`Unexpected dependency: ${name}`); return dependencies[name]; } };
  vm.runInNewContext(source, context); return context.exports;
}
const district = load("lib/district.ts");
const coverage = load("lib/school-coverage.ts", { "./district": district });
const rows = [
  { district: "Argao I", schoolName: "Central School", schoolId: "100", accounts: "2" },
  { district: "District of Argao 1", schoolName: " CENTRAL SCHOOL ", schoolId: "100", accounts: "3" },
  { district: "Argao I", schoolName: "Central School", schoolId: "101", accounts: 1 },
  { district: "Argao II", schoolName: "Central School", schoolId: "200", accounts: 4 },
  { district: null, schoolName: "Unassigned School", schoolId: null, accounts: 1 },
  { district: "Carmen", schoolName: " ", schoolId: "300", accounts: 1 },
];
const grouped = coverage.groupRegisteredSchools(rows);
assert.equal(grouped.length, 3);
const argao = grouped.find((item) => item.district === "Argao I");
assert.equal(argao.schools.length, 1);
assert.equal(argao.schools[0].accounts, 6);
assert.equal(argao.schools[0].schoolIds.join(","), "100,101");
assert.equal(grouped.find((item) => item.district === "Argao II").schools[0].schoolIds[0], "200");
assert.equal(grouped.find((item) => item.key === "UNASSIGNED").schools[0].schoolName, "Unassigned School");
assert.equal(coverage.groupRegisteredSchools([]).length, 0);
(async () => {
  let administrator = false, queried = false;
  const route = load("app/api/schools/by-district/route.ts", {
    "next/server": { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers }) } },
    "@/lib/auth": { requireAdministrator: async () => administrator },
    "@/lib/db": { db: { query: async () => { queried = true; return [rows]; } } },
    "@/lib/school-coverage": coverage,
  });
  assert.equal((await route.GET()).status, 403);
  assert.equal(queried, false);
  administrator = true;
  const response = await route.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers["Cache-Control"], "private, no-store");
  assert.equal(response.body.districts.length, 3);
  console.log("School coverage checks passed: district aliases, school-name grouping, School IDs, unassigned districts, and administrator-only access.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
