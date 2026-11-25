/** The countdown for one presented notification. */

/** Auto-dismisses once, pausing independently for hover and focus. */
export class ToastCountdown {
  private readonly pauses = new Set<'hover' | 'focus'>()
  private duration = 0
  private remaining = 0
  private startedAt?: number
  private timer?: ReturnType<typeof setTimeout>
  private dismissed = false

  constructor(private readonly onDismiss: () => void) {}

  /** Sets the duration on mount or when it changes. Zero stays open until dismissed. */
  start(duration: number): void {
    this.stop()
    this.duration = duration
    this.remaining = duration
    this.resume()
  }

  /** Suspends the countdown until every active reason for pausing has left. */
  setPaused(reason: 'hover' | 'focus', paused: boolean): void {
    if (paused) {
      this.pauses.add(reason)
      if (this.startedAt !== undefined) {
        this.remaining = Math.max(0, this.remaining - (Date.now() - this.startedAt))
        this.stop()
      }
    } else if (this.pauses.delete(reason)) {
      this.resume()
    }
  }

  /** Hides the notification once, whether a timer or a control dismissed it. */
  readonly dismiss = (): void => {
    if (this.dismissed) return
    this.dismissed = true
    this.stop()
    this.onDismiss()
  }

  /** Cancels the timer during unmount or before restarting it. */
  readonly stop = (): void => {
    clearTimeout(this.timer)
    this.timer = undefined
    this.startedAt = undefined
  }

  /** Schedules the remaining time once a visible toast has no active pause. */
  private resume(): void {
    if (this.duration <= 0 || this.dismissed || this.pauses.size > 0 || this.timer !== undefined)
      return
    this.startedAt = Date.now()
    this.timer = setTimeout(this.dismiss, this.remaining)
  }
}
