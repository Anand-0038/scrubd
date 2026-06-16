// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateSurrogate } from "../src/surrogate/faker.js";
import { applySurrogates } from "../src/surrogate/apply.js";
import { Vault } from "../src/surrogate/vault.js";
import type { PhiSpan } from "../src/types.js";

function span(text: string, category: PhiSpan["category"]): PhiSpan {
  return { start: 0, end: text.length, text, category, source: "regex" };
}

describe("surrogate", () => {
  it("same real name yields identical fake", () => {
    const s = span("Robert Lutz", "NAME");
    const a = generateSurrogate(s);
    const b = generateSurrogate(s);
    assert.equal(a, b);
  });

  it("fake SSN matches format and differs from real", () => {
    const real = "412-22-9013";
    const fake = generateSurrogate(span(real, "SSN"));
    assert.match(fake, /^\d{3}-\d{2}-\d{4}$/);
    assert.notEqual(fake, real);
  });

  it("preserves date interval after shift", () => {
    const noteKey = { id: "interval-test" };
    const d1 = span("01/01/2020", "DATE");
    const d2 = span("01/11/2020", "DATE");
    const f1 = generateSurrogate(d1, noteKey);
    const f2 = generateSurrogate(d2, noteKey);
    const parse = (s: string) => {
      const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return m ? new Date(`${m[3]}-${m[1]}-${m[2]}`).getTime() : 0;
    };
    const realDiff = (parse(d2.text) - parse(d1.text)) / (86400000);
    const fakeDiff = (parse(f2) - parse(f1)) / (86400000);
    assert.equal(realDiff, 10);
    assert.equal(fakeDiff, 10);
  });

  it("reuses vault mapping across notes for same real value", () => {
    const dir = mkdtempSync(join(tmpdir(), "scrubd-cross-"));
    const vaultPath = join(dir, "vault.vault.json");
    const vault = new Vault(vaultPath, "test");
    const nameSpan = span("Robert Lutz", "NAME");

    const first = applySurrogates("Patient Robert Lutz", [nameSpan], vault);
    const second = applySurrogates("Discussed with Robert Lutz", [{ ...nameSpan, start: 14, end: 25 }], vault);

    assert.equal(first.entries[0].fake, second.entries[0].fake);
    rmSync(dir, { recursive: true, force: true });
  });
});
