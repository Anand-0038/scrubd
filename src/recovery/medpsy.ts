// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import type { HipaaCategory, PhiSpan } from "../types.js";
import { askJson } from "../qvac.js";
import { buildRecoveryPrompt, isHipaaCategory } from "./prompt.js";

interface RecoveryItem {
  text: string;
  category: string;
  approxIndex: number;
}

function isRecoveryArray(v: unknown): v is RecoveryItem[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as RecoveryItem).text === "string" &&
      isHipaaCategory((item as RecoveryItem).category) &&
      typeof (item as RecoveryItem).approxIndex === "number",
  );
}

function findNearestMatch(note: string, text: string, approxIndex: number): number {
  let bestIdx = -1;
  let bestDist = Infinity;
  let searchFrom = 0;
  while (true) {
    const idx = note.indexOf(text, searchFrom);
    if (idx === -1) break;
    const dist = Math.abs(idx - approxIndex);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = idx;
    }
    searchFrom = idx + 1;
  }
  return bestIdx;
}

export async function recoverSpans(
  note: string,
  existingSpans: PhiSpan[],
  modelPath?: string,
): Promise<PhiSpan[]> {
  const history = buildRecoveryPrompt(note, existingSpans);
  const items = await askJson(history, isRecoveryArray, modelPath);
  if (!items) return [];

  const spans: PhiSpan[] = [];
  for (const item of items) {
    const start = findNearestMatch(note, item.text, item.approxIndex);
    if (start === -1) continue;
    spans.push({
      start,
      end: start + item.text.length,
      text: item.text,
      category: item.category as HipaaCategory,
      source: "medpsy",
    });
  }
  return spans;
}
