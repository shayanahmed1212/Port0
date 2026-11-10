import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  compareByteOrder,
  computeHash,
  normalizeLF,
  sha256Hex,
} from "../src/core/serializer";

describe("serializer", () => {
  it("sorts object keys and appends a newline", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(
      '{\n  "a": 2,\n  "b": 1\n}\n',
    );
  });

  it("sorts arrays of file objects by UTF-8 path order", () => {
    const value = {
      status: [
        { path: "b.ts", state: "M" },
        { path: "a.ts", state: "A" },
      ],
    };
    expect(canonicalJson(value)).toContain(
      '"path": "a.ts"',
    );
    expect(canonicalJson(value).indexOf('"a.ts"')).toBeLessThan(
      canonicalJson(value).indexOf('"b.ts"'),
    );
  });

  it("compares UTF-8 byte order", () => {
    expect(compareByteOrder("a", "b")).toBeLessThan(0);
    expect(compareByteOrder("b", "a")).toBeGreaterThan(0);
    expect(compareByteOrder("same", "same")).toBe(0);
  });

  it("hashes deterministically", async () => {
    const left = await sha256Hex("abc");
    const right = await sha256Hex("abc");
    expect(left).toBe(right);
    expect(left).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ignores contentHash when computing the packet hash", async () => {
    const base = { schemaVersion: "1", intent: "x" };
    const first = await computeHash({ ...base, contentHash: "a".repeat(64) });
    const second = await computeHash({ ...base, contentHash: "b".repeat(64) });
    expect(first).toBe(second);
  });

  it("normalizes CRLF to LF", () => {
    expect(normalizeLF("a\r\nb\rc\n")).toBe("a\nb\nc\n");
  });
});
