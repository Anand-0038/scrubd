// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runScrubd } from "../src/cli.js";
import { generateGoldSet } from "../src/eval/goldset.js";
import { disableOfflineGuard, enableOfflineGuard, getOutboundConnections } from "../src/qvac.js";

describe("offline", () => {
  it("full run produces zero outbound socket connections", async () => {
    const tmpGold = mkdtempSync(join(tmpdir(), "scrubd-offline-gold-"));
    const tmpOut = mkdtempSync(join(tmpdir(), "scrubd-offline-out-"));

    try {
      generateGoldSet(3, tmpGold);
      enableOfflineGuard();
      try {
        await runScrubd({
          notesDir: join(tmpGold, "notes"),
          eval: true,
          outDir: tmpOut,
          labelsDir: join(tmpGold, "labels"),
          noMedpsy: true,
        });
      } finally {
        disableOfflineGuard();
      }

      assert.equal(getOutboundConnections().length, 0);
    } finally {
      rmSync(tmpGold, { recursive: true, force: true });
      rmSync(tmpOut, { recursive: true, force: true });
    }
  });
});
