// Plan capabilities. Run: ./node_modules/.bin/tsx --test qa/unit/plans.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { PLAN_CAPABILITIES, CURRENT_PLAN, USER_UPLOADS_ENABLED, SOURCE_TEMPLATES_ENABLED, APP_VERSION } from "../../src/lib/config";
import { readFileSync } from "node:fs";

test("only two plans: demo (free) and pro (paid)", () => {
  assert.deepEqual(Object.keys(PLAN_CAPABILITIES).sort(), ["demo", "pro"]);
});

test("demo: no uploads and no templates", () => {
  assert.deepEqual(PLAN_CAPABILITIES.demo, { uploads: false, templates: false });
});

test("pro: uploads and templates", () => {
  assert.deepEqual(PLAN_CAPABILITIES.pro, { uploads: true, templates: true });
});

test("current plan drives the exported flags", () => {
  assert.equal(CURRENT_PLAN, "demo");
  assert.equal(USER_UPLOADS_ENABLED, false);
  assert.equal(SOURCE_TEMPLATES_ENABLED, false);
});

test("app version matches package.json", () => {
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.version, APP_VERSION);
});
