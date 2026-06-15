/**
 * Pure helpers backing the `/autocommit <seconds>` command and its countdown
 * badge.
 *
 * `/autocommit <n>` arms a client-side, debounce-style countdown: every file
 * change restarts an `n`-second timer, and when the timer reaches zero the chat
 * fires the *existing* `/commit` path (no new backend). After a commit the timer
 * disarms (pauses) until the next file change, so a clean tree is never
 * committed in a loop. `/autocommit 0` cancels it entirely.
 *
 * The cadence is a PERSISTED project setting (`project.settings.autoCommitSeconds`),
 * not a per-session toggle: the component debounce-PATCHes it whenever the user
 * changes it and, on load, dispatches `hydrate` to restore it in the paused
 * state — so it survives a reload/reconnect (it re-arms on the next file change).
 *
 * The countdown is modelled as a pure reducer here so the
 * arm/hydrate/reset/tick/fire state machine can be unit tested without React,
 * timers, or a backend. The component owns only the side effects: the GET that
 * hydrates the persisted cadence, the debounced PATCH that persists changes, a
 * 1s interval dispatching `tick`, a file-change effect dispatching `reset`, and
 * a `fire`-when-due effect that runs `/commit` then dispatches `fired`. Any
 * user-facing prose lives in the component via `t()`, never here.
 *
 * @module
 */

/**
 * The countdown's state.
 *
 * `intervalSeconds` is the configured cadence (`0` = disabled). `remaining` is
 * the live count: a positive number while counting down, `0` at the instant a
 * commit is due, and `null` while disabled or paused (after a commit, awaiting
 * the next file change to re-arm).
 */
export interface AutoCommitState {
  /** Configured countdown length in seconds; `0` when auto-commit is off. */
  intervalSeconds: number
  /** Seconds left until the next auto-commit; `null` when disabled or paused. */
  remaining: number | null
}

/**
 * Actions the countdown reducer accepts.
 *
 * - `set` — apply a `/autocommit <seconds>` command (`seconds <= 0` disables);
 *   arms AND starts a fresh countdown (an explicit, just-now user choice).
 * - `hydrate` — restore a cadence persisted on the project (e.g. on reload),
 *   enabled but PAUSED (`seconds <= 0` disables). Unlike `set`, it does NOT
 *   start counting down — the countdown only re-arms on the next file change —
 *   so reopening a project never auto-commits a tree the user hasn't touched.
 * - `reset` — a file changed; restart the full countdown (no-op when disabled).
 * - `tick` — one second elapsed; decrement toward zero (no-op when paused).
 * - `fired` — a commit was just dispatched; pause until the next file change.
 */
export type AutoCommitAction =
  | { type: 'set'; seconds: number }
  | { type: 'hydrate'; seconds: number }
  | { type: 'reset' }
  | { type: 'tick' }
  | { type: 'fired' }

/** The disabled (off) countdown state — the reducer's initial value. */
export const AUTO_COMMIT_DISABLED: AutoCommitState = { intervalSeconds: 0, remaining: null }

/**
 * Pure reducer for the auto-commit countdown. Deterministic and side-effect
 * free: the component performs the actual commit when {@link isAutoCommitDue}
 * becomes true, then dispatches `fired`.
 *
 * @param state - The current countdown state.
 * @param action - The action to apply.
 * @returns The next countdown state.
 */
export function autoCommitReducer(
  state: AutoCommitState,
  action: AutoCommitAction,
): AutoCommitState {
  switch (action.type) {
    case 'set':
      // <= 0 cancels; a positive cadence arms and starts the first countdown.
      if (action.seconds <= 0) return AUTO_COMMIT_DISABLED
      return { intervalSeconds: action.seconds, remaining: action.seconds }
    case 'hydrate':
      // Restore a persisted cadence in the paused state: enabled (so the badge
      // shows "on") but NOT counting down — it re-arms via `reset` on the next
      // file change. <= 0 means auto-commit was off on the project.
      if (action.seconds <= 0) return AUTO_COMMIT_DISABLED
      return { intervalSeconds: action.seconds, remaining: null }
    case 'reset':
      // A file changed: re-arm the full countdown — but only when enabled.
      if (state.intervalSeconds <= 0) return state
      return { intervalSeconds: state.intervalSeconds, remaining: state.intervalSeconds }
    case 'tick':
      // Disabled or paused (remaining === null) ignores ticks.
      if (state.remaining === null) return state
      return { intervalSeconds: state.intervalSeconds, remaining: Math.max(0, state.remaining - 1) }
    case 'fired':
      // Commit dispatched: pause (don't re-fire on a clean tree) until the next
      // file change re-arms via `reset`. Keep the configured cadence.
      if (state.intervalSeconds <= 0) return state
      return { intervalSeconds: state.intervalSeconds, remaining: null }
  }
}

/**
 * Whether auto-commit is enabled (a positive cadence is configured), regardless
 * of whether it is currently counting down or paused.
 *
 * @param state - The countdown state.
 * @returns `true` when `intervalSeconds > 0`.
 */
export function isAutoCommitEnabled(state: AutoCommitState): boolean {
  return state.intervalSeconds > 0
}

/**
 * Whether the countdown is actively armed (counting down), i.e. a 1s tick
 * interval should be running. False when disabled or paused after a commit.
 *
 * @param state - The countdown state.
 * @returns `true` when `remaining` is a number.
 */
export function isAutoCommitArmed(state: AutoCommitState): boolean {
  return state.remaining !== null
}

/**
 * Whether a commit is due this instant (the countdown has reached zero). The
 * component reacts to this by running `/commit` and dispatching `fired`.
 *
 * @param state - The countdown state.
 * @returns `true` when `remaining === 0`.
 */
export function isAutoCommitDue(state: AutoCommitState): boolean {
  return state.remaining === 0
}

/**
 * Parses an `/autocommit [seconds]` command.
 *
 * Returns `{ seconds: null }` when `/autocommit` is typed with no argument (the
 * caller shows usage/current state), `{ seconds: n }` for a non-negative integer
 * argument (`0` cancels), or `null` when the input is not the command.
 *
 * @param input - The raw chat input.
 * @returns The parsed command, or `null` when it is not `/autocommit`.
 */
export function parseAutoCommitCommand(input: string): { seconds: number | null } | null {
  const match = input.trim().match(/^\/autocommit(?:\s+(\d+))?$/i)
  if (!match) return null
  if (match[1] === undefined) return { seconds: null }
  return { seconds: Number(match[1]) }
}

/**
 * Formats the countdown's remaining seconds for the compact badge (e.g. `"12s"`).
 * Returns `''` when there is nothing to show (disabled or paused).
 *
 * @param state - The countdown state.
 * @returns The badge label, or `''`.
 */
export function formatAutoCommitBadge(state: AutoCommitState): string {
  if (state.remaining === null) return ''
  return `${state.remaining}s`
}
