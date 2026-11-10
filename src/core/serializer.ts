function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    // arrays of objects with path: sort by path if present
    if (value.length > 0 && value.every((v) => v && typeof v === "object" && !Array.isArray(v) && "path" in (v as Record<string, unknown>))) {
      return [...value]
        .sort((a, b) => {
          const pa = String((a as Record<string, unknown>).path);
          const pb = String((b as Record<string, unknown>).path);
          return pa < pb ? -1 : pa > pb ? 1 : 0;
        })
        .map(sortValue);
    }
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortValue(obj[key]);
    }
    return out;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  const sorted = sortValue(value);
  return JSON.stringify(sorted, null, 2) + "\n";
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeHash(packetWithoutHash: Record<string, unknown>): Promise<string> {
  const clone = { ...packetWithoutHash };
  delete clone.contentHash;
  const canonical = canonicalJson(clone);
  return sha256Hex(canonical);
}
