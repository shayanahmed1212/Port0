const encoder = new TextEncoder();

export function compareByteOrder(a: string, b: string): number {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = left[index]! - right[index]!;
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const sorted =
      value.length > 0 &&
      value.every(
        (item) => isPlainObject(item) && typeof item.path === "string",
      )
        ? [...value].sort((a, b) =>
            compareByteOrder(
              (a as Record<string, unknown>).path as string,
              (b as Record<string, unknown>).path as string,
            ),
          )
        : value;
    return sorted.map(sortValue);
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortValue(value[key]);
    }
    return out;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

export async function sha256Hex(text: string): Promise<string> {
  const data = encoder.encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeHash(packet: unknown): Promise<string> {
  const clone = isPlainObject(packet) ? { ...packet } : packet;
  if (isPlainObject(clone)) {
    delete clone.contentHash;
  }
  return sha256Hex(canonicalJson(clone));
}

export function normalizeLF(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function byteLength(text: string): number {
  return encoder.encode(text).length;
}
