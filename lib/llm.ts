import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { TAXONOMY } from "./taxonomy";
import type { CategorySlug, ClassifyResult, ExtractResult, Letter } from "./types";

const MODEL = "claude-sonnet-5";

const SLUGS = TAXONOMY.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];

const ClassifySchema = z.object({
  category: z.enum(SLUGS),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

const ExtractSchema = z.object({
  claimantName: z.string().nullable(),
  dob: z.string().nullable(),
  ssnLast4: z.string().nullable(),
  docDate: z.string().nullable(),
});

function client(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

const CATEGORY_MENU = TAXONOMY.map((c) => `- ${c.slug}: ${c.promptHint}`).join("\n");

export interface LlmCall<T> {
  result: T;
  tokens: { input: number; output: number };
}

export async function classify(letter: Letter): Promise<LlmCall<ClassifyResult>> {
  const msg = await client().messages.parse({
    model: MODEL,
    max_tokens: 320,
    thinking: { type: "disabled" },
    output_config: { format: zodOutputFormat(ClassifySchema) },
    messages: [
      {
        role: "user",
        content: `You sort incoming disability-law mail into one category. Categories:\n${CATEGORY_MENU}\n\nReturn the single best category, your confidence (0 to 1), and a one-sentence rationale. If the letter is vague or fits nothing well, use "other" with low confidence.\n\nLetter:\n"""\n${letter.bodyText}\n"""`,
      },
    ],
  });
  return { result: msg.parsed_output as ClassifyResult, tokens: usage(msg) };
}

export async function extract(letter: Letter): Promise<LlmCall<ExtractResult>> {
  const msg = await client().messages.parse({
    model: MODEL,
    max_tokens: 300,
    thinking: { type: "disabled" },
    output_config: { format: zodOutputFormat(ExtractSchema) },
    messages: [
      {
        role: "user",
        content: `Extract identifiers from this disability-law letter. Return the claimant's full name exactly as written (do not correct apparent typos, they matter downstream), date of birth as YYYY-MM-DD if present, the last 4 of any SSN or claim number if present, and the document date as YYYY-MM-DD. Use null for anything absent.\n\nLetter:\n"""\n${letter.bodyText}\n"""`,
      },
    ],
  });
  return { result: msg.parsed_output as ExtractResult, tokens: usage(msg) };
}

function usage(msg: { usage?: { input_tokens?: number; output_tokens?: number } }) {
  return {
    input: msg.usage?.input_tokens ?? 0,
    output: msg.usage?.output_tokens ?? 0,
  };
}
