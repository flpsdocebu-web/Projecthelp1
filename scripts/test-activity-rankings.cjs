const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(source, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", source), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = { exports: {}, URL, require: (name) => { if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`); return dependencies[name]; } };
  vm.runInNewContext(code, context, { filename: source });
  return context.exports;
}
const district = load("lib/district.ts");
const { buildActivityRankings } = load("lib/activity-rankings.ts", { "./district": district });
const profiles = [
  { district: "Argao I", schoolName: "Central School", schoolId: "100" },
  { district: "Argao I", schoolName: "Central School" },
  { district: "Argao II", schoolName: "Central School", schoolId: "200" },
  { district: "Carmen", schoolName: "Carmen School", schoolId: "300" },
];
const result = buildActivityRankings([
  { district: "District of Argao 1", schoolName: " central   school ", downloads: "10", prints: "2" },
  { district: "Argao I", schoolName: "CENTRAL SCHOOL", schoolId: "100", downloads: 4, prints: 3 },
  { district: "Argao II", schoolName: "Central School", downloads: 2, prints: 20 },
  { schoolId: "300", downloads: 7, prints: 1 },
  { schoolName: "Central School", downloads: 3, prints: 0 },
  { downloads: 1, prints: 2 },
  { district: "Carmen", schoolName: "Zero school", downloads: 0, prints: 0 },
], profiles);
assert.equal(result.schools.find((row) => row.schoolId === "100").downloads, 14, "School ID and name aliases must merge without double counting");
assert.equal(result.schools.find((row) => row.schoolId === "100").prints, 5);
assert.equal(result.schools.find((row) => row.schoolId === "200").total, 22, "Same school name in another district must remain separate");
assert.equal(result.districts[0].name, "Argao II", "District ranking must use downloads plus prints");
assert.equal(result.districts.find((row) => row.name === "Carmen").total, 8, "A unique school ID can recover its missing district");
assert.equal(result.summary.withoutDistrict, 6, "Ambiguous school names must not be assigned to a guessed district");
assert.equal(result.summary.withoutSchool, 3);
assert.equal(result.summary.downloads, 27);
assert.equal(result.summary.prints, 28);
assert.equal(result.summary.total, 55);
assert.equal(result.districts.reduce((sum, row) => sum + row.total, 0) + result.summary.withoutDistrict, result.summary.total);
assert.equal(result.schools.reduce((sum, row) => sum + row.total, 0) + result.summary.withoutSchool, result.summary.total);
assert.equal(result.schools.some((row) => row.name === "Zero school"), false);
assert.equal(buildActivityRankings([], []).summary.total, 0);
assert.throws(() => buildActivityRankings([{ downloads: -1, prints: 0 }], []), /Invalid activity totals/);
console.log("Activity ranking checks passed: district aliases, school identities, repeated actions, missing profiles, empty data, and reconciled totals.");

(async () => {
  let administrator = false;
  const queries = [];
  const route = load("app/api/activity/rankings/route.ts", {
    "next/server": { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers }) } },
    "@/lib/auth": { requireAdministrator: async () => administrator ? { role: "administrator" } : null },
    "@/lib/db": { db: { query: async (sql, parameters) => { queries.push({ sql, parameters }); return [[]]; } } },
    "@/lib/activity-rankings": { buildActivityRankings },
  });
  assert.equal((await route.GET(new Request("https://example.test/api/activity/rankings"))).status, 403);
  assert.equal(queries.length, 0);
  administrator = true;
  assert.equal((await route.GET(new Request("https://example.test/api/activity/rankings?schoolYear=2026-2028"))).status, 400);
  assert.equal(queries.length, 0);
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Manila", year: "numeric", month: "numeric" }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year").value);
  const month = Number(parts.find((part) => part.type === "month").value);
  const start = year - (month < 6 ? 1 : 0);
  const response = await route.GET(new Request(`https://example.test/api/activity/rankings?schoolYear=${start}-${start + 1}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers["Cache-Control"], "private, no-store");
  assert.equal(queries[0].parameters[0], `${start}-06-01`);
  assert.equal(queries[0].parameters[1], `${start + 1}-06-01`);
  assert.match(queries[0].sql, /a\.created_at>=\? AND a\.created_at<\?/);
  assert.match(queries[0].sql, /a\.action IN \('download','print'\)/);
  assert.equal(response.body.summary.total, 0);
  console.log("Ranking API checks passed: administrator access, school-year validation, June–May boundaries, and private caching.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
