// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import type { HipaaCategory } from "../types.js";

export interface RegexMatcher {
  category: HipaaCategory;
  pattern: RegExp;
}

export const REGEX_MATCHERS: RegexMatcher[] = [
  {
    category: "SSN",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
  {
    category: "PHONE",
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  },
  {
    category: "FAX",
    pattern: /\bfax[:\s]+(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/gi,
  },
  {
    category: "EMAIL",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    category: "URL",
    pattern: /\bhttps?:\/\/[^\s<>"']+/gi,
  },
  {
    category: "IP",
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g,
  },
  {
    category: "GEO",
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
  },
  {
    category: "DATE",
    pattern:
      /\b(?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12]\d|3[01])[\/\-](?:19|20)\d{2}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+(?:19|20)\d{2}\b/gi,
  },
  {
    category: "DATE",
    pattern: /\b(?:9[0-9]|[1-9]\d{2,})\s+years?\s+old\b/gi,
  },
  {
    category: "MRN",
    pattern: /\b(?:MRN|Medical Record(?: Number)?)[#:\s]*[A-Z0-9]{5,12}\b/gi,
  },
  {
    category: "HEALTH_PLAN",
    pattern: /\b(?:Policy|Member|Health Plan|Insurance)[#:\s]*[A-Z0-9-]{6,20}\b/gi,
  },
  {
    category: "ACCOUNT",
    pattern: /\b(?:Account|Acct)[#:\s]*[A-Z0-9-]{5,15}\b/gi,
  },
  {
    category: "LICENSE",
    pattern: /\b(?:License|Lic|Cert(?:ificate)?)[#:\s]*[A-Z0-9-]{5,15}\b/gi,
  },
  {
    category: "VEHICLE",
    pattern: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
  },
  {
    category: "DEVICE",
    pattern: /\b(?:Device|Serial|S\/N)[#:\s]*[A-Z0-9-]{6,20}\b/gi,
  },
  {
    category: "BIOMETRIC",
    pattern: /\b(?:fingerprint|retina scan|voiceprint|biometric)\b/gi,
  },
  {
    category: "PHOTO",
    pattern: /\b(?:photo|photograph|facial image|headshot)\b/gi,
  },
  {
    category: "OTHER_ID",
    pattern: /\b(?:ID|Identifier)[#:\s]*[A-Z0-9-]{6,15}\b/gi,
  },
  {
    category: "NAME",
    pattern:
      /\b(?:Dr|Mr|Mrs|Ms|Prof)\.?\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)?\b/g,
  },
];

export function isVitalFalsePositive(text: string, match: string): boolean {
  if (/^\d{2,3}\/\d{2,3}$/.test(match)) return true;
  const ageMatch = match.match(/^(\d+)\s+years?\s+old$/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1], 10);
    if (age <= 89) return true;
  }
  if (/patient is \d+ years old/i.test(text) && parseInt(match, 10) <= 89) {
    return true;
  }
  return false;
}
