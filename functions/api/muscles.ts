// ------------------------------------------------------------------
// AI muscle detection for exercises the local map doesn't know.
//
// Runs on Cloudflare Pages Functions so the API key never reaches the
// browser. Without a key configured we return an empty result and the
// client falls back to manual muscle selection — the feature degrades,
// it never breaks.
// ------------------------------------------------------------------

export const config = { runtime: 'edge_compatible' }

/**
 * Models are tried in order until one answers. Groq retires models without
 * much warning — llama-3.3-70b-versatile disappeared from the catalogue
 * entirely — so a single hardcoded id is not safe. Set GROQ_MODEL to pin one.
 */
const FALLBACK_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
]

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

const VALID = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'abs', 'quads', 'hamstrings', 'glutes', 'calves',
]

const SYSTEM = `You are a strength coach mapping exercises to muscle groups.
Return ONLY JSON of this exact shape:
{"results":[{"exercise":"<name as given>","primary":["..."],"secondary":["..."]}]}
Rules:
- primary = the muscle groups the movement mainly trains (1-2 usually)
- secondary = supporting groups (0-2)
- Only use these exact ids: ${VALID.join(', ')}
- Preserve the exercise name exactly as it was given
- If an exercise is not a real exercise, return it with empty arrays`

function sanitize(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  return list
    .map((m) => String(m).trim().toLowerCase())
    .filter((m) => VALID.includes(m))
}

export async function onRequest(context: any) {
  const key = context?.env?.GROQ_API_KEY
  if (!key) {
    return json({ data: { results: [], configured: false }, error: null })
  }

  let exercises: string[] = []
  try {
    const body = await context.request.json()
    exercises = (body?.exercises ?? []).filter((e: unknown) => typeof e === 'string' && e.trim()).slice(0, 25)
  } catch {
    return json({ data: null, error: { message: 'Invalid JSON body' } }, 400)
  }

  if (exercises.length === 0) {
    return json({ data: { results: [], configured: true }, error: null })
  }

  const models = context?.env?.GROQ_MODEL
    ? [context.env.GROQ_MODEL]
    : FALLBACK_MODELS

  for (const model of models) {
    let parsed: any | null = null
    try {
      parsed = await ask(key, model, exercises)
    } catch {
      continue
    }
    if (!parsed) continue

    return json({
      data: {
        configured: true,
        model,
        results: parsed.results.map((r: any) => ({
          exercise: String(r?.exercise ?? ''),
          primary: sanitize(r?.primary),
          secondary: sanitize(r?.secondary),
        })),
      },
      error: null,
    })
  }

  // Every model failed — degrade to manual selection rather than erroring.
  return json({ data: { results: [], configured: true }, error: null })
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Ask one model; returns the parsed JSON body or null if it can't be used. */
async function ask(key: string, model: string, exercises: string[]): Promise<any | null> {
  const upstream = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify({ exercises }) },
      ],
    }),
  })

  if (!upstream.ok) return null
  const payload = await upstream.json()
  const parsed = JSON.parse(payload?.choices?.[0]?.message?.content ?? '{}')
  return Array.isArray(parsed?.results) ? parsed : null
}
