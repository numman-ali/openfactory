// SPDX-License-Identifier: AGPL-3.0-only
export function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
export function generateApiKeyString(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `of-key-${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
export function getApiKeyPrefix(key: string): string {
  return key.replace("of-key-", "").slice(0, 8);
}
