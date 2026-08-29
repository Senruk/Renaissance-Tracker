import type { SupabaseResult, SupabaseClient, SupabaseQueryBuilder } from './db-types'
import { supabase as originalSupabase } from './supabase'

// Enhanced Supabase client with improved offline persistence and sync capabilities
// This builds upon the existing localStorage fallback but adds better reliability

// Configuration
const SYNC_INTERVAL = 30000 // 30 seconds

// Enhanced client that queues operations when offline and syncs when online
export class EnhancedSupabaseClient implements SupabaseClient {
  private readonly original: SupabaseClient
  private isOnline: boolean = true
  private syncIntervalId: ReturnType<typeof setInterval> | null = null
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
        query = query.order(operation.order.col, {
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
      query = query.order(operation.order.col, {
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
  from(table: string): SupabaseQueryBuilder {
    const baseBuilder = this.original.from(table)
    return this.wrapBuilderMethods(baseBuilder, table, 'SELECT')
  }

  private wrapBuilderMethods(
    builder: SupabaseQueryBuilder,
    table: string,
    op: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    _cols?: string[],
    _data?: any
  ): SupabaseQueryBuilder {
    // Track filters so offline queue can preserve them
    const capturedFilters: any[] = []
    const capturedOrder: any = undefined
    const capturedLimit: number | undefined = undefined
    const capturedSingle: boolean | undefined = undefined

    const self = this
    return {
      select: (...cols: string[]) => self.wrapBuilderMethods(builder.select(...cols), table, 'SELECT', cols, _data),
      insert: (rows: any | any[]) => self.wrapBuilderMethods(builder.insert(rows), table, 'INSERT', _cols, rows),
      update: (obj: any) => self.wrapBuilderMethods(builder.update(obj), table, 'UPDATE', _cols, obj),
      delete: () => self.wrapBuilderMethods(builder.delete(), table, 'DELETE', _cols, _data),
      eq: (col: string, value: any) => {
        capturedFilters.push(['eq', col, value])
        return self.wrapBuilderMethods(builder.eq(col, value), table, op, _cols, _data)
      },
      neq: (col: string, value: any) => {
        capturedFilters.push(['neq', col, value])
        return self.wrapBuilderMethods(builder.neq(col, value), table, op, _cols, _data)
      },
      in: (col: string, values: any[]) => {
        capturedFilters.push(['in', col, values])
        return self.wrapBuilderMethods(builder.in(col, values), table, op, _cols, _data)
      },
      gt: (col: string, value: any) => {
        capturedFilters.push(['gt', col, value])
        return self.wrapBuilderMethods(builder.gt(col, value), table, op, _cols, _data)
      },
      gte: (col: string, value: any) => {
        capturedFilters.push(['gte', col, value])
        return self.wrapBuilderMethods(builder.gte(col, value), table, op, _cols, _data)
      },
      lt: (col: string, value: any) => {
        capturedFilters.push(['lt', col, value])
        return self.wrapBuilderMethods(builder.lt(col, value), table, op, _cols, _data)
      },
      lte: (col: string, value: any) => {
        capturedFilters.push(['lte', col, value])
        return self.wrapBuilderMethods(builder.lte(col, value), table, op, _cols, _data)
      },
      order: (col: string, opts?: { ascending?: boolean }) => self.wrapBuilderMethods(builder.order(col, opts), table, op, _cols, _data),
      limit: (n: number) => self.wrapBuilderMethods(builder.limit(n), table, op, _cols, _data),
      single: () => self.wrapBuilderMethods(builder.single(), table, op, _cols, _data),
      then: (onfulfilled?: any, onrejected?: any) => {
        return self.executeWithQueue(table, op, builder, _cols, _data, capturedFilters, capturedOrder, capturedLimit, capturedSingle).then(onfulfilled, onrejected)
      }
    }
  }

  private async executeWithQueue(
    table: string,
    op: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    builder: SupabaseQueryBuilder,
    _cols: string[] | undefined,
    data: any,
    filters: any[] = [],
    order?: any,
    limit?: number,
    single?: boolean
  ): Promise<SupabaseResult> {
    // For SELECT operations, just execute immediately
    if (op === 'SELECT') {
      return await builder
    }

    // For mutating operations, queue if offline
    if (!this.isOnline) {
      return new Promise<SupabaseResult>((resolve, reject) => {
        this.operationQueue.push({
          table,
          op,
          filters,
          data,
          order,
          limit,
          single,
          timestamp: Date.now(),
          resolve,
          reject
        })
        this.saveOperationQueue()
      })
    }

    // Online - execute directly
    return await builder
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