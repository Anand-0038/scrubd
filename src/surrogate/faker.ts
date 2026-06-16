// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { faker } from "@faker-js/faker";
import type { HipaaCategory, PhiSpan } from "../types.js";
import { DATE_SHIFT_DAYS } from "../config.js";

const noteDateOffsets = new WeakMap<object, number>();

export function setNoteDateOffset(noteKey: object, offsetDays: number): void {
  noteDateOffsets.set(noteKey, offsetDays);
}

export function getNoteDateOffset(noteKey: object): number {
  if (!noteDateOffsets.has(noteKey)) {
    noteDateOffsets.set(noteKey, DATE_SHIFT_DAYS);
  }
  return noteDateOffsets.get(noteKey)!;
}

function seedFromReal(real: string): number {
  const hash = createHash("sha256").update(real).digest();
  return hash.readUInt32BE(0);
}

function seededFaker(real: string): typeof faker {
  const seed = seedFromReal(real);
  const f = faker;
  f.seed(seed);
  return f;
}

function shiftDate(real: string, offsetDays: number): string {
  const slash = real.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slash) {
    const d = new Date(`${slash[3]}-${slash[1]}-${slash[2]}`);
    d.setDate(d.getDate() + offsetDays);
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
  }
  return seededFaker(real).date.anytime().toLocaleDateString("en-US");
}

export function generateSurrogate(
  span: PhiSpan,
  noteKey: object = {},
): string {
  const f = seededFaker(span.text);
  const offset = getNoteDateOffset(noteKey);

  switch (span.category) {
    case "NAME":
      return f.person.fullName();
    case "GEO":
      return f.location.zipCode();
    case "DATE":
      return shiftDate(span.text, offset);
    case "PHONE":
      return f.phone.number({ style: "national" });
    case "FAX":
      return `fax: ${f.phone.number({ style: "national" })}`;
    case "EMAIL":
      return f.internet.email();
    case "SSN": {
      const a = f.string.numeric(3);
      const b = f.string.numeric(2);
      const c = f.string.numeric(4);
      return `${a}-${b}-${c}`;
    }
    case "MRN":
      return `MRN${f.string.alphanumeric(6).toUpperCase()}`;
    case "HEALTH_PLAN":
      return `Policy#${f.string.alphanumeric(10).toUpperCase()}`;
    case "ACCOUNT":
      return `Acct#${f.string.alphanumeric(8).toUpperCase()}`;
    case "LICENSE":
      return `License#${f.string.alphanumeric(8).toUpperCase()}`;
    case "VEHICLE":
      return f.vehicle.vin();
    case "DEVICE":
      return `Serial#${f.string.alphanumeric(10).toUpperCase()}`;
    case "URL":
      return f.internet.url();
    case "IP":
      return f.internet.ip();
    case "BIOMETRIC":
      return "biometric identifier";
    case "PHOTO":
      return "clinical photograph";
    case "OTHER_ID":
      return `ID#${f.string.alphanumeric(8).toUpperCase()}`;
    default:
      return f.string.alphanumeric(8);
  }
}

export function generateSurrogatesForSpans(
  spans: PhiSpan[],
  noteKey: object = {},
): Map<string, string> {
  const map = new Map<string, string>();
  for (const span of spans) {
    if (!map.has(span.text)) {
      map.set(span.text, generateSurrogate(span, noteKey));
    }
  }
  return map;
}
