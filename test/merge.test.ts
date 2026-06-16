// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeSpans } from "../src/merge.js";
import type { PhiSpan } from "../src/types.js";

describe("merge", () => {
  it("keeps longer span on overlap", () => {
    const regex: PhiSpan = {
      start: 0,
      end: 10,
      text: "1234567890",
      category: "PHONE",
      source: "regex",
    };
    const medpsy: PhiSpan = {
      start: 2,
      end: 8,
      text: "345678",
      category: "PHONE",
      source: "medpsy",
    };
    const merged = mergeSpans([regex], [medpsy]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].text, "1234567890");
    assert.equal(merged[0].source, "regex");
  });

  it("includes medpsy-only recovery span", () => {
    const medpsy: PhiSpan = {
      start: 20,
      end: 25,
      text: "Marcy",
      category: "NAME",
      source: "medpsy",
    };
    const merged = mergeSpans([], [medpsy]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].source, "medpsy");
  });
});
