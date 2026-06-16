// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import type { PhiSpan, SurrogateMapEntry } from "../types.js";
import { generateSurrogate } from "./faker.js";
import type { Vault } from "./vault.js";

export interface ApplyResult {
  disguisedNote: string;
  entries: SurrogateMapEntry[];
}

export function applySurrogates(
  note: string,
  spans: PhiSpan[],
  vault?: Vault,
  noteKey: object = {},
): ApplyResult {
  const sorted = [...spans].sort((a, b) => b.start - a.start);
  const entries: SurrogateMapEntry[] = [];
  let result = note;

  for (const span of sorted) {
    const local = entries.find((e) => e.real === span.text);
    let fake = vault?.getFake(span.text) ?? local?.fake;

    if (!fake) {
      fake = generateSurrogate(span, noteKey);
    }

    if (!local) {
      entries.push({ real: span.text, fake, category: span.category });
    }

    result = result.slice(0, span.start) + fake + result.slice(span.end);

    if (vault) {
      vault.addEntry(span.text, fake, span.category);
    }
  }

  return { disguisedNote: result, entries };
}
