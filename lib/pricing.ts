// Anthropic list prices in USD per million tokens (per-MTok), current 2026-05.
// The session logs do not store per-message cost (costUSD is 0), so cost is
// ESTIMATED from token counts. Edit these rates to match your actual plan.

export interface Rates {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
}

// Opus 4.5+ list price is ~1/3 of the older Opus 4.0/4.1 rate, so the two
// generations are billed separately. Sonnet/Haiku use current-gen rates.
const RATES = {
  opus45: { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 },
  opus41: { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.5 },
  sonnet: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.3 },
  haiku: { input: 1, output: 5, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.1 },
} satisfies Record<string, Rates>;

function ratesFor(model: string): Rates {
  const m = model.toLowerCase();
  if (m.includes("haiku")) return RATES.haiku;
  if (m.includes("sonnet")) return RATES.sonnet;
  // Opus 4.5 and newer bill at the lower current-gen rate; 4.0/4.1 at the old.
  const v = m.match(/opus-(\d+)-(\d+)/);
  if (!v || +v[1] > 4 || (+v[1] === 4 && +v[2] >= 5)) return RATES.opus45;
  return RATES.opus41;
}

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
}

/** Estimated USD cost for a single assistant message's usage. */
export function costForUsage(model: string, u: Usage): number {
  const r = ratesFor(model);
  const input = u.input_tokens ?? 0;
  const output = u.output_tokens ?? 0;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const w5 = u.cache_creation?.ephemeral_5m_input_tokens;
  const w1 = u.cache_creation?.ephemeral_1h_input_tokens;
  // Fall back to the combined cache-creation count at the 5m rate when the
  // ephemeral breakdown is absent.
  const write5 = w5 ?? (w1 === undefined ? u.cache_creation_input_tokens ?? 0 : 0);
  const write1 = w1 ?? 0;
  return (
    (input * r.input +
      output * r.output +
      cacheRead * r.cacheRead +
      write5 * r.cacheWrite5m +
      write1 * r.cacheWrite1h) /
    1_000_000
  );
}
