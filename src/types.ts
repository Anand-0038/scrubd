// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

export type HipaaCategory =
  | "NAME"
  | "GEO"
  | "DATE"
  | "PHONE"
  | "FAX"
  | "EMAIL"
  | "SSN"
  | "MRN"
  | "HEALTH_PLAN"
  | "ACCOUNT"
  | "LICENSE"
  | "VEHICLE"
  | "DEVICE"
  | "URL"
  | "IP"
  | "BIOMETRIC"
  | "PHOTO"
  | "OTHER_ID";

export interface PhiSpan {
  start: number;
  end: number;
  text: string;
  category: HipaaCategory;
  source: "regex" | "medpsy";
  confidence?: number;
}

export interface SurrogateMapEntry {
  real: string;
  fake: string;
  category: HipaaCategory;
}

export interface Stage2Result {
  problems: string[];
  summary: string;
}

export interface CategoryScore {
  category: HipaaCategory | "OVERALL";
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface EvalResult {
  baseline: CategoryScore[];
  withMedPsy: CategoryScore[];
  delta: { precision: number; recall: number; f1: number };
}

export interface GoldLabel {
  noteId: string;
  spans: Array<{
    start: number;
    end: number;
    text: string;
    category: HipaaCategory;
  }>;
}
