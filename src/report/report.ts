// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EvalResult, Stage2Result } from "../types.js";
import { formatScore } from "../eval/scorer.js";

export function writeReport(
  outDir: string,
  sampleNote: string,
  evalResult: EvalResult | null,
  stage2: Stage2Result | null,
): void {
  const lines: string[] = [
    "# Scrubd De-identification Report",
    "",
    "## Redacted Sample (first 500 chars of de-identified note)",
    "",
    "```",
    sampleNote.slice(0, 500),
    "```",
    "",
  ];

  if (evalResult) {
    lines.push("## Evaluation Scorecard", "");
    lines.push("Span matching uses **overlap + same category** (not exact offsets).", "");
    lines.push("### Baseline (regex-only)", "");
    lines.push("| Category | TP | FP | FN | Precision | Recall | F1 |");
    lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
    for (const s of evalResult.baseline) {
      lines.push(
        `| ${s.category} | ${s.tp} | ${s.fp} | ${s.fn} | ${formatScore(s.precision)} | ${formatScore(s.recall)} | ${formatScore(s.f1)} |`,
      );
    }
    lines.push("");
    lines.push("### With MedPsy Recovery", "");
    lines.push("| Category | TP | FP | FN | Precision | Recall | F1 |");
    lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
    for (const s of evalResult.withMedPsy) {
      lines.push(
        `| ${s.category} | ${s.tp} | ${s.fp} | ${s.fn} | ${formatScore(s.precision)} | ${formatScore(s.recall)} | ${formatScore(s.f1)} |`,
      );
    }
    lines.push("");
    lines.push("### Delta (With MedPsy − Baseline, overall)", "");
    lines.push(`- Precision: ${formatScore(evalResult.delta.precision)}`);
    lines.push(`- Recall: ${formatScore(evalResult.delta.recall)}`);
    lines.push(`- F1: ${formatScore(evalResult.delta.f1)}`);
    lines.push("");
  }

  if (stage2) {
    lines.push("## Stage-2 Clinical Extraction", "");
    lines.push("### Problems", "");
    for (const p of stage2.problems) {
      lines.push(`- ${p}`);
    }
    lines.push("");
    lines.push("### Summary", "");
    lines.push(stage2.summary);
    lines.push("");
  }

  writeFileSync(join(outDir, "deid-report.md"), lines.join("\n"));
}
