// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import type { HipaaCategory, PhiSpan } from "./types.js";

const CATEGORY_SPECIFICITY: Record<HipaaCategory, number> = {
  NAME: 10,
  GEO: 8,
  DATE: 7,
  PHONE: 9,
  FAX: 9,
  EMAIL: 9,
  SSN: 10,
  MRN: 9,
  HEALTH_PLAN: 8,
  ACCOUNT: 7,
  LICENSE: 7,
  VEHICLE: 8,
  DEVICE: 7,
  URL: 8,
  IP: 8,
  BIOMETRIC: 6,
  PHOTO: 6,
  OTHER_ID: 5,
};

function overlaps(a: PhiSpan, b: PhiSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

function spanLength(s: PhiSpan): number {
  return s.end - s.start;
}

function pickWinner(a: PhiSpan, b: PhiSpan): PhiSpan {
  const lenA = spanLength(a);
  const lenB = spanLength(b);
  if (lenA > lenB) return a;
  if (lenB > lenA) return b;
  const specA = CATEGORY_SPECIFICITY[a.category];
  const specB = CATEGORY_SPECIFICITY[b.category];
  return specA >= specB ? a : b;
}

export function mergeSpans(regexSpans: PhiSpan[], recoveredSpans: PhiSpan[]): PhiSpan[] {
  const combined = [...regexSpans, ...recoveredSpans];
  combined.sort((a, b) => a.start - b.start || spanLength(b) - spanLength(a));

  const result: PhiSpan[] = [];
  for (const span of combined) {
    let merged = false;
    for (let i = 0; i < result.length; i++) {
      if (overlaps(result[i], span)) {
        result[i] = pickWinner(result[i], span);
        merged = true;
        break;
      }
    }
    if (!merged) result.push({ ...span });
  }

  result.sort((a, b) => a.start - b.start);
  return result;
}

export function filterBySource(spans: PhiSpan[], source: "regex" | "medpsy"): PhiSpan[] {
  return spans.filter((s) => s.source === source);
}
