import OpenAI from "openai";

// text-embedding-3-small → 1536 dims, stored in pgvector.
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;

export function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Embed a single string. Implemented for real in Prompt 3.
export async function embed(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}
