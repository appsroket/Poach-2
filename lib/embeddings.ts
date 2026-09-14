// OpenAI text embeddings for pgvector matching.
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;

// Max characters sent to the model. text-embedding-3-small accepts ~8191
// tokens; ~8000 chars is a safe, cheap ceiling that avoids 400s on long text.
const MAX_INPUT_CHARS = 8000;

// Embed a string → a 1536-length vector. Throws a clear error on non-200.
export async function embed(text: string): Promise<number[]> {
  const input = (text ?? "").slice(0, MAX_INPUT_CHARS);

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `OpenAI embeddings request failed (${res.status} ${res.statusText}): ${detail}`
    );
  }

  const json = (await res.json()) as {
    data?: { embedding?: number[] }[];
  };
  const vec = json.data?.[0]?.embedding;

  if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMS) {
    throw new Error(
      `Unexpected embedding shape: expected ${EMBEDDING_DIMS} numbers, got ${vec?.length ?? "none"}`
    );
  }

  return vec;
}

// Format a vector for insertion into a Postgres/pgvector column: "[0.1,0.2,...]".
export function toPgVector(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
