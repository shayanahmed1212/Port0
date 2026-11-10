import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { EXIT, Port0Error } from "./errors.js";

export function writeFileAtomic(filePath: string, content: string): void {
  const directory = path.dirname(filePath);
  try {
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
    const temporary = path.join(
      directory,
      `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
    );
    writeFileSync(temporary, content, { encoding: "utf8" });
    renameSync(temporary, filePath);
  } catch (error) {
    if (error instanceof Port0Error) throw error;
    throw new Port0Error(`Could not write ${filePath}`, EXIT.IO);
  }
}

export function readFileText(filePath: string): string {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    throw new Port0Error(`Could not read ${filePath}`, EXIT.IO);
  }
}

export function resolveRealFile(filePath: string): string {
  try {
    return realpathSync(filePath);
  } catch {
    throw new Port0Error(`Could not resolve ${filePath}`, EXIT.IO);
  }
}

export function removeFile(filePath: string): void {
  try {
    rmSync(filePath, { force: true });
  } catch {
    // Best effort cleanup.
  }
}
