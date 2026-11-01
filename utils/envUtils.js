/**
 * Minimal .env parser/stringifier — avoids external deps.
 */

/**
 * Parse a .env string into a key→value object.
 * Lines starting with # are comments and are preserved as metadata but not returned.
 */
export function parse(raw = '') {
  const result = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) result[key] = val;
  }
  return result;
}

/**
 * Serialize a key→value object back to a .env string.
 */
export function stringify(obj = {}) {
  return Object.entries(obj)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n';
}

