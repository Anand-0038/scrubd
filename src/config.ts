// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import type { HipaaCategory } from "./types.js";

export const DEFAULT_MODEL_PATH = "./models/medpsy-1.7b-q4_k_m-imat.gguf";
export const DEFAULT_CTX_SIZE = 4096;
export const DEFAULT_OUT_DIR = "./scrubd-out";
export const DEFAULT_VAULT_PATH = "./scrubd-out/vault.vault.json";
export const DATE_SHIFT_DAYS = 42;

export const HIPAA_CATEGORIES: HipaaCategory[] = [
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
];
