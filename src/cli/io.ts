import { writeFileSync } from "node:fs";

export function writeFile(filePath: string, content: string): void {
  writeFileSync(filePath, content, "utf8");
}
