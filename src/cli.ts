// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { DEFAULT_MODEL_PATH, DEFAULT_OUT_DIR } from "./config.js";
import { loadGoldLabels } from "./eval/goldset.js";
import { scoreEval, formatScore } from "./eval/scorer.js";
import { mergeSpans } from "./merge.js";
import { writeReport } from "./report/report.js";
import { recoverSpans } from "./recovery/medpsy.js";
import { initRunLog } from "./runlog.js";
import { shutdown } from "./qvac.js";
import { scanDeterministic } from "./scanner/deterministic.js";
import { extractStage2 } from "./stage2/extract.js";
import { applySurrogates } from "./surrogate/apply.js";
import { Vault } from "./surrogate/vault.js";
import { fileURLToPath } from "node:url";
import type { EvalResult, GoldLabel, PhiSpan, Stage2Result } from "./types.js";

const isMain = Boolean(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]);

export interface ScrubdOptions {
  notesDir: string;
  eval?: boolean;
  stage2?: boolean;
  outDir?: string;
  labelsDir?: string;
  modelPath?: string;
  passphrase?: string;
  noMedpsy?: boolean;
}

export interface NoteResult {
  noteId: string;
  original: string;
  disguised: string;
  regexSpans: PhiSpan[];
  mergedSpans: PhiSpan[];
}

export async function processNote(
  noteText: string,
  noteId: string,
  vault: Vault,
  options: Pick<ScrubdOptions, "modelPath" | "noMedpsy">,
): Promise<NoteResult> {
  const noteKey = { id: noteId };
  const regexSpans = scanDeterministic(noteText);
  let recovered: PhiSpan[] = [];
  if (!options.noMedpsy) {
    recovered = await recoverSpans(noteText, regexSpans, options.modelPath);
  }
  const mergedSpans = mergeSpans(regexSpans, recovered);
  const { disguisedNote } = applySurrogates(noteText, mergedSpans, vault, noteKey);
  vault.save();

  return {
    noteId,
    original: noteText,
    disguised: disguisedNote,
    regexSpans,
    mergedSpans,
  };
}

export async function runScrubd(options: ScrubdOptions): Promise<void> {
  const outDir = resolve(options.outDir ?? DEFAULT_OUT_DIR);
  const vaultPath = join(outDir, "vault.vault.json");
  const passphrase = options.passphrase ?? process.env.SCRUBD_PASSPHRASE ?? "scrubd-dev-passphrase";
  const modelPath = options.modelPath ?? DEFAULT_MODEL_PATH;

  mkdirSync(outDir, { recursive: true });
  initRunLog(join(outDir, "runlog.csv"));

  const vault = new Vault(vaultPath, passphrase);
  const notesDir = resolve(options.notesDir);
  const noteFiles = readdirSync(notesDir).filter((f) => f.endsWith(".txt"));

  let labels: GoldLabel[] = [];
  if (options.eval) {
    const labelsDir = resolve(options.labelsDir ?? join(dirname(notesDir), "labels"));
    labels = loadGoldLabels(labelsDir);
  }

  const allBaseline: PhiSpan[] = [];
  const allMerged: PhiSpan[] = [];
  const allGold: PhiSpan[] = [];
  let sampleDisguised = "";
  let stage2Result: Stage2Result | null = null;

  for (const file of noteFiles) {
    const noteId = basename(file, ".txt");
    const noteText = readFileSync(join(notesDir, file), "utf8");
    const result = await processNote(noteText, noteId, vault, {
      modelPath,
      noMedpsy: options.noMedpsy,
    });

    writeFileSync(join(outDir, file), result.disguised);
    if (!sampleDisguised) sampleDisguised = result.disguised;

    if (options.stage2 && !stage2Result) {
      stage2Result = await extractStage2(result.disguised, modelPath);
    }

    if (options.eval) {
      const label = labels.find((l) => l.noteId === noteId);
      if (label) {
        allBaseline.push(...result.regexSpans);
        allMerged.push(...result.mergedSpans);
        allGold.push(...label.spans.map((s) => ({ ...s, source: "regex" as const })));
      }
    }
  }

  let evalResult: EvalResult | null = null;
  if (options.eval && allGold.length > 0) {
    evalResult = scoreEval(allBaseline, allMerged, allGold);
    console.log("\n=== Evaluation Scorecard ===");
    const overall = evalResult.withMedPsy.find((s) => s.category === "OVERALL");
    const baseline = evalResult.baseline.find((s) => s.category === "OVERALL");
    console.log(`Baseline F1: ${formatScore(baseline?.f1 ?? NaN)}`);
    console.log(`With MedPsy F1: ${formatScore(overall?.f1 ?? NaN)}`);
    console.log(`Delta F1: ${formatScore(evalResult.delta.f1)}`);
  }

  if (options.eval || options.stage2) {
    writeReport(outDir, sampleDisguised, evalResult, stage2Result);
  }

  await shutdown();
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      eval: { type: "boolean", default: false },
      stage2: { type: "boolean", default: false },
      out: { type: "string" },
      labels: { type: "string" },
      model: { type: "string" },
      passphrase: { type: "string" },
      "no-medpsy": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const notesDir = positionals[0];
  if (!notesDir) {
    console.error(
      "Usage: scrubd <notes-dir> [--eval] [--stage2] [--out <dir>] [--labels <dir>] [--model <path>] [--passphrase <str>] [--no-medpsy]",
    );
    process.exit(1);
  }

  await runScrubd({
    notesDir,
    eval: values.eval,
    stage2: values.stage2,
    outDir: values.out,
    labelsDir: values.labels,
    modelPath: values.model,
    passphrase: values.passphrase,
    noMedpsy: values["no-medpsy"],
  });
}

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
