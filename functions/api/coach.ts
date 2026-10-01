// ------------------------------------------------------------------
// AI coaching narrative over the muscle recovery board.
//
// The client always renders a deterministic summary first (see
// useCoachNarrative), then swaps in this if the model is reachable.
// No GROQ_API_KEY configured => empty result => local summary stands.
// ------------------------------------------------------------------

export const config = { runtime: 'edge_compatible' }

// Groq retires models without warning — llama-3.3-70b-versatile is gone — so
// fall back through the catalogue. Set GROQ_MODEL to pin one.
const FALLBACK_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
]

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM = `You are a concise strength coach. You are given a muscle recovery
board for one athlete. Write a short coaching note about what to train today
and why.

Return ONLY JSON: {"headline":"<max 6 words>","body":"<max 3 sentences>"}

Rules:
- Be specific: name the muscle groups the data says are ready
- Never claim a group is ready unless status is "ready"
- Be encouraging but not fluffy. No emojis, no exclamation marks
- If nothing is ready, suggest recovery work instead of training`

export async function onRequest(context: any) {
  const key = context?.env?.GROQ_API_KEY
  if (!key) {
    return json({ data: null, configured: false })
  }

  let board: unknown[] = []
  try {
    const body = await context.request.json()
    board = Array.isArray(body?.board) ? body.board.slice(0, 20) : []
  } catch {
    return json({ data: null, error: { message: 'Invalid JSON body' } }, 400)
  }

  if (board.length === 0) {
    return json({ data: { headline: 'Nothing logged yet', body: 'Log a workout and this becomes useful.' }, configured: true })
  }

  const models = context?.env?.GROQ_MODEL
    ? [context.env.GROQ_MODEL]
    : FALLBACK_MODELS

  for (const model of models) {
    let note: any | null = null
    try {
      note = await ask(key, model, board)
    } catch {
      continue
    }
    if (!note) continue
    return json({ data: { ...note, model }, configured: true })
  }

  // No model answered — client keeps its deterministic narrative.
  return json({ data: null, configured: true })
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Ask one model; returns {headline, body} or null if it can't be used. */
async function ask(key: string, model: string, board: unknown[]): Promise<any | null> {
  const upstream = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify({ recoveryBoard: board }) },
      ],
    }),
  })

  if (!upstream.ok) return null
  const payload = await upstream.json()
  const parsed = JSON.parse(payload?.choices?.[0]?.message?.content ?? '{}')
  const headline = String(parsed?.headline ?? '').slice(0, 80)
  const body = String(parsed?.body ?? '').slice(0, 400)
  return headline && body ? { headline, body } : null
}
