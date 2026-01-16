import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "../types.js";

let client: Anthropic | null = null;

export function getClient(config: Config): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }
  return client;
}

export async function generateWithClaude(
  config: Config,
  systemPrompt: string,
  userPrompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  const { maxTokens = 4096, temperature = 0.7 } = options;

  const anthropic = getClient(config);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textBlock.text;
}

export async function generateJsonWithClaude<T>(
  config: Config,
  systemPrompt: string,
  userPrompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<T> {
  const response = await generateWithClaude(
    config,
    systemPrompt +
      "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown code blocks, no explanations.",
    userPrompt,
    options
  );

  // Clean up response - remove markdown code blocks if present
  let jsonStr = response.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    throw new Error(`Failed to parse Claude response as JSON: ${jsonStr.slice(0, 200)}...`);
  }
}
