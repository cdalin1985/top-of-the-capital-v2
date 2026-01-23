/**
 * SyncQueue - Offline operation queue with persistence
 * Phase 6: Offline Caching with Sync Queue
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncOperation, SyncOperationType, SyncTable, SyncOperationStatus } from './types';
import { STORAGE_KEYS, CACHE_CONFIG, OPERATION_PRIORITY, SYNC_BATCH_SIZE } from './constants';

/**
 * Generate a unique ID for operations
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * SyncQueue manages offline operations that need to be synced
 * Operations are persisted to AsyncStorage and processed when online
 */
export class SyncQueue {
  private static instance: SyncQueue;
  private operations: SyncOperation[] = [];
  private initialized: boolean = false;
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): SyncQueue {
    if (!SyncQueue.instance) {
      SyncQueue.instance = new SyncQueue();
    }
    return SyncQueue.instance;
  }

  /**
   * Initialize the queue - load from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.operations = parsed.filter(
          (op: SyncOperation) => op.status !== 'completed'
        );
        console.log(`[SyncQueue] Loaded ${this.operations.length} pending operations`);
      }
      this.initialized = true;
    } catch (error) {
      console.error('[SyncQueue] Initialization error:', error);
      this.operations = [];
      this.initialized = true;
    }
  }

  /**
   * Add a listener for queue changes
   */
  addListener(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Persist queue to storage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SYNC_QUEUE,
        JSON.stringify(this.operations)
      );
    } catch (error) {
      console.error('[SyncQueue] Persist error:', error);
    }
  }

  /**
   * Add a new operation to the queue
   */
  async add(
    table: SyncTable,
    operation: SyncOperationType,
    data: Record<string, any>,
    referenceId?: string
  ): Promise<string> {
    const id = generateId();
    const syncOperation: SyncOperation = {
      id,
      table,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: CACHE_CONFIG.maxRetries,
      status: 'pending',
      referenceId,
    };

    this.operations.push(syncOperation);
    await this.persist();
    this.notifyListeners();

    console.log(`[SyncQueue] Added ${operation} operation for ${table}:`, id);
    return id;
  }

  /**
   * Update an operation's status
   */
  async updateStatus(
    id: string,
    status: SyncOperationStatus,
    error?: string
  ): Promise<void> {
    const index = this.operations.findIndex((op) => op.id === id);
    if (index !== -1) {
      this.operations[index].status = status;
      if (error) {
        this.operations[index].error = error;
      }
      await this.persist();
      this.notifyListeners();
    }
  }

  /**
   * Increment retry count for an operation
   */
  async incrementRetry(id: string): Promise<boolean> {
    const index = this.operations.findIndex((op) => op.id === id);
    if (index !== -1) {
      this.operations[index].retryCount++;
      const exceeded = this.operations[index].retryCount >= this.operations[index].maxRetries;

      if (exceeded) {
        this.operations[index].status = 'failed';
      } else {
        this.operations[index].status = 'pending';
      }

      await this.persist();
      this.notifyListeners();
      return !exceeded;
    }
    return false;
  }

  /**
   * Remove an operation from the queue
   */
  async remove(id: string): Promise<void> {
    this.operations = this.operations.filter((op) => op.id !== id);
    await this.persist();
    this.notifyListeners();
  }

  /**
   * Remove completed operations
   */
  async clearCompleted(): Promise<void> {
    const before = this.operations.length;
    this.operations = this.operations.filter((op) => op.status !== 'completed');
    const after = this.operations.length;

    if (before !== after) {
      await this.persist();
      this.notifyListeners();
      console.log(`[SyncQueue] Cleared ${before - after} completed operations`);
    }
  }

  /**
   * Get pending operations sorted by priority
   */
  getPending(): SyncOperation[] {
    return this.operations
      .filter((op) => op.status === 'pending')
      .sort((a, b) => {
        const priorityA = OPERATION_PRIORITY[`${a.table}:${a.operation}`] ?? 10;
        const priorityB = OPERATION_PRIORITY[`${b.table}:${b.operation}`] ?? 10;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.timestamp - b.timestamp;
      });
  }

  /**
   * Get next batch of operations to process
   */
  getNextBatch(size: number = SYNC_BATCH_SIZE): SyncOperation[] {
    return this.getPending().slice(0, size);
  }

  /**
   * Get failed operations
   */
  getFailed(): SyncOperation[] {
    return this.operations.filter((op) => op.status === 'failed');
  }

  /**
   * Get all operations
   */
  getAll(): SyncOperation[] {
    return [...this.operations];
  }

  /**
   * Get operations for a specific table
   */
  getByTable(table: SyncTable): SyncOperation[] {
    return this.operations.filter((op) => op.table === table);
  }

  /**
   * Get operations by reference ID (e.g., all ops for a challenge)
   */
  getByReferenceId(referenceId: string): SyncOperation[] {
    return this.operations.filter((op) => op.referenceId === referenceId);
  }

  /**
   * Check if there are pending operations
   */
  hasPending(): boolean {
    return this.operations.some((op) => op.status === 'pending');
  }

  /**
   * Check if there are operations for a specific table
   */
  hasOperationsForTable(table: SyncTable): boolean {
    return this.operations.some(
      (op) => op.table === table && op.status === 'pending'
    );
  }

  /**
   * Get queue length
   */
  get length(): number {
    return this.operations.length;
  }

  /**
   * Get pending count
   */
  get pendingCount(): number {
    return this.operations.filter((op) => op.status === 'pending').length;
  }

  /**
   * Get failed count
   */
  get failedCount(): number {
    return this.operations.filter((op) => op.status === 'failed').length;
  }

  /**
   * Retry failed operations
   */
  async retryFailed(): Promise<void> {
    const failed = this.getFailed();
    for (const op of failed) {
      if (op.retryCount < op.maxRetries) {
        op.status = 'pending';
      }
    }
    await this.persist();
    this.notifyListeners();
    console.log(`[SyncQueue] Reset ${failed.length} failed operations for retry`);
  }

  /**
   * Clear all operations (use with caution)
   */
  async clearAll(): Promise<void> {
    this.operations = [];
    await this.persist();
    this.notifyListeners();
    console.log('[SyncQueue] All operations cleared');
  }

  /**
   * Get operation by ID
   */
  getById(id: string): SyncOperation | undefined {
    return this.operations.find((op) => op.id === id);
  }

  /**
   * Check if an operation is already queued (to prevent duplicates)
   */
  isDuplicate(
    table: SyncTable,
    operation: SyncOperationType,
    referenceId?: string
  ): boolean {
    return this.operations.some(
      (op) =>
        op.table === table &&
        op.operation === operation &&
        op.referenceId === referenceId &&
        (op.status === 'pending' || op.status === 'syncing')
    );
  }

  /**
   * Get queue summary for debugging
   */
  getSummary(): {
    total: number;
    pending: number;
    syncing: number;
    completed: number;
    failed: number;
    byTable: Record<string, number>;
  } {
    const byTable: Record<string, number> = {};
    let pending = 0;
    let syncing = 0;
    let completed = 0;
    let failed = 0;

    for (const op of this.operations) {
      byTable[op.table] = (byTable[op.table] || 0) + 1;

      switch (op.status) {
        case 'pending':
          pending++;
          break;
        case 'syncing':
          syncing++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
      }
    }

    return {
      total: this.operations.length,
      pending,
      syncing,
      completed,
      failed,
      byTable,
    };
  }
}

// Export singleton instance
export const syncQueue = SyncQueue.getInstance();
