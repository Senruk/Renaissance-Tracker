export interface SupabaseResult<T = any> {
  data: T | null
  error: { message: string } | null
}

export interface SupabaseQueryBuilder {
  select(...cols: string[]): this
  insert(data: any | any[]): this
  update(data: any): this
  delete(): this
  eq(col: string, val: any): this
  neq(col: string, val: any): this
  in(col: string, vals: any[]): this
  gt(col: string, val: any): this
  gte(col: string, val: any): this
  lt(col: string, val: any): this
  lte(col: string, val: any): this
  order(col: string, opts?: { ascending?: boolean }): this
  limit(n: number): this
  single(): this
  then<TResult1 = SupabaseResult, TResult2 = never>(
    onfulfilled?: ((v: SupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((r: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>
}

export interface SupabaseClient {
  from(table: string): SupabaseQueryBuilder
  engine?: 'cloud' | 'local' | 'checking'
}
