import Anthropic from "@anthropic-ai/sdk";

// Reasoning / generation model: resume parse, tailored resume/cover letter,
// outreach, match reasons.
export const CLAUDE_MODEL = "claude-sonnet-4-6";

export function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Run a single-turn Claude completion and return the concatenated text.
export async function anthropic(params: {
  user: string;
  system?: string;
  maxTokens?: number;
}): Promise<string> {
  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: params.maxTokens ?? 1024,
    ...(params.system ? { system: params.system } : {}),
    messages: [{ role: "user", content: params.user }],
  });
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}
