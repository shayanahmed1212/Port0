import { describe, it, expect } from "vitest";
import { canonicalJson, sha256Hex } from "../src/core/serializer";

describe("serializer", () => {
  it("sorts keys", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{\n  "a": 2,\n  "b": 1\n}\n');
  });
  it("hash deterministic", async () => {
    const h1 = await sha256Hex("abc");
    const h2 = await sha256Hex("abc");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
});
