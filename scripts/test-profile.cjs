const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, dependencies, extras = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = { exports: {}, Buffer, URL, ...extras, require(name) { if (!(name in dependencies)) throw Error(`Unexpected dependency ${name}`); return dependencies[name]; } };
  vm.runInNewContext(code, context, { filename: file }); return context.exports;
}
const district = load("lib/district.ts", {});
const operations = [];
const reads = [];
const row = { username: "teacher", email: "teacher@example.test", name: "Sample Teacher", role: "school", district: "Carmen", schoolName: "Example School", schoolId: "100", hasPhoto: 0, password_hash: "private-password-hash" };
const connection = { beginTransaction: async () => operations.push(["begin"]), query: async (sql) => { reads.push(sql); return [[row]]; }, execute: async (...args) => operations.push(args), commit: async () => operations.push(["commit"]), rollback: async () => operations.push(["rollback"]), release: () => operations.push(["release"]) };
const db = { execute: async (...args) => operations.push(args), query: async (sql) => { reads.push(sql); return [[row]]; }, getConnection: async () => connection };
const profile = load("lib/profile.ts", { "./db": { db }, "./district": district });
const valid = { name: "Updated Teacher", schoolId: "101", district: "Carmen" };
assert.equal(profile.validateProfile(valid, "school").name, "Updated Teacher");
assert.throws(() => profile.validateProfile({ ...valid, role: "administrator" }, "school"), /identity and access/);
assert.throws(() => profile.validateProfile({ ...valid, id: "another-user" }, "school"), /identity and access/);
assert.throws(() => profile.validateProfile({ ...valid, district: "Invalid district" }, "school"), /official list/);
assert.throws(() => profile.validateProfile({ ...valid, newPassword: "new-password", confirmPassword: "new-password" }, "school"), /current password/);
assert.throws(() => profile.validateProfile({ ...valid, currentPassword: "old-password", newPassword: "short", confirmPassword: "short" }, "school"), /at least 8/);
assert.throws(() => profile.validateProfile({ ...valid, currentPassword: "old-password", newPassword: "new-password", confirmPassword: "different" }, "school"), /do not match/);
assert.throws(() => profile.validateProfile({ ...valid, photo: "data:image/png;base64,unused" }, "school"), /no longer supported/);
assert.throws(() => profile.validateProfile({ ...valid, photo: null }, "school"), /no longer supported/);

(async () => {
  let user = null;
  const route = load("app/api/profile/route.ts", {
    "next/server": { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    "@/lib/auth": { currentUser: async () => user, currentSessionTokenHash: async () => "current-session", bcrypt: { compare: async (password) => password === "correct-current", hash: async (password) => `hashed:${password}` } },
    "@/lib/db": { db }, "@/lib/profile": profile,
  });
  const request = (body, headers = {}) => new Request("https://example.test/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  assert.equal((await route.GET()).status, 401);
  assert.equal((await route.PATCH(request(valid))).status, 401);
  assert.equal(operations.length, 0);
  user = { id: "own-account", role: "school" };
  assert.equal((await route.PATCH(request(valid, { "sec-fetch-site": "cross-site" }))).status, 403);
  assert.equal((await route.PATCH(request({ ...valid, id: "another-account" }))).status, 400);
  assert.equal(operations.length, 0);
  const change = { ...valid, currentPassword: "wrong-current", newPassword: "changed-password", confirmPassword: "changed-password" };
  assert.equal((await route.PATCH(request(change))).status, 400);
  assert.ok(operations.some(([sql]) => sql === "rollback"));
  assert.ok(!operations.some(([sql]) => sql.startsWith("UPDATE")));
  operations.length = 0;
  const saved = await route.PATCH(request({ ...change, currentPassword: "correct-current" }));
  assert.equal(saved.status, 200);
  const update = operations.find(([sql]) => sql.startsWith("UPDATE users"));
  assert.equal(update[1].at(-1), "own-account");
  assert.equal(update[1][3], "hashed:changed-password");
  const revoke = operations.find(([sql]) => sql.startsWith("DELETE FROM sessions"));
  assert.equal(revoke[1][0], "own-account"); assert.equal(revoke[1][1], "current-session");
  assert.ok(operations.some(([sql]) => sql === "commit"));
  assert.equal(saved.body.profile.password_hash, undefined);
  assert.equal(saved.body.profile.hasPhoto, undefined);
  assert.equal(saved.body.passwordChanged, true);
  operations.length = 0;
  assert.equal((await route.PATCH(request(valid))).status, 200);
  assert.ok(!operations.some(([sql]) => sql.startsWith("DELETE FROM sessions")), "Ordinary profile changes must not revoke sessions or change passwords");
  assert.ok(!operations.some(([sql]) => /user_profile_photos/i.test(sql)));
  assert.ok(!reads.some((sql) => /user_profile_photos/i.test(sql)), "Profiles must not read photo storage");
  operations.length = 0;
  assert.equal((await route.PATCH(request({ ...valid, photo: "unused" }))).status, 400);
  assert.equal(operations.length, 0, "Photo submissions must be rejected before database writes");
  operations.length = 0;
  const auth = load("lib/auth.ts", { crypto: require("node:crypto"), "next/headers": { cookies: async () => ({}) }, bcryptjs: {}, "@/lib/db": { db: { query: async () => [[{ id: "admin", role: "administrator", password_hash: "saved-password" }]], execute: async (...args) => operations.push(args) } } }, { process: { env: { ADMIN_USERNAME: "admin", ADMIN_PASSWORD: "seed-only-password", ADMIN_EMAIL: "admin@example.test" } } });
  await auth.ensurePrimaryAdmin();
  assert.equal(operations.length, 0, "Existing administrator passwords must not be overwritten by hosting seed settings");
  console.log("Profile checks passed: self-only edits, password security, administrator password persistence, rejected image uploads, and no photo database access.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
