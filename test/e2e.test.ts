// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runScrubd } from "../src/cli.js";
import { generateGoldSet, loadGoldLabels } from "../src/eval/goldset.js";
import { DEFAULT_MODEL_PATH } from "../src/config.js";
import { Vault } from "../src/surrogate/vault.js";

const modelExists = existsSync(DEFAULT_MODEL_PATH);

describe("e2e", { skip: modelExists ? false : "MedPsy model not found at ./models/" }, () => {
  it("gen → run → eval delta → stage2 → relink", async () => {
    const tmpGold = mkdtempSync(join(tmpdir(), "scrubd-e2e-gold-"));
    const tmpOut = mkdtempSync(join(tmpdir(), "scrubd-e2e-out-"));

    try {
      generateGoldSet(20, tmpGold);

      await runScrubd({
        notesDir: join(tmpGold, "notes"),
        eval: true,
        stage2: true,
        outDir: tmpOut,
        labelsDir: join(tmpGold, "labels"),
      });

      const labels = loadGoldLabels(join(tmpGold, "labels"));
      for (const label of labels) {
        const outNote = readFileSync(join(tmpOut, `${label.noteId}.txt`), "utf8");
        const original = readFileSync(join(tmpGold, "notes", `${label.noteId}.txt`), "utf8");

        for (const span of label.spans) {
          assert.ok(
            !outNote.includes(span.text),
            `gold span "${span.text}" still present in disguised note`,
          );
        }

        const vault = new Vault(join(tmpOut, "vault.vault.json"), "scrubd-dev-passphrase");
        assert.equal(vault.relink(outNote), original);
      }

      const reportPath = join(tmpOut, "deid-report.md");
      assert.ok(existsSync(reportPath));
      const report = readFileSync(reportPath, "utf8");
      assert.match(report, /Evaluation Scorecard/);
      assert.match(report, /Delta/);
      assert.match(report, /Stage-2/);
      assert.match(report, /### Problems/);

      const deltaLine = report.match(/- F1: ([\d.]+)/g);
      assert.ok(deltaLine && deltaLine.length > 0);
      const deltaF1 = parseFloat(deltaLine[deltaLine.length - 1].replace("- F1: ", ""));
      assert.ok(deltaF1 > 0, `expected positive MedPsy delta, got ${deltaF1}`);

      assert.match(report, /^- /m);
    } finally {
      rmSync(tmpGold, { recursive: true, force: true });
      rmSync(tmpOut, { recursive: true, force: true });
    }
  });
});
