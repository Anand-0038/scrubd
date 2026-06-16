// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractBalancedJson, findValidJsonInText } from "../src/qvac.js";

describe("stage2 parse helpers", () => {
  it("extracts wrapped JSON from prose", () => {
    const text =
      'Here is the result: {"problems": ["hypertension", "diabetes"], "summary": "Adult with cardiometabolic conditions."} done.';
    const block = extractBalancedJson(text);
    assert.ok(block);
    const parsed = JSON.parse(block);
    assert.deepEqual(parsed.problems, ["hypertension", "diabetes"]);
    assert.equal(parsed.summary, "Adult with cardiometabolic conditions.");
  });

  it("handles think-wrapped content shape", () => {
    const content = '<think>reasoning</think>{"problems":["x"],"summary":"y"}';
    const block = extractBalancedJson(content);
    assert.ok(block);
    const parsed = JSON.parse(block);
    assert.deepEqual(parsed.problems, ["x"]);
  });

  it("extracts JSON arrays with nested objects", () => {
    const text =
      'Found: [{"text":"Marcy","category":"NAME","approxIndex":42},{"text":"90210","category":"GEO","approxIndex":90}] end';
    const block = extractBalancedJson(text);
    assert.ok(block);
    const parsed = JSON.parse(block);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].text, "Marcy");
  });

  it("skips invalid balanced fragments and parses later JSON", () => {
    const text = 'note {not json} then [{"text":"a","category":"NAME","approxIndex":1}]';
    const parsed = findValidJsonInText(text, (v): v is Array<{ text: string }> => Array.isArray(v));
    assert.ok(parsed);
    assert.equal(parsed[0].text, "a");
  });
});
