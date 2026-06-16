// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreEval } from "../src/eval/scorer.js";
import type { PhiSpan } from "../src/types.js";

describe("scorer", () => {
  it("computes known P/R/F1 from toy counts", () => {
    const gold: PhiSpan[] = [
      { start: 0, end: 3, text: "abc", category: "NAME", source: "regex" },
      { start: 10, end: 13, text: "def", category: "NAME", source: "regex" },
      { start: 20, end: 23, text: "ghi", category: "EMAIL", source: "regex" },
      { start: 30, end: 33, text: "jkl", category: "EMAIL", source: "regex" },
      { start: 40, end: 43, text: "mno", category: "SSN", source: "regex" },
    ];
    const pred: PhiSpan[] = [
      { start: 0, end: 3, text: "abc", category: "NAME", source: "regex" },
      { start: 10, end: 13, text: "def", category: "NAME", source: "regex" },
      { start: 20, end: 23, text: "ghi", category: "EMAIL", source: "regex" },
      { start: 50, end: 53, text: "xyz", category: "PHONE", source: "regex" },
    ];
    const result = scoreEval(pred, pred, gold);
    const overall = result.baseline.find((s) => s.category === "OVERALL")!;
    assert.equal(overall.tp, 3);
    assert.equal(overall.fp, 1);
    assert.equal(overall.fn, 2);
    assert.equal(overall.precision, 0.75);
    assert.equal(overall.recall, 0.6);
    assert.ok(Math.abs(overall.f1 - 0.667) < 0.01);
  });

  it("propagates NaN in delta when overall scores are undefined", () => {
    const result = scoreEval([], [], []);
    assert.ok(Number.isNaN(result.delta.f1));
    assert.ok(Number.isNaN(result.delta.precision));
    assert.ok(Number.isNaN(result.delta.recall));
  });

  it("computes finite delta when both overall scores exist", () => {
    const gold: PhiSpan[] = [
      { start: 0, end: 3, text: "abc", category: "NAME", source: "regex" },
      { start: 10, end: 13, text: "def", category: "NAME", source: "regex" },
    ];
    const baseline: PhiSpan[] = [
      { start: 0, end: 3, text: "abc", category: "NAME", source: "regex" },
    ];
    const withMedPsy: PhiSpan[] = [
      ...baseline,
      { start: 10, end: 13, text: "def", category: "NAME", source: "medpsy" },
    ];
    const result = scoreEval(baseline, withMedPsy, gold);
    assert.ok(result.delta.recall > 0);
    assert.ok(!Number.isNaN(result.delta.f1));
    assert.ok(result.delta.f1 > 0);
  });
});
