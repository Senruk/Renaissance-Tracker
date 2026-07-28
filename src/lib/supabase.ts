import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ohtcaqzgfzboscjdrbvp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9odGNhcXpnZnpib3NjamRyYnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDQ3ODgsImV4cCI6MjA5NjQyMDc4OH0.oqSkdBW5mDfaW8UODCbT9hzpGW2H1Fb76shfnALgqbg'

const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * Wraps a thenable PostgrestBuilder chain (returned by .insert, .select,
 * .update, .delete, .eq, .order, etc.) so that when it's awaited, any
 * Supabase error is logged to the console instead of silently disappearing.
 *
 * Recursively wraps chained methods so the entire chain is covered.
 */
function wrapChain(chain: any, context: string): any {
  if (!chain || typeof chain.then !== 'function') return chain

  return new Proxy(chain, {
    get(target, prop, receiver) {
      // Intercept .then() — what await calls
      if (prop === 'then') {
        return (resolve: any, reject?: any) => {
          target.then(
            (res: any) => {
              if (res?.error) console.error(`[DB] ${context}:`, res.error)
              resolve(res)
            },
            (err: any) => {
              console.error(`[DB] ${context} threw:`, err)
              if (reject) reject(err)
            },
          )
        }
      }

      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value

      return (...args: any[]) => {
        const next = value.apply(target, args)
        return wrapChain(next, `${context}.${String(prop)}`)
      }
    },
  })
}

/**
 * Wraps the result of supabase.from(table) so that every method
 * (insert, select, update, delete, upsert) returns an error-logging chain.
 */
function wrapFrom(builder: any, table: string): any {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value
      return (...args: any[]) => {
        const result = value.apply(target, args)
        if (result && typeof result.then === 'function') {
          return wrapChain(result, `from(${table}).${String(prop)}`)
        }
        return result
      }
    },
  })
}

// Replace .from() so all existing code gets error logging without import changes
const _from = _supabase.from.bind(_supabase)
_supabase.from = (table: string) => wrapFrom(_from(table), table)

export const supabase = _supabase
