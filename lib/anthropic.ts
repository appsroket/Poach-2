import Anthropic from "@anthropic-ai/sdk";

// Reasoning / generation model used for resume parsing, tailored resumes,
// cover letters, outreach, and match reasons.
export const CLAUDE_MODEL = "claude-sonnet-4-6";

// Lazily construct the Anthropic client so a build without the key still passes.
export function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}
