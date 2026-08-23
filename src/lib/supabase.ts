import type { SupabaseResult, SupabaseClient } from './db-types'

// ============================================================
// Renaissance data client — local-first, D1-cloud-capable.
// ============================================================
// Reproduces the Supabase chainable API (select/eq/order/limit/
// insert/update/delete) so existing pages keep working untouched.
//
// ENGINE PRIORITY:
//   1. REMOTE  — POST /api/tables/{table} (Cloudflare Pages Functions → D1).
//                Used when the site/api is deployed and reachable.
//   2. LOCAL   — window.localStorage. Used when the API is unreachable
//                (local dev without wrangler, no creds yet, or offline).
//                The app is fully usable NOW in local mode; when D1 is
//                wired, local data can be exported and seeded up.
//
// DATASOURCE: 'cloud' | 'local' exposed for a UI indicator.

const LS_PREFIX = 'ren:'
const JSON_COLUMNS: Record<string, string[]> = { workout_logs: ['muscle_groups'] }

export type Filter = { col: string; op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in'; value: any }
export type Order = { col: string; direction: 'asc' | 'desc' }

let engine: 'cloud' | 'local' | 'checking' = 'checking'
let engineCheckPromise: Promise<'cloud' | 'local'> | null = null

function nowIso(): string {
  const d = new Date()
  return d.toISOString().replace('T', ' ').slice(0, 19)
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// ---------- localStorage engine ----------

function lsRead(table: string): any[] {
  try {
    const raw = localStorage.getItem(LS_PREFIX + table)
    const rows = raw ? JSON.parse(raw) : []
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}
function lsWrite(table: string, rows: any[]) {
  localStorage.setItem(LS_PREFIX + table, JSON.stringify(rows))
}
function pipe(row: any, table: string): any {
  // deserialize JSON columns on read
  const out = { ...row }
  for (const col of JSON_COLUMNS[table] ?? []) {
    if (typeof out[col] === 'string') {
      try { out[col] = JSON.parse(out[col]) } catch { out[col] = out[col] }
    }
  }
  return out
}
function stamp(row: any, table: string): any {
  const out: any = { ...row }
  for (const col of JSON_COLUMNS[table] ?? []) {
    if (Array.isArray(out[col])) out[col] = JSON.stringify(out[col])
  }
  return out
}
function matches(row: any, filters: Filter[]): boolean {
  return filters.every((f) => {
    const v = row[f.col]
    switch (f.op) {
      case 'eq': return v === f.value || String(v) === String(f.value)
      case 'neq': return v !== f.value
      case 'gt': return v > f.value
      case 'gte': return v >= f.value
      case 'lt': return v < f.value
      case 'lte': return v <= f.value
      case 'in': return Array.isArray(f.value) && f.value.includes(v)
      default: return true
    }
  })
}

async function execLocal(
  table: string,
  op: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  filters: Filter[],
  data: any,
  order?: Order,
  limit?: number,
  single?: boolean,
): Promise<SupabaseResult> {
  const rows = lsRead(table)
  if (op === 'INSERT') {
    const entries = Array.isArray(data) ? data : [data]
    const nextId = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1
    const inserted: any[] = []
    for (const entry of entries) {
      const row = { ...stamp(entry), user_id: entry.user_id ?? 'local' }
      if (row.id === undefined) row.id = nextId
      if (row.created_at === undefined) row.created_at = nowIso()
      rows.push(row)
      inserted.push(row)
      nextId + 1
    }
    lsWrite(table, rows)
    return { data: single ? inserted[0] ?? null : inserted, error: null }
  }
  if (op === 'SELECT') {
    let out = rows.filter((r) => matches(r, filters)).map((r) => pipe(r, table))
    if (order) {
      const dir = order.direction === 'desc' ? -1 : 1
      out = out.sort((a, b) => (a[order.col] > b[order.col] ? dir : a[order.col] < b[order.col] ? -dir : 0))
    }
    if (limit && limit > 0) out = out.slice(0, limit)
    if (single) return { data: out[0] ?? null, error: null }
    return { data: out, error: null }
  }
  if (op === 'UPDATE') {
    for (const r of rows) {
      if (matches(r, filters)) {
        const upd = stamp(data)
        for (const k of Object.keys(upd)) r[k] = upd[k]
      }
    }
    lsWrite(table, rows)
    return { data: null, error: null }
  }
  if (op === 'DELETE') {
    const kept = rows.filter((r) => !matches(r, filters))
    lsWrite(table, kept)
    return { data: null, error: null }
  }
  return { data: null, error: null }
}

// ---------- engine detection ----------

async function detectEngine(): Promise<'cloud' | 'local'> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    const res = await fetch('/api/ping', { signal: ctrl.signal })
    clearTimeout(t)
    if (res.ok) {
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('json')) return 'cloud'
    }
    return 'local'
  } catch {
    return 'local'
  }
}

async function execRemote(
  table: string,
  op: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  filters: Filter[],
  data: any,
  order?: Order,
  limit?: number,
  single?: boolean,
): Promise<SupabaseResult> {
  const res = await fetch(`/api/tables/${table}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ op, filters, data, order, limit, single }),
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

// ---------- chainable query builder ----------

type OpKind = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'

class Builder {
  private table: string
  private op: OpKind
  private filters: Filter[] = []
  private order?: Order
  private limitNb?: number
  private singleFlag = false
  private data: any = null

  constructor(table: string, op: OpKind = 'SELECT') {
    this.table = table
    this.op = op
  }

  toPromise(): Promise<SupabaseResult> {
    return (async () => {
      try {
        if (engine !== 'cloud') {
          if (!engineCheckPromise) engineCheckPromise = detectEngine()
          engine = await engineCheckPromise
        }
        if (engine === 'cloud') {
          return await execRemote(this.table, this.op, this.filters, this.data, this.order, this.limitNb, this.singleFlag)
        }
        return await execLocal(this.table, this.op, this.filters, this.data, this.order, this.limitNb, this.singleFlag)
      } catch (err: any) {
        console.error(`[DB] ${this.table}.${this.op} failed → local fallback:`, err)
        engine = 'local'
        return execLocal(this.table, this.op, this.filters, this.data, this.order, this.limitNb, this.singleFlag)
      }
    })()
  }

  then<TResult1 = SupabaseResult, TResult2 = never>(
    onfulfilled?: ((v: SupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((r: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.toPromise().then(onfulfilled, onrejected)
  }

  select(...cols: string[]) {
    this.op = 'SELECT'
    return this
  }
  insert(rows: any | any[]) {
    this.op = 'INSERT'
    this.data = rows
    return this
  }
  update(obj: any) {
    this.op = 'UPDATE'
    this.data = obj
    return this
  }
  delete() {
    this.op = 'DELETE'
    return this
  }
  eq(col: string, value: any) { this.filters.push({ col, op: 'eq', value }); return this }
  neq(col: string, value: any) { this.filters.push({ col, op: 'neq', value }); return this }
  in(col: string, values: any[]) { this.filters.push({ col, op: 'in', value: values }); return this }
  gt(col: string, value: any) { this.filters.push({ col, op: 'gt', value }); return this }
  gte(col: string, value: any) { this.filters.push({ col, op: 'gte', value }); return this }
  lt(col: string, value: any) { this.filters.push({ col, op: 'lt', value }); return this }
  lte(col: string, value: any) { this.filters.push({ col, op: 'lte', value }); return this }
  order(col: string, opts?: { ascending?: boolean }) {
    this.order = { col, direction: opts?.ascending === false ? 'desc' : 'asc' }
    return this
  }
  limit(n: number) { this.limitNb = n; return this }
  single() { this.singleFlag = true; return this }
}

// ---------- public client ----------

export interface RenaissanceClient extends SupabaseClient {}

export const supabase: SupabaseClient = {
  from(table: string) {
    return new Builder(table) as any
  },
  get engine() {
    return engine
  },
}

export { todayStr }