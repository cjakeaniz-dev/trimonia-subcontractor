import { currentActor } from "@/lib/session";
import { receiptLink } from "@/lib/storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentActor();
  if (!actor) return new Response(null, { status: 401 });
  const url = await receiptLink(actor, (await params).id, new URL(request.url).searchParams.get("preview") === "1");
  if (!url) return new Response(null, { status: 404 });
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
