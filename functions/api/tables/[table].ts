// ------------------------------------------------------------------
// Renaissance — generic D1 CRUD handler.
// Client sends { op, filters, data, order, limit, single }; we execute
// against the D1 binding ('DB') with parameterised statements only.
// Tables and columns are whitelist-gated (no injection surface).
// Single-user app — Cloudflare Access protects this from outside.
// ------------------------------------------------------------------

const TABLES: Record<string, string[]> = {
  profiles: ['id', 'username', 'xp', 'level', 'streak', 'max_streak', 'streak_freeze', 'created_at'],
  habits: ['id', 'user_id', 'name', 'active', 'created_at'],
  habit_logs: ['id', 'user_id', 'habit_id', 'date', 'created_at'],
  water_logs: ['id', 'user_id', 'date', 'amount_ml', 'created_at'],
  mood_logs: ['id', 'user_id', 'date', 'mood_score', 'note', 'created_at'],
  tasks: ['id', 'user_id', 'title', 'completed', 'priority', 'due_date', 'created_at'],
  time_logs: ['id', 'user_id', 'date', 'category', 'domain', 'minutes', 'created_at'],
  workout_logs: ['id', 'user_id', 'date', 'type', 'activity', 'muscle_groups', 'duration', 'notes', 'created_at'],
  health_logs: ['id', 'user_id', 'date', 'type', 'value', 'created_at'],
  quest_progress: ['id', 'user_id', 'date', 'quest_id', 'progress', 'target', 'completed', 'created_at'],
  focus_sessions: ['id', 'user_id', 'date', 'minutes', 'created_at'],
  leads: ['id', 'user_id', 'business_name', 'contact_name', 'phone', 'email', 'notes', 'status', 'source', 'created_at', 'updated_at'],
  call_logs: ['id', 'user_id', 'lead_id', 'outcome', 'notes', 'created_at'],
  xp_logs: ['id', 'user_id', 'amount', 'source', 'created_at'],
  outreach: ['id', 'date', 'channel', 'count', 'notes', 'created_at'],
  demo: ['id', 'date', 'business', 'status', 'outcome', 'notes', 'created_at'],
  deal: ['id', 'date', 'closed_date', 'client', 'amount_gbp', 'kind', 'status', 'banked_at', 'notes', 'created_at'],
  cert_progress: ['id', 'date', 'cert_name', 'hours', 'modules_done', 'modules_total', 'notes', 'created_at'],
  job_app: ['id', 'company', 'role', 'applied_at', 'status', 'gate_note', 'follow_up_due', 'created_at'],
}

const OPS = { eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=', in: 'IN' }

function clean<T>(value: T, allowed: string[]): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const out: any = {}
    for (const [k, v] of Object.entries(value as any)) {
      if (allowed.includes(k)) out[k] = v
    }
    return out
  }
  return value
}

export async function onRequest(context: any) {
  const { env, params } = context
  const table: string = params?.table
  const db = env?.DB
  if (!db) return json({ data: null, error: { message: 'D1 binding not configured' } }, 500)

  const allowed = TABLES[table]
  if (!allowed) return json({ data: null, error: { message: `Unknown table: ${table}` } }, 400)

  const body = await context.request.json().catch(() => ({}))
  const { op, filters = [], data = null, order, limit, single } = body

  try {
    if (op === 'SELECT') {
      return await runSelect(db, table, allowed, filters, order, limit, single)
    }
    if (op === 'INSERT') {
      return await runInsert(db, table, allowed, data, single)
    }
    if (op === 'UPDATE') {
      return await runUpdate(db, table, allowed, data, filters)
    }
    if (op === 'DELETE') {
      return await runDelete(db, table, allowed, filters)
    }
    return json({ data: null, error: { message: `Unsupported op: ${op}` } }, 400)
  } catch (err: any) {
    return json({ data: null, error: { message: String(err?.message || err) } }, 500)
  }
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function where(filters: any[], allowed: string[]): { sql: string; binds: any[] } {
  const parts: string[] = []
  const binds: any[] = []
  for (const f of filters || []) {
    if (!f || !allowed.includes(f.col) || !OPS[f.op]) continue
    if (f.op === 'in') {
      const vals = Array.isArray(f.value) ? f.value : [f.value]
      if (vals.length === 0) continue
      parts.push(`${f.col} IN (${vals.map(() => '?').join(',')})`)
      binds.push(...vals)
    } else {
      parts.push(`${f.col} ${OPS[f.op]} ?`)
      binds.push(f.value)
    }
  }
  return { sql: parts.length ? 'WHERE ' + parts.join(' AND ') : '', binds }
}

function orderSql(order: any): string {
  if (!order || !order.col) return ''
  const dir = order.direction === 'desc' ? 'DESC' : 'ASC'
  return `ORDER BY ${order.col} ${dir}`
}

async function runSelect(db: any, table: string, allowed: string[], filters: any[], order: any, limit: number, single: boolean) {
  const w = where(filters, allowed)
  let sql = `SELECT * FROM ${table} ${w.sql} ${orderSql(order)}`
  const binds = [...w.binds]
  const rows: any[] = []
  if (limit && limit > 0) {
    sql += ' LIMIT ?'
    binds.push(limit)
  }
  const stmt = db.prepare(sql).bind(...binds)
  if (single) {
    const row = await stmt.first()
    return json({ data: row ?? null, error: null })
  }
  const { results } = await stmt.all()
  return json({ data: results ?? [], error: null })
}

async function runInsert(db: any, table: string, allowed: string[], data: any, single: boolean) {
  const entries = Array.isArray(data) ? data : [data]
  for (const entry of entries) {
    const row = clean(entry ?? {}, allowed)
    const cols = Object.keys(row)
    const binds = cols.map((c) => (row[c] === undefined ? null : row[c]))
    const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
    await db.prepare(sql).bind(...binds).run()
  }
  const { results } = await db.prepare(`SELECT * FROM ${table} ORDER BY id DESC LIMIT ${entries.length}`).all()
  const inserted = [...results].reverse()
  return json({ data: single ? inserted[0] ?? null : inserted, error: null })
}

async function runUpdate(db: any, table: string, allowed: string[], data: any, filters: any[]) {
  const row = clean(data ?? {}, allowed)
  const cols = Object.keys(row)
  if (!cols.length) return json({ data: null, error: { message: 'No updateable columns' } }, 400)
  const w = where(filters, allowed)
  const sql = `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} ${w.sql}`
  const binds = [...cols.map((c) => (row[c] === undefined ? null : row[c])), ...w.binds]
  await db.prepare(sql).bind(...binds).run()
  return json({ data: null, error: null })
}

async function runDelete(db: any, table: string, allowed: string[], filters: any[]) {
  const w = where(filters, allowed)
  if (!w.sql) return json({ data: null, error: { message: 'Delete requires a filter' } }, 400)
  await db.prepare(`DELETE FROM ${table} ${w.sql}`).bind(...w.binds).run()
  return json({ data: null, error: null })
}