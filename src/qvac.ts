// Copyright 2026 Scrubd Contributors
// SPDX-License-Identifier: Apache-2.0

import { completion, loadModel, unloadModel } from "@qvac/sdk";
import * as net from "node:net";
import { resolve } from "node:path";
import { DEFAULT_CTX_SIZE, DEFAULT_MODEL_PATH } from "./config.js";
import { logRun } from "./runlog.js";

export interface AskResult {
  content: string;
  thinking?: string;
  stopReason?: string;
}

let cachedModelId: string | null = null;
let cachedModelPath: string | null = null;
let offlineGuardActive = false;
const outboundConnections: string[] = [];
let originalSocketConnect: typeof net.Socket.prototype.connect | null = null;

export function enableOfflineGuard(): void {
  if (offlineGuardActive) return;
  offlineGuardActive = true;
  outboundConnections.length = 0;
  originalSocketConnect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (
    ...args: Parameters<typeof net.Socket.prototype.connect>
  ) {
    outboundConnections.push(JSON.stringify(args[0]));
    throw new Error(
      `Offline guard: blocked outbound socket connect to ${JSON.stringify(args[0])}`,
    );
  } as unknown as typeof net.Socket.prototype.connect;
}

export function disableOfflineGuard(): void {
  if (originalSocketConnect) {
    net.Socket.prototype.connect = originalSocketConnect;
    originalSocketConnect = null;
  }
  offlineGuardActive = false;
  outboundConnections.length = 0;
}

export function getOutboundConnections(): readonly string[] {
  return outboundConnections;
}

export async function ensureModel(modelPath = DEFAULT_MODEL_PATH): Promise<string> {
  if (cachedModelId && cachedModelPath === modelPath) {
    return cachedModelId;
  }
  const start = Date.now();
  const absolutePath = resolve(modelPath);
  const modelId = await loadModel({
    modelSrc: absolutePath,
    modelType: "llm",
    modelConfig: { ctx_size: DEFAULT_CTX_SIZE },
    onProgress: (p: number) => process.stderr.write(`load ${Math.round(p * 100)}%\r`),
  });
  logRun({
    phase: "load",
    modelId,
    detail: `loaded in ${Date.now() - start}ms from ${absolutePath}`,
  });
  cachedModelId = modelId;
  cachedModelPath = modelPath;
  return modelId;
}

export async function ask(
  history: Array<{ role: string; content: string }>,
  modelPath = DEFAULT_MODEL_PATH,
): Promise<AskResult> {
  const modelId = await ensureModel(modelPath);
  const promptChars = history.reduce((n, m) => n + m.content.length, 0);

  const run = completion({
    modelId,
    history,
    stream: true,
    captureThinking: true,
  });

  const final = await run.final;
  const content = final.contentText.trim();
  const thinking = final.thinkingText?.trim();
  const stopReason = final.stopReason;

  logRun({
    phase: "completion",
    modelId,
    promptChars,
    promptTokens: final.stats?.promptTokens,
    generatedTokens: final.stats?.generatedTokens,
    ttftMs: final.stats?.timeToFirstToken,
    tokensPerSec: final.stats?.tokensPerSecond,
    stopReason,
  });

  return { content, thinking, stopReason };
}

export function extractBalancedJson(text: string): string | null {
  let start = -1;
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{" || ch === "[") {
      if (stack.length === 0) start = i;
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      if (stack.length === 0) continue;
      const last = stack.pop();
      if ((ch === "}" && last !== "{") || (ch === "]" && last !== "[")) {
        return null;
      }
      if (stack.length === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function findValidJsonInText<T>(
  text: string,
  validate: (v: unknown) => v is T,
): T | null {
  let cursor = 0;
  while (cursor < text.length) {
    const block = extractBalancedJson(text.slice(cursor));
    if (!block) return null;
    const idx = text.indexOf(block, cursor);
    if (idx === -1) return null;
    try {
      const parsed: unknown = JSON.parse(block);
      if (validate(parsed)) return parsed;
    } catch {
      // skip unparseable balanced fragment and continue
    }
    cursor = idx + block.length;
  }
  return null;
}

export async function askJson<T>(
  history: Array<{ role: string; content: string }>,
  validate: (v: unknown) => v is T,
  modelPath = DEFAULT_MODEL_PATH,
): Promise<T | null> {
  const attempt = async (msgs: typeof history): Promise<T | null> => {
    const { content } = await ask(msgs, modelPath);
    return findValidJsonInText(content, validate);
  };

  const first = await attempt(history);
  if (first !== null) return first;

  const retry = await attempt([
    { role: "system", content: "Return ONLY valid JSON, no prose." },
    ...history,
  ]);
  if (retry === null) {
    logRun({ phase: "json-parse-fail", detail: "askJson returned empty after retry" });
  }
  return retry;
}

export async function shutdown(): Promise<void> {
  if (cachedModelId) {
    await unloadModel({ modelId: cachedModelId });
    logRun({ phase: "unload", modelId: cachedModelId });
    cachedModelId = null;
    cachedModelPath = null;
  }
}
