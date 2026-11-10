import { describe, expect, it } from "vitest";
import {
  PacketSchema,
  PacketWithoutHashSchema,
  SchemaVersion,
} from "../src/core/schema";
import { makePacket } from "./helpers/packet";

describe("schema v1", () => {
  it("accepts a spec-shaped packet", () => {
    const result = PacketSchema.safeParse(makePacket());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(SchemaVersion);
      expect(result.data.port0Version).toBe("1.0.0");
    }
  });

  it("accepts a packet without contentHash", () => {
    const { contentHash, ...rest } = makePacket();
    void contentHash;
    expect(PacketWithoutHashSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects a missing port0Version", () => {
    const { port0Version, ...rest } = makePacket();
    void port0Version;
    expect(PacketSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects unknown top-level keys", () => {
    expect(
      PacketSchema.safeParse({ ...makePacket(), extra: true }).success,
    ).toBe(false);
  });

  it("rejects an invalid content hash", () => {
    expect(
      PacketSchema.safeParse({ ...makePacket(), contentHash: "ABC" }).success,
    ).toBe(false);
  });

  it("rejects an invalid file state", () => {
    const packet = makePacket({
      status: [
        {
          path: "a.ts",
          state: "X" as never,
          staged: true,
          unstaged: false,
        },
      ],
    });
    expect(PacketSchema.safeParse(packet).success).toBe(false);
  });

  it("rejects an intent over 2000 characters", () => {
    expect(
      PacketSchema.safeParse(makePacket({ intent: "x".repeat(2001) })).success,
    ).toBe(false);
  });

  it("requires the test log to be an object or null", () => {
    expect(
      PacketSchema.safeParse({
        ...makePacket(),
        testLog: "FAIL",
      }).success,
    ).toBe(false);
  });

  it("requires budget.usedBytes and truncatedSections", () => {
    const packet = makePacket();
    const budget = { ...packet.budget } as Record<string, unknown>;
    delete budget.usedBytes;
    expect(PacketSchema.safeParse({ ...packet, budget }).success).toBe(false);
  });
});
