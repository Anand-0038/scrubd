// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import type { CategoryScore, EvalResult, HipaaCategory, PhiSpan } from "../types.js";
import { HIPAA_CATEGORIES } from "../config.js";

function spansOverlap(a: PhiSpan, b: PhiSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

function computeScores(
  predicted: PhiSpan[],
  gold: PhiSpan[],
  categories: HipaaCategory[],
): CategoryScore[] {
  const scores: CategoryScore[] = [];

  let overallTp = 0;
  let overallFp = 0;
  let overallFn = 0;

  for (const category of categories) {
    const predCat = predicted.filter((p) => p.category === category);
    const goldCat = gold.filter((g) => g.category === category);

    if (predCat.length === 0 && goldCat.length === 0) {
      scores.push({
        category,
        tp: 0,
        fp: 0,
        fn: 0,
        precision: NaN,
        recall: NaN,
        f1: NaN,
      });
      continue;
    }

    const matchedGold = new Set<number>();
    let tp = 0;
    let fp = 0;

    for (const pred of predCat) {
      let matched = false;
      for (let i = 0; i < goldCat.length; i++) {
        if (matchedGold.has(i)) continue;
        if (spansOverlap(pred, goldCat[i])) {
          matchedGold.add(i);
          tp++;
          matched = true;
          break;
        }
      }
      if (!matched) fp++;
    }

    const fn = goldCat.length - matchedGold.size;
    const precision = tp + fp === 0 ? NaN : tp / (tp + fp);
    const recall = tp + fn === 0 ? NaN : tp / (tp + fn);
    const f1 =
      Number.isNaN(precision) || Number.isNaN(recall) || precision + recall === 0
        ? NaN
        : (2 * precision * recall) / (precision + recall);

    overallTp += tp;
    overallFp += fp;
    overallFn += fn;

    scores.push({ category, tp, fp, fn, precision, recall, f1 });
  }

  const oPrecision =
    overallTp + overallFp === 0 ? NaN : overallTp / (overallTp + overallFp);
  const oRecall =
    overallTp + overallFn === 0 ? NaN : overallTp / (overallTp + overallFn);
  const oF1 =
    Number.isNaN(oPrecision) || Number.isNaN(oRecall) || oPrecision + oRecall === 0
      ? NaN
      : (2 * oPrecision * oRecall) / (oPrecision + oRecall);

  scores.push({
    category: "OVERALL",
    tp: overallTp,
    fp: overallFp,
    fn: overallFn,
    precision: oPrecision,
    recall: oRecall,
    f1: oF1,
  });

  return scores;
}

function getOverall(scores: CategoryScore[]): CategoryScore {
  return scores.find((s) => s.category === "OVERALL")!;
}

export function scoreEval(
  baselinePreds: PhiSpan[],
  withMedPsyPreds: PhiSpan[],
  goldSpans: PhiSpan[],
): EvalResult {
  const baseline = computeScores(baselinePreds, goldSpans, HIPAA_CATEGORIES);
  const withMedPsy = computeScores(withMedPsyPreds, goldSpans, HIPAA_CATEGORIES);

  const bOverall = getOverall(baseline);
  const mOverall = getOverall(withMedPsy);

  const delta = {
    precision:
      Number.isNaN(mOverall.precision) || Number.isNaN(bOverall.precision)
        ? NaN
        : mOverall.precision - bOverall.precision,
    recall:
      Number.isNaN(mOverall.recall) || Number.isNaN(bOverall.recall)
        ? NaN
        : mOverall.recall - bOverall.recall,
    f1:
      Number.isNaN(mOverall.f1) || Number.isNaN(bOverall.f1)
        ? NaN
        : mOverall.f1 - bOverall.f1,
  };

  return { baseline, withMedPsy, delta };
}

export function formatScore(n: number): string {
  return Number.isNaN(n) ? "n/a" : n.toFixed(3);
}
