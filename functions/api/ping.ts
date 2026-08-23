export const config = { runtime: 'edge_compatible' }

export async function onRequest(context: any) {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  })
}