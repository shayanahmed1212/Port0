import {
  closeSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { EXIT, Port0Error } from "./errors.js";
import type { OmissionReason } from "../core/schema.js";
import { normalizeLF } from "../core/serializer.js";

export function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

export function resolveRoot(input: string): string {
  try {
    return realpathSync(input);
  } catch {
    throw new Port0Error(`Root does not exist: ${input}`, EXIT.ENVIRONMENT);
  }
}

export function ensureInside(root: string, target: string): string {
  const resolved = path.resolve(root, target);
  if (!isInside(root, resolved)) {
    throw new Port0Error(
      `Output path must stay inside the repository root: ${target}`,
      EXIT.USAGE,
    );
  }
  return resolved;
}

export interface SafeReadResult {
  text: string | null;
  reason?: OmissionReason;
  truncated?: boolean;
}

function cutUtf8(buffer: Buffer, maxBytes: number): Buffer {
  let end = Math.min(maxBytes, buffer.length);
  while (end > 0 && (buffer[end]! & 0xc0) === 0x80) end -= 1;
  return buffer.subarray(0, end);
}

function readPrefix(filePath: string, bytes: number): Buffer {
  const descriptor = openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const read = readSync(descriptor, buffer, 0, bytes, 0);
    return buffer.subarray(0, read);
  } finally {
    closeSync(descriptor);
  }
}

export function safeReadText(
  root: string,
  relativePath: string,
  maxBytes: number,
): SafeReadResult {
  const resolved = ensureInside(root, relativePath);

  let stats;
  try {
    stats = lstatSync(resolved);
  } catch {
    throw new Port0Error(`Could not read ${relativePath}`, EXIT.IO);
  }

  if (stats.isSymbolicLink()) {
    let target: string;
    try {
      target = realpathSync(resolved);
    } catch {
      return { text: null, reason: "symlink" };
    }
    if (!isInside(root, target)) {
      return { text: null, reason: "symlink" };
    }
    stats = statSync(target);
  }

  if (!stats.isFile()) {
    return { text: null, reason: "binary" };
  }

  const truncated = stats.size > maxBytes;
  let buffer: Buffer;
  try {
    buffer = truncated
      ? readPrefix(resolved, maxBytes + 8_192)
      : readFileSync(resolved);
  } catch {
    throw new Port0Error(`Could not read ${relativePath}`, EXIT.IO);
  }

  if (buffer.subarray(0, 8_192).includes(0)) {
    return { text: null, reason: "binary" };
  }

  if (truncated) {
    const prefix = cutUtf8(buffer, maxBytes).toString("utf8");
    return {
      text: `${normalizeLF(prefix)}\n[TRUNCATED: file content]\n`,
      truncated: true,
    };
  }

  return { text: normalizeLF(buffer.toString("utf8")), truncated: false };
}

export function safeReadAllText(root: string, relativePath: string): string {
  const resolved = ensureInside(root, relativePath);
  try {
    const real = realpathSync(resolved);
    if (!isInside(root, real)) {
      throw new Port0Error(
        `Refusing to read a path outside the repository: ${relativePath}`,
        EXIT.SECRET,
      );
    }
    return normalizeLF(readFileSync(real, "utf8"));
  } catch (error) {
    if (error instanceof Port0Error) throw error;
    throw new Port0Error(`Could not read ${relativePath}`, EXIT.IO);
  }
}
