// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { appendFileSync, writeFileSync } from "node:fs";

let RUNLOG_PATH = "runlog.csv";
let headerWritten = false;

export interface RunLogEntry {
  phase: string;
  modelId?: string;
  promptChars?: number;
  promptTokens?: number;
  generatedTokens?: number;
  ttftMs?: number;
  tokensPerSec?: number;
  stopReason?: string;
  detail?: string;
}

export function initRunLog(path = RUNLOG_PATH): void {
  RUNLOG_PATH = path;
  if (!headerWritten) {
    writeFileSync(
      path,
      "phase,modelId,promptChars,promptTokens,generatedTokens,ttftMs,tokensPerSec,stopReason,detail\n",
    );
    headerWritten = true;
  }
}

export function logRun(entry: RunLogEntry, path = RUNLOG_PATH): void {
  if (!headerWritten) initRunLog(path);
  const row = [
    entry.phase,
    entry.modelId ?? "",
    entry.promptChars ?? "",
    entry.promptTokens ?? "",
    entry.generatedTokens ?? "",
    entry.ttftMs ?? "",
    entry.tokensPerSec ?? "",
    entry.stopReason ?? "",
    (entry.detail ?? "").replace(/,/g, ";"),
  ].join(",");
  appendFileSync(path, row + "\n");
}
