// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import type { Stage2Result } from "../types.js";
import { askJson } from "../qvac.js";

function isStage2Result(v: unknown): v is Stage2Result {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Stage2Result;
  return (
    Array.isArray(obj.problems) &&
    obj.problems.every((p) => typeof p === "string") &&
    typeof obj.summary === "string"
  );
}

export async function extractStage2(
  deidentifiedNote: string,
  modelPath?: string,
): Promise<Stage2Result> {
  const history = [
    {
      role: "system",
      content:
        "Extract clinical problems and a one-line cohort summary from a de-identified note. " +
        'Return ONLY JSON: {"problems": string[], "summary": string}.',
    },
    {
      role: "user",
      content: deidentifiedNote,
    },
  ];

  const result = await askJson(history, isStage2Result, modelPath);
  return result ?? { problems: [], summary: "" };
}
