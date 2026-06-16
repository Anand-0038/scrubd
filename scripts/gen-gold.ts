// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { generateGoldSet } from "../src/eval/goldset.js";

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      out: { type: "string" },
    },
    allowPositionals: true,
  });

  const count = parseInt(positionals[0] ?? "20", 10);
  const outDir = resolve(values.out ?? "./data/gold");

  generateGoldSet(count, outDir);
  console.log(`Generated ${count} gold notes in ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
