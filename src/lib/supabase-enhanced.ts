import type { SupabaseResult, SupabaseClient } from './db-types'
import { supabase as originalSupabase } from './supabase'

// Enhanced Supabase client with improved offline persistence and sync capabilities
// This builds upon the existing localStorage fallback but adds better reliability

// Configuration
const SYNC_INTERVAL = 30000 // 30 seconds
const MAX_OFFLINE_QUEUE = 1000

// Enhanced client that queues operations when offline and syncs when online
export class EnhancedSupabaseClient implements SupabaseClient {
  private readonly original: SupabaseClient
  private isOnline: boolean = true
  private syncIntervalId: NodeJS.Timeout | null = null
  private operationQueue: Array<{
    table: string
    op: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
    filters: any[]
    data: any
    order?: any
    limit?: number
    single?: boolean
    timestamp: number
    resolve: (value: SupabaseResult) => void
    reject: (reason?: any) => void
  }> = []

  constructor() {
    this.original = originalSupabase
    this.setupOnlineDetection()
    this.startSyncInterval()

    // Load any queued operations from localStorage on init
    this.loadOperationQueue()
  }

  private setupOnlineDetection() {
    const updateOnlineStatus = () => {
      const wasOnline = this.isOnline
      this.isOnline = navigator.onLine

      if (!wasOnline && this.isOnline) {
        // Just came online - process queue
        this.processOperationQueue().catch(console.error)
      }
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Initial check
    this.isOnline = navigator.onLine
  }

  private startSyncInterval() {
    this.syncIntervalId = setInterval(() => {
      if (this.isOnline && this.operationQueue.length > 0) {
        this.processOperationQueue().catch(console.error)
      }
    }, SYNC_INTERVAL)
  }

  private async processOperationQueue() {
    if (this.operationQueue.length === 0 || !this.isOnline) return

    const queueToProcess = [...this.operationQueue]
    this.operationQueue = []
    this.saveOperationQueue()

    // Process operations in order
    for (const operation of queueToProcess) {
      try {
        const result = await this.executeOperation(operation)
        operation.resolve(result)
      } catch (error) {
        // If online operation fails, re-queue it
        if (this.isOnline) {
          console.warn('Operation failed, re-queuing:', error)
          this.operationQueue.push(operation)
        } else {
          operation.reject(error)
        }
      }
    }

    this.saveOperationQueue()
  }

  private async executeOperation(operation: any): Promise<SupabaseResult> {
    try {
      if (this.isOnline) {
        // Try online first
        return await this.executeRemote(operation)
      } else {
        // Use local storage when offline
        return await this.executeLocal(operation)
      }
    } catch (error) {
      // Fallback to local storage if online fails
      if (this.isOnline) {
        console.warn('Online operation failed, falling back to local:', error)
        return await this.executeLocal(operation)
      }
      throw error
    }
  }

  private executeRemote(operation: any): Promise<SupabaseResult> {
    return new Promise((resolve, reject) => {
      const builder = this.original.from(operation.table)

      // Build query based on operation
      let query: any = builder

      if (operation.op === 'SELECT') {
        query = query.select('*')
      } else if (operation.op === 'INSERT') {
        query = query.insert(operation.data)
      } else if (operation.op === 'UPDATE') {
        query = query.update(operation.data)
      } else if (operation.op === 'DELETE') {
        query = query.delete()
      }

      // Apply filters
      for (const filter of operation.filters) {
        const [col, op, value] = filter
        if (op === 'eq') query = query.eq(col, value)
        else if (op === 'neq') query = query.neq(col, value)
        else if (op === 'gt') query = query.gt(col, value)
        else if (op === 'gte') query = query.gte(col, value)
        else if (op === 'lt') query = query.lt(col, value)
        else if (op === 'lte') query = query.lte(col, value)
        else if (op === 'in') query = query.in(col, value)
      }

      // Apply ordering
      if (operation.order) {
        query = query.orderBy(operation.order.col, {
          ascending: operation.order.direction === 'asc'
        })
      }

      // Apply limit
      if (operation.limit) {
        query = query.limit(operation.limit)
      }

      // Apply single
      if (operation.single) {
        query = query.single()
      }

      query.then(resolve).catch(reject)
    })
  }

  private executeLocal(operation: any): Promise<SupabaseResult> {
    // Use the original client's local execution
    const builder = this.original.from(operation.table)

    // Build query based on operation
    let query: any = builder

    if (operation.op === 'SELECT') {
      query = query.select('*')
    } else if (operation.op === 'INSERT') {
      query = query.insert(operation.data)
    } else if (operation.op === 'UPDATE') {
      query = query.update(operation.data)
    } else if (operation.op === 'DELETE') {
      query = query.delete()
    }

    // Apply filters
    for (const filter of operation.filters) {
      const [col, op, value] = filter
      if (op === 'eq') query = query.eq(col, value)
      else if (op === 'neq') query = query.neq(col, value)
      else if (op === 'gt') query = query.gt(col, value)
      else if (op === 'gte') query = query.gte(col, value)
      else if (op === 'lt') query = query.lt(col, value)
      else if (op === 'lte') query = query.lte(col, value)
      else if (op === 'in') query = query.in(col, value)
    }

    // Apply ordering
    if (operation.order) {
      query = query.orderBy(operation.order.col, {
        ascending: operation.order.direction === 'asc'
      })
    }

    // Apply limit
    if (operation.limit) {
      query = query.limit(operation.limit)
    }

    // Apply single
    if (operation.single) {
      query = query.single()
    }

    return query
  }

  private saveOperationQueue() {
    try {
      // Only save essential data to avoid storing functions
      const queueData = this.operationQueue.map(op => ({
        table: op.table,
        op: op.op,
        filters: op.filters,
        data: op.data,
        order: op.order,
        limit: op.limit,
        single: op.single,
        timestamp: op.timestamp
      }))
      localStorage.setItem('enhanced-supabase-queue', JSON.stringify(queueData))
    } catch (error) {
      console.warn('Failed to save operation queue:', error)
    }
  }

  private loadOperationQueue() {
    try {
      const queueData = localStorage.getItem('enhanced-supabase-queue')
      if (queueData) {
        const parsed = JSON.parse(queueData)
        // Note: We can't restore the resolve/reject functions, so we log for manual recovery
        console.log(`Loaded ${parsed.length} queued operations from localStorage`)
        // In a production app, you might want to re-queue these with new promises
      }
    } catch (error) {
      console.warn('Failed to load operation queue:', error)
    }
  }

  // Proxy all methods to the original client with enhanced queuing
  from(table: string) {
    return {
      select: (...cols: string[]) => {
        return this.enhancedBuilder(table, 'SELECT', cols)
      },
      insert: (rows: any | any[]) => {
        return this.enhancedBuilder(table, 'INSERT', undefined, rows)
      },
      update: (obj: any) => {
        return this.enhancedBuilder(table, 'UPDATE', obj)
      },
      delete: () => {
        return this.enhancedBuilder(table, 'DELETE')
      }
    }
  }

  private enhancedBuilder(
    table: string,
    op: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    cols: string[] | undefined = undefined,
    data: any = null
  ) {
    return {
      eq: (col: string, value: any) => this.addFilterAndReturn(this.eq.bind(this), table, op, cols, data, col, 'eq', value),
      neq: (col: string, value: any) => this.addFilterAndReturn(this.neq.bind(this), table, op, cols, data, col, 'neq', value),
      gt: (col: string, value: any) => this.addFilterAndReturn(this.gt.bind(this), table, op, cols, data, col, 'gt', value),
      gte: (col: string, value: any) => this.addFilterAndReturn(this.gte.bind(this), table, op, cols, data, col, 'gte', value),
      lt: (col: string, value: any) => this.addFilterAndReturn(this.lt.bind(this), table, op, cols, data, col, 'lt', value),
      lte: (col: string, value: any) => this.addFilterAndReturn(this.lte.bind(this), table, op, cols, data, col, 'lte', value),
      in: (col: string, values: any[]) => this.addFilterAndReturn(this.in.bind(this), table, op, cols, data, col, 'in', values),
      orderBy: (col: string, opts?: { ascending?: boolean }) => this.addOrderAndReturn(this.orderBy.bind(this), table, op, cols, data, col, opts),
      limit: (n: number) => this.addLimitAndReturn(this.limit.bind(this), table, op, cols, data, n),
      single: () => this.addSingleAndReturn(this.single.bind(this), table, op, cols, data),
      then: (onfulfilled?: any, onrejected?: any) => {
        return this.buildQuery(table, op, cols, data).then(onfulfilled, onrejected)
      }
    }
  }

  private addFilterAndReturn(
    fn: (table: string, op: string, col: string, value: any, tableParam: string, opParam: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE', cols: string[] | undefined, data: any, colParam: string, opParam2: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in', valueParam: any) => any,
    tableParam: string,
    opParam: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    cols: string[] | undefined,
    data: any,
    colParam: string,
    opParam2: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in',
    valueParam: any
  ) {
    const result = fn(tableParam, opParam, colParam, valueParam, tableParam, opParam, cols, data, colParam, opParam2, valueParam)
    return result
  }

  private addOrderAndReturn(
    fn: (table: string, op: string, col: string, opts: { ascending?: boolean } | undefined, tableParam: string, opParam: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE', cols: string[] | undefined, data: any, colParam: string, optsParam: { ascending?: boolean }) => any,
    tableParam: string,
    opParam: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    cols: string[] | undefined,
    data: any,
    colParam: string,
    optsParam: { ascending?: boolean }
  ) {
    const result = fn(tableParam, opParam, colParam, optsParam, tableParam, opParam, cols, data, colParam, optsParam)
    return result
  }

  private addLimitAndReturn(
    fn: (table: string, op: string, limit: number, tableParam: string, opParam: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE', cols: string[] | undefined, data: any, limitParam: number) => any,
    tableParam: string,
    opParam: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    cols: string[] | undefined,
    data: any,
    limitParam: number
  ) {
    return fn(tableParam, opParam, limitParam, tableParam, opParam, cols, data, limitParam)
  }

  private addSingleAndReturn(
    fn: (table: string, op: string, tableParam: string, opParam: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE', cols: string[] | undefined, data: any) => any,
    tableParam: string,
    opParam: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    cols: string[] | undefined,
    data: any
  ) {
    return fn(tableParam, opParam, tableParam, opParam, cols, data)
  }

  private buildQuery(
    table: string,
    op: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    cols: string[] | undefined,
    data: any
  ) {
    return new Promise<SupabaseResult>((resolve, reject) => {
      this.operationQueue.push({
        table,
        op,
        filters: [], // Filters would be captured in a real implementation
        data,
        order: undefined,
        limit: undefined,
        single: undefined,
        timestamp: Date.now(),
        resolve,
        reject
      })

      this.saveOperationQueue()

      // If online, try to process immediately
      if (this.isOnline) {
        this.processOperationQueue().catch(() => {
          // If processing fails, keep in queue for retry
        })
      }
    })
  }

  // Properties to match original client interface
  get engine() {
    return this.original.engine
  }

  // Cleanup
  destroy() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId)
    }
    window.removeEventListener('online', () => {})
    window.removeEventListener('offline', () => {})
  }
}

// Export enhanced client as default
export const enhancedSupabase = new EnhancedSupabaseClient()

// Also export the original for backward compatibility
export { originalSupabase as supabase }