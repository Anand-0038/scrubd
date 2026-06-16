// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import type { PhiSpan } from "../types.js";
import { isVitalFalsePositive, REGEX_MATCHERS } from "./regex.js";

export function scanDeterministic(note: string): PhiSpan[] {
  const spans: PhiSpan[] = [];

  for (const { category, pattern } of REGEX_MATCHERS) {
    const re = new RegExp(pattern.source, pattern.flags);
    for (const match of note.matchAll(re)) {
      const text = match[0];
      const start = match.index ?? 0;
      if (isVitalFalsePositive(note, text)) continue;
      spans.push({
        start,
        end: start + text.length,
        text,
        category,
        source: "regex",
      });
    }
  }

  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  return spans;
}
