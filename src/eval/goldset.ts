// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { faker } from "@faker-js/faker";
import type { GoldLabel, HipaaCategory, PhiSpan } from "../types.js";

interface PlaceholderSpec {
  key: string;
  category: HipaaCategory;
  tier: "easy" | "contextual" | "obfuscated";
  generator: () => string;
}

const POOL: PlaceholderSpec[] = [
  { key: "{{NAME_TITLED}}", category: "NAME", tier: "easy", generator: () => `Dr. ${faker.person.fullName()}` },
  { key: "{{NAME_CONTEXT}}", category: "NAME", tier: "contextual", generator: () => faker.person.firstName() },
  { key: "{{NAME_OBF}}", category: "NAME", tier: "obfuscated", generator: () => faker.person.firstName().slice(0, 2) + "." + faker.person.lastName().slice(0, 1) },
  { key: "{{DATE}}", category: "DATE", tier: "easy", generator: () => faker.date.birthdate().toLocaleDateString("en-US") },
  { key: "{{DATE_OBF}}", category: "DATE", tier: "obfuscated", generator: () => "DOB three-fourteen-seventy-two" },
  { key: "{{SSN}}", category: "SSN", tier: "easy", generator: () => `${faker.string.numeric(3)}-${faker.string.numeric(2)}-${faker.string.numeric(4)}` },
  { key: "{{PHONE}}", category: "PHONE", tier: "easy", generator: () => faker.phone.number({ style: "national" }) },
  { key: "{{EMAIL}}", category: "EMAIL", tier: "easy", generator: () => faker.internet.email() },
  { key: "{{MRN}}", category: "MRN", tier: "easy", generator: () => `MRN${faker.string.alphanumeric(6).toUpperCase()}` },
  { key: "{{GEO}}", category: "GEO", tier: "easy", generator: () => faker.location.zipCode() },
  { key: "{{URL}}", category: "URL", tier: "easy", generator: () => faker.internet.url() },
  { key: "{{IP}}", category: "IP", tier: "easy", generator: () => faker.internet.ip() },
  { key: "{{HEALTH_PLAN}}", category: "HEALTH_PLAN", tier: "easy", generator: () => `Policy#${faker.string.alphanumeric(10).toUpperCase()}` },
  { key: "{{ACCOUNT}}", category: "ACCOUNT", tier: "easy", generator: () => `Acct#${faker.string.alphanumeric(8).toUpperCase()}` },
  { key: "{{LICENSE}}", category: "LICENSE", tier: "easy", generator: () => `License#${faker.string.alphanumeric(8).toUpperCase()}` },
  { key: "{{DEVICE}}", category: "DEVICE", tier: "easy", generator: () => `Serial#${faker.string.alphanumeric(10).toUpperCase()}` },
  { key: "{{OTHER_ID}}", category: "OTHER_ID", tier: "easy", generator: () => `ID#${faker.string.alphanumeric(8).toUpperCase()}` },
];

function loadTemplates(templatesDir: string): string[] {
  return readdirSync(templatesDir)
    .filter((f) => f.endsWith(".txt"))
    .map((f) => readFileSync(join(templatesDir, f), "utf8"));
}

function pickPlaceholders(seed: number): PlaceholderSpec[] {
  faker.seed(seed);
  const easy = POOL.filter((p) => p.tier === "easy");
  const contextual = POOL.filter((p) => p.tier === "contextual");
  const obfuscated = POOL.filter((p) => p.tier === "obfuscated");

  const picks: PlaceholderSpec[] = [];
  const easyCount = 6;
  const ctxCount = 2;
  const obfCount = 1;

  for (let i = 0; i < easyCount; i++) picks.push(easy[i % easy.length]);
  for (let i = 0; i < ctxCount; i++) picks.push(contextual[i % contextual.length]);
  for (let i = 0; i < obfCount; i++) picks.push(obfuscated[i % obfuscated.length]);
  return picks;
}

function renderNote(template: string, placeholders: PlaceholderSpec[]): { note: string; spans: PhiSpan[] } {
  const usedKeys = new Set<string>();
  const replacements: Array<{ start: number; end: number; value: string; category: HipaaCategory }> = [];

  for (const ph of placeholders) {
    if (!template.includes(ph.key) || usedKeys.has(ph.key)) continue;
    usedKeys.add(ph.key);
    const idx = template.indexOf(ph.key);
    if (idx === -1) continue;
    replacements.push({
      start: idx,
      end: idx + ph.key.length,
      value: ph.generator(),
      category: ph.category,
    });
  }

  replacements.sort((a, b) => a.start - b.start);

  let note = "";
  let cursor = 0;
  const spans: PhiSpan[] = [];

  for (const rep of replacements) {
    note += template.slice(cursor, rep.start);
    const start = note.length;
    note += rep.value;
    spans.push({
      start,
      end: start + rep.value.length,
      text: rep.value,
      category: rep.category,
      source: "regex",
    });
    cursor = rep.end;
  }
  note += template.slice(cursor);

  return { note, spans };
}

export function generateGoldSet(
  count: number,
  outDir: string,
  templatesDir = "./data/templates",
): void {
  const templates = loadTemplates(templatesDir);
  if (templates.length === 0) {
    throw new Error(`No templates found in ${templatesDir}`);
  }

  const notesDir = join(outDir, "notes");
  const labelsDir = join(outDir, "labels");
  mkdirSync(notesDir, { recursive: true });
  mkdirSync(labelsDir, { recursive: true });

  for (let i = 0; i < count; i++) {
    const noteId = `note_${String(i).padStart(4, "0")}`;
    const template = templates[i % templates.length];
    const placeholders = pickPlaceholders(i + 1);
    const { note, spans } = renderNote(template, placeholders);

    writeFileSync(join(notesDir, `${noteId}.txt`), note);
    const label: GoldLabel = { noteId, spans };
    writeFileSync(join(labelsDir, `${noteId}.json`), JSON.stringify(label, null, 2));
  }
}

export function loadGoldLabels(labelsDir: string): GoldLabel[] {
  return readdirSync(labelsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(labelsDir, f), "utf8")) as GoldLabel);
}
