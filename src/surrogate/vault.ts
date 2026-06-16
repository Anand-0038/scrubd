// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { HipaaCategory, SurrogateMapEntry } from "../types.js";

interface VaultPayload {
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class Vault {
  private entries: SurrogateMapEntry[] = [];
  private readonly path: string;
  private readonly passphrase: string;

  constructor(path: string, passphrase: string) {
    this.path = path;
    this.passphrase = passphrase;
    if (existsSync(path)) {
      this.load();
    }
  }

  private deriveKey(salt: Buffer): Buffer {
    return scryptSync(this.passphrase, salt, 32);
  }

  private load(): void {
    const raw = readFileSync(this.path, "utf8");
    const payload: VaultPayload = JSON.parse(raw);
    const salt = Buffer.from(payload.salt, "hex");
    const iv = Buffer.from(payload.iv, "hex");
    const authTag = Buffer.from(payload.authTag, "hex");
    const key = this.deriveKey(salt);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "hex")),
      decipher.final(),
    ]);
    this.entries = JSON.parse(decrypted.toString("utf8"));
  }

  save(): void {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = this.deriveKey(salt);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const plaintext = Buffer.from(JSON.stringify(this.entries), "utf8");
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const payload: VaultPayload = {
      salt: salt.toString("hex"),
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      ciphertext: encrypted.toString("hex"),
    };
    writeFileSync(this.path, JSON.stringify(payload));
  }

  addEntry(real: string, fake: string, category: HipaaCategory): void {
    const existing = this.entries.find((e) => e.real === real);
    if (existing) {
      existing.fake = fake;
      existing.category = category;
    } else {
      this.entries.push({ real, fake, category });
    }
  }

  getFake(real: string): string | undefined {
    return this.entries.find((e) => e.real === real)?.fake;
  }

  relink(disguisedNote: string): string {
    let result = disguisedNote;
    const sorted = [...this.entries].sort((a, b) => b.fake.length - a.fake.length);

    for (const { real, fake } of sorted) {
      if (!result.includes(fake)) continue;
      const escaped = escapeRegExp(fake);
      // Avoid replacing a fake that appears inside a longer token (e.g. SSN fragment).
      const pattern = new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "g");
      result = result.replace(pattern, () => real);
    }

    return result;
  }

  getEntries(): readonly SurrogateMapEntry[] {
    return this.entries;
  }
}

export function readVaultRaw(path: string): string {
  return readFileSync(path, "utf8");
}
