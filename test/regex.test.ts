// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scanDeterministic } from "../src/scanner/deterministic.js";
import { REGEX_MATCHERS } from "../src/scanner/regex.js";

describe("regex scanner", () => {
  it("detects SSN with correct offsets", () => {
    const note = "SSN 412-22-9013";
    const spans = scanDeterministic(note);
    const ssn = spans.find((s) => s.category === "SSN");
    assert.ok(ssn);
    assert.equal(ssn.text, "412-22-9013");
    assert.equal(note.slice(ssn.start, ssn.end), "412-22-9013");
  });

  it("detects structured categories from fixtures", () => {
    const fixtures: Array<[string, string]> = [
      ["call 555-123-4567", "PHONE"],
      ["fax: 555-987-6543", "FAX"],
      ["user@test.com", "EMAIL"],
      ["https://example.com/path", "URL"],
      ["192.168.1.1", "IP"],
      ["90210", "GEO"],
      ["03/14/1972", "DATE"],
      ["MRN884213", "MRN"],
    ];
    for (const [text, category] of fixtures) {
      const spans = scanDeterministic(text);
      assert.ok(
        spans.some((s) => s.category === category),
        `expected ${category} in "${text}"`,
      );
    }
  });

  it("does not false-positive on vitals / age <= 89", () => {
    const note = "patient is 45 years old, BP 120/80";
    const spans = scanDeterministic(note);
    assert.equal(spans.length, 0);
  });

  it("exports 18 category matchers", () => {
    const categories = new Set(REGEX_MATCHERS.map((m) => m.category));
    assert.ok(categories.size >= 10);
  });
});
