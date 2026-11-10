import { realpathSync } from "node:fs";
import path from "node:path";

export function resolveRoot(input: string): string {
  return realpathSync(input);
}

export function ensureInside(root: string, target: string): string {
  const resolved = path.resolve(root, target);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error("Path outside root");
  }
  return resolved;
}
