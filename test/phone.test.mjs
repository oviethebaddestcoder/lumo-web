// Pure helpers, imported straight from TypeScript (Node strips the types).
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "../src/lib/phone.ts";

test("Nigerian numbers in the forms people type", () => {
  for (const raw of ["08031234567", "0803 123 4567", "+234 803 123 4567", "+2340803-123-4567", "(0803) 123 4567"]) {
    assert.equal(normalizePhone(raw), "+2348031234567", raw);
  }
});

test("other countries pass through untouched", () => {
  assert.equal(normalizePhone("+44 7700 900123"), "+447700900123");
  assert.equal(normalizePhone("+233 24 123 4567"), "+233241234567");
});
