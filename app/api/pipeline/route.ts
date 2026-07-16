import lettersData from "@/data/letters.json";
import { runPipeline } from "@/lib/pipeline";
import { checkAndConsume } from "@/lib/ratelimit";
import type { Letter } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const LETTERS = lettersData as Letter[];

// letters are loaded by id, callers never send prompt text
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: "Live mode is not configured on this deployment." }, 503);
  }

  let letterId: string | undefined;
  try {
    ({ letterId } = await req.json());
  } catch {
    return json({ error: "Bad request body." }, 400);
  }

  const letter = LETTERS.find((l) => l.id === letterId);
  if (!letter) return json({ error: "Unknown letter." }, 404);

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const cap = checkAndConsume(ip);
  if (!cap.allowed) {
    return json({ error: cap.reason, remaining: cap.remaining }, 429);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runPipeline(letter)) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "pipeline error";
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              runId: "err",
              letterId: letter.id,
              mode: "live",
              stage: "error",
              status: "complete",
              ts: new Date().toISOString(),
              message: msg,
            }) + "\n",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
