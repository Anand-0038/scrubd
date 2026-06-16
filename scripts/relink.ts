// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { DEFAULT_OUT_DIR } from "../src/config.js";
import { Vault } from "../src/surrogate/vault.js";

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      out: { type: "string" },
      vault: { type: "string" },
      passphrase: { type: "string" },
    },
    allowPositionals: true,
  });

  const notePath = positionals[0];
  if (!notePath) {
    console.error("Usage: scrubd-relink <note> [--out <file>] [--vault <path>] [--passphrase <str>]");
    process.exit(1);
  }

  const outFile = resolve(values.out ?? notePath.replace(/\.txt$/, ".relinked.txt"));
  const vaultPath = resolve(values.vault ?? `${DEFAULT_OUT_DIR}/vault.vault.json`);
  const passphrase = values.passphrase ?? process.env.SCRUBD_PASSPHRASE ?? "scrubd-dev-passphrase";

  const disguised = readFileSync(notePath, "utf8");
  const vault = new Vault(vaultPath, passphrase);
  const original = vault.relink(disguised);

  writeFileSync(outFile, original);
  console.log(`Relinked note written to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
