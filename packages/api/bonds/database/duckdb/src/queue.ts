/**
 * FIFO lock over the pool's single DuckDB connection.
 *
 * @module
 */

/**
 * Serializes every use of ONE DuckDB connection.
 *
 * All connections from one instance share one database, and DuckDB detects
 * conflicting writes across connections of one instance as transaction
 * conflicts — an interactive `BEGIN` … `COMMIT` interleaved with writes from
 * another connection fails the transaction. So this pool uses ONE connection
 * (the sqlite bond's model): plain `query()` calls hold it for one statement;
 * `connect()` and `transaction()` hold it until they are released, so a
 * transaction's `BEGIN` → … → `COMMIT`/`ROLLBACK` runs alone.
 *
 * Waiting is bounded: a waiter that cannot get the lock within its timeout is
 * removed from the queue and rejected with an error naming the likely cause
 * (code holding a connection while calling the pool), instead of hanging forever.
 */
export class ConnectionLock {
  private locked = false
  private holder: string | null = null
  private waiters: Array<{ grant: () => void }> = []

  /**
   * Number of callers currently waiting for the lock.
   *
   * @returns The queue length.
   */
  get waiting(): number {
    return this.waiters.length
  }

  /**
   * Whether the lock is currently held.
   *
   * @returns `true` when held.
   */
  get isLocked(): boolean {
    return this.locked
  }

  /**
   * Waits for the lock in FIFO order. The returned release function MUST be
   * called exactly once; extra calls are ignored.
   *
   * @param purpose - What the caller will do with the lock (`'query'`,
   *   `'connect()'`, `'transaction()'`), used in the timeout message.
   * @param timeoutMillis - Maximum wait; `0` or less waits forever.
   * @returns A release function.
   */
  acquire(purpose: string, timeoutMillis: number): Promise<() => void> {
    let released = false
    const release = (): void => {
      if (released) return
      released = true
      this.holder = null
      const next = this.waiters.shift()
      if (next) {
        next.grant()
      } else {
        this.locked = false
      }
    }

    if (!this.locked) {
      this.locked = true
      this.holder = purpose
      return Promise.resolve(release)
    }

    return new Promise<() => void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const waiter = {
        grant: (): void => {
          if (timer !== undefined) clearTimeout(timer)
          this.locked = true
          this.holder = purpose
          resolve(release)
        },
      }
      this.waiters.push(waiter)
      if (timeoutMillis > 0) {
        timer = setTimeout(() => {
          const index = this.waiters.indexOf(waiter)
          if (index === -1) return
          this.waiters.splice(index, 1)
          reject(
            new Error(
              `DuckDB: a ${purpose} waited ${timeoutMillis} ms for the pool's single ` +
                `connection, which is held by an open ${this.holder ?? 'operation'}. This pool ` +
                `serializes everything on one connection: release() a connect()ed connection and ` +
                `commit()/rollback() a transaction before calling the pool or the store again, and ` +
                `run every statement of a transaction on its own query().`,
            ),
          )
        }, timeoutMillis)
      }
    })
  }
}
