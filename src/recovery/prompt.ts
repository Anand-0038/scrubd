// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import type { HipaaCategory, PhiSpan } from "../types.js";

export function buildRecoveryPrompt(
  note: string,
  existingSpans: PhiSpan[],
): Array<{ role: string; content: string }> {
  const foundList =
    existingSpans.length === 0
      ? "none"
      : existingSpans
          .map((s) => `- "${s.text}" (${s.category})`)
          .join("\n");

  return [
    {
      role: "system",
      content:
        "You find PHI in clinical notes that regex missed. Output ONLY a JSON array " +
        '[{"text": string, "category": string, "approxIndex": number}]. ' +
        "Categories: NAME, GEO, DATE, PHONE, FAX, EMAIL, SSN, MRN, HEALTH_PLAN, " +
        "ACCOUNT, LICENSE, VEHICLE, DEVICE, URL, IP, BIOMETRIC, PHOTO, OTHER_ID. " +
        "List only ADDITIONAL PHI not already found.",
    },
    {
      role: "user",
      content:
        `Clinical note:\n${note}\n\n` +
        `Regex already found:\n${foundList}\n\n` +
        "List ADDITIONAL PHI as JSON array.",
    },
  ];
}

export function isHipaaCategory(v: unknown): v is HipaaCategory {
  return (
    typeof v === "string" &&
    [
      "NAME",
      "GEO",
      "DATE",
      "PHONE",
      "FAX",
      "EMAIL",
      "SSN",
      "MRN",
      "HEALTH_PLAN",
      "ACCOUNT",
      "LICENSE",
      "VEHICLE",
      "DEVICE",
      "URL",
      "IP",
      "BIOMETRIC",
      "PHOTO",
      "OTHER_ID",
    ].includes(v)
  );
}
