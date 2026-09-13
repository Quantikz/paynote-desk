import { createFileRoute } from "@tanstack/react-router";
import { publishLiveShelf, reserveLiveShelf, shelfSnapshot } from "@/lib/market-server";
import { normalizeShop } from "@/lib/shop";

function cors(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export const Route = createFileRoute("/api/shelf")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: cors(request) }),
      GET: async ({ request }) => {
        const shelf = await shelfSnapshot();
        return Response.json(shelf, { headers: cors(request) });
      },
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as
          | { items?: Array<{ productId: string; qty: number }> }
          | null;
        const result = await reserveLiveShelf(body?.items ?? []);
        return Response.json(result, {
          status: result.ok ? 200 : 400,
          headers: cors(request),
        });
      },
      PUT: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          token?: string;
          products?: unknown;
          promos?: unknown;
          shop?: unknown;
        } | null;
        const { staffTokenValid } = await import("@/lib/staff-auth.server");
        if (!body?.token || !(await staffTokenValid(body.token))) {
          return Response.json(
            { ok: false, error: "Staff session expired. Unlock the desk again." },
            { status: 401, headers: cors(request) },
          );
        }
        if (!Array.isArray(body.products) || !Array.isArray(body.promos)) {
          return Response.json({ ok: false, error: "Invalid shop list." }, { status: 400, headers: cors(request) });
        }
        const result = await publishLiveShelf({
          products: body.products,
          promos: body.promos,
          shop: body.shop ? normalizeShop(body.shop) : undefined,
        });
        return Response.json(result, {
          status: result.ok ? 200 : 400,
          headers: cors(request),
        });
      },
    },
  },
});
