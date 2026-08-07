import Groq from "groq-sdk";

// ── Primary and fallback Groq clients ──────────────────────────────────────
const primaryKey   = process.env.GROQ_API_KEY;
const fallbackKey1 = process.env.GROQ_API_KEY_1;
const fallbackKey2 = process.env.GROQ_API_KEY_2;

if (!primaryKey && !fallbackKey1 && !fallbackKey2) {
  console.warn("No Groq API key found. Set GROQ_API_KEY, GROQ_API_KEY_1, or GROQ_API_KEY_2 in environment.");
}

const client1 = primaryKey   ? new Groq({ apiKey: primaryKey })   : new Groq({ apiKey: 'placeholder-key' });
const client2 = fallbackKey1 ? new Groq({ apiKey: fallbackKey1 }) : null;
const client3 = fallbackKey2 ? new Groq({ apiKey: fallbackKey2 }) : null;

// ── Legacy export for backward compatibility ───────────────────────────────
// Used in files that import `groq` directly. Falls back in order of availability.
export const groq = (client1 ?? client2 ?? client3)!;

// ── Smart call wrapper with automatic fallback on 429 ─────────────────────
/**
 * Calls Groq API with automatic key fallback.
 * If the primary key hits a 429 (rate limit / daily token exhausted),
 * it transparently retries the SAME request with the fallback key.
 * If both are rate-limited, throws the last error.
 */
export async function groqCall(
  params: Parameters<Groq["chat"]["completions"]["create"]>[0]
): Promise<Groq.Chat.Completions.ChatCompletion> {
  const clients: Array<{ client: Groq; label: string }> = [];

  if (client1) clients.push({ client: client1, label: "primary"    });
  if (client2) clients.push({ client: client2, label: "fallback-1" });
  if (client3) clients.push({ client: client3, label: "fallback-2" });

  let lastError: any;

  for (const { client, label } of clients) {
    try {
      const result = await client.chat.completions.create(params);
      return result as Groq.Chat.Completions.ChatCompletion;
    } catch (err: any) {
      const status = err?.status ?? err?.statusCode;
      if (status === 429) {
        // Rate limit on this key — try next key
        console.warn(`[Groq] ${label} key rate-limited (429). Trying next key...`);
        lastError = err;
        continue;
      }
      // Non-429 error — throw immediately
      throw err;
    }
  }

  // All keys exhausted
  const msg: string = lastError?.error?.error?.message || lastError?.message || '';
  const mins = msg.match(/in (\d+)m/)?.[1];
  const waitStr = mins ? ` Please try again in ${mins} minute${mins === '1' ? '' : 's'}.` : ' Please try again later.';
  const friendlyError = new Error(
    `AI daily token limit reached on all API keys.${waitStr}`
  );
  (friendlyError as any).status = 429;
  throw friendlyError;
}
