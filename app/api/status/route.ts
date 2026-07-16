import { peek } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// no API key means recorded-only and the live toggle stays hidden
export async function GET() {
  const liveEnabled = Boolean(process.env.ANTHROPIC_API_KEY);
  const { remaining, dailyCap } = peek();
  return Response.json({
    liveEnabled,
    remainingToday: liveEnabled ? remaining : 0,
    dailyCap,
  });
}
