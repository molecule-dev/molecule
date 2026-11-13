/**
 * Shell context shared by the `ResponsiveAppShell` family: the root provides
 * the breakpoint signal, the drawer open state and the resolved sidebar
 * geometry, and the TopBar / Sidebar / Drawer / Content sub-components read it
 * — the Svelte counterpart of the React package's module-private
 * `ShellContext`, carried over Svelte context so a sub-component renders the
 * same landmarks only inside a shell.
 *
 * @module
 */

import { getContext } from 'svelte'

/**
 * Semantic sidebar width — the same stack-agnostic presets the React shell
 * uses, so both frameworks render the same fleet geometry: `sm` → 208px,
 * `md` → 240px (default), `lg` → 256px. A raw `number` is an exact pixel
 * width.
 */
export type ShellSidebarWidth = 'sm' | 'md' | 'lg' | number

/** Pixel widths for the {@link ShellSidebarWidth} presets. */
const SIDEBAR_WIDTH_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 208,
  md: 240,
  lg: 256,
}

/**
 * Resolves the effective sidebar/drawer pixel width.
 * @param width - The width preset or explicit pixel number.
 * @returns The width in pixels (defaults to `md`, 240px).
 */
export function resolveWidthPx(width?: ShellSidebarWidth): number {
  if (typeof width === 'number') return width
  if (width) return SIDEBAR_WIDTH_PX[width]
  return SIDEBAR_WIDTH_PX.md
}

/**
 * The context value the `ResponsiveAppShell` root provides to its
 * sub-components. Reactive fields are read through getters so every
 * sub-component template tracks the root's state.
 */
export interface ShellContextValue {
  /** Whether the desktop shell (sidebar) is mounted. */
  readonly isDesktop: boolean
  /** Resolved sidebar/drawer width in pixels (from the root's `sidebarWidth`). */
  readonly sidebarWidthPx: number
  /** Whether the mobile drawer is (logically) open. */
  readonly drawerOpen: boolean
  /** Opens the drawer (the TopBar trigger calls this). */
  openDrawer: () => void
  /** Closes the drawer (backdrop, Escape, close button, navigation). */
  closeDrawer: () => void
  /** DOM id of the drawer panel — wires the trigger's `aria-controls`. */
  readonly drawerId: string
  /**
   * Whether a `Drawer` sub-component is part of the composition. The Drawer
   * registers itself on mount so a shell composed WITHOUT a drawer never
   * renders a dead menu trigger in the top bar.
   */
  readonly hasDrawer: boolean
  /** Called by the Drawer on mount/unmount to set {@link ShellContextValue.hasDrawer}. */
  registerDrawer: (present: boolean) => void
}

/** The Svelte context key for the {@link ShellContextValue}. */
export const SHELL_CONTEXT_KEY = Symbol('molecule-responsive-app-shell')

/**
 * Returns the nearest shell context, throwing if not inside a
 * `ResponsiveAppShell`.
 * @param component - The calling sub-component's name, for the error message.
 * @returns The shell context value.
 */
export function useShellContext(component: string): ShellContextValue {
  const ctx = getContext<ShellContextValue | null>(SHELL_CONTEXT_KEY)
  if (!ctx) {
    throw new Error(`<${component}> must be rendered inside <ResponsiveAppShell>`)
  }
  return ctx
}
