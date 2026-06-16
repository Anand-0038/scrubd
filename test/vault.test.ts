// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applySurrogates } from "../src/surrogate/apply.js";
import { readVaultRaw, Vault } from "../src/surrogate/vault.js";
import type { PhiSpan } from "../src/types.js";

describe("vault", () => {
  it("round-trips disguise then relink", () => {
    const dir = mkdtempSync(join(tmpdir(), "scrubd-vault-"));
    const vaultPath = join(dir, "vault.vault.json");
    const vault = new Vault(vaultPath, "test-passphrase");
    const note = "Patient Robert Lutz, SSN 412-22-9013";
    const spans: PhiSpan[] = [
      { start: 8, end: 19, text: "Robert Lutz", category: "NAME", source: "regex" },
      { start: 25, end: 36, text: "412-22-9013", category: "SSN", source: "regex" },
    ];
    const { disguisedNote } = applySurrogates(note, spans, vault);
    vault.save();
    const restored = vault.relink(disguisedNote);
    assert.equal(restored, note);
    rmSync(dir, { recursive: true, force: true });
  });

  it("relink avoids partial fake matches inside longer tokens", () => {
    const dir = mkdtempSync(join(tmpdir(), "scrubd-vault-"));
    const vault = new Vault(join(dir, "vault.vault.json"), "test");
    vault.addEntry("412-22-9013", "680-55-0682", "SSN");
    const disguised = "Patient SSN 4680-55-0682 verified";
    assert.equal(vault.relink(disguised), "Patient SSN 4680-55-0682 verified");
    const clean = "Patient SSN 680-55-0682 verified";
    assert.equal(vault.relink(clean), "Patient SSN 412-22-9013 verified");
    rmSync(dir, { recursive: true, force: true });
  });

  it("stores no plaintext real values at rest", () => {
    const dir = mkdtempSync(join(tmpdir(), "scrubd-vault-"));
    const vaultPath = join(dir, "vault.vault.json");
    const vault = new Vault(vaultPath, "test-passphrase");
    const real = "Robert Lutz";
    vault.addEntry(real, "Jane Doe", "NAME");
    vault.save();
    const raw = readVaultRaw(vaultPath);
    assert.ok(!raw.includes(real));
    rmSync(dir, { recursive: true, force: true });
  });
});
