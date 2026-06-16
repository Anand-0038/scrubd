// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateGoldSet } from "../src/eval/goldset.js";
import { disableOfflineGuard, enableOfflineGuard, getOutboundConnections } from "../src/qvac.js";
import { runScrubd } from "../src/cli.js";

async function main(): Promise<void> {
  const tmpGold = mkdtempSync(join(tmpdir(), "scrubd-offline-"));
  const tmpOut = mkdtempSync(join(tmpdir(), "scrubd-out-"));

  try {
    generateGoldSet(2, tmpGold);

    enableOfflineGuard();
    try {
      await runScrubd({
        notesDir: join(tmpGold, "notes"),
        eval: true,
        stage2: false,
        outDir: tmpOut,
        labelsDir: join(tmpGold, "labels"),
        noMedpsy: true,
      });
    } finally {
      disableOfflineGuard();
    }

    const connections = getOutboundConnections();
    if (connections.length > 0) {
      console.error("FAIL: outbound connections detected:", connections);
      process.exit(1);
    }

    console.log("PASS: zero outbound socket connections during pipeline run");
  } finally {
    rmSync(tmpGold, { recursive: true, force: true });
    rmSync(tmpOut, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
