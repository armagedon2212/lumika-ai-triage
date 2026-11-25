import { getOrder } from "@/lib/orders";

/** Udawane API sklepu: GET /api/orders/LM-10022 */
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  const order = getOrder(id);
  if (!order) return Response.json({ error: "Nie znaleziono zamówienia." }, { status: 404 });
  return Response.json(order);
}
