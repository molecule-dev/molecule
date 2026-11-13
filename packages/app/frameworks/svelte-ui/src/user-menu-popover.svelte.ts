/**
 * Context shared by the `UserMenuPopover` family (trigger, panel, sign-out),
 * mirroring the React package's popover context: the popover owns the open
 * state and the resolved account identity; sub-components read them through
 * Svelte context.
 *
 * @module
 */

import { getContext } from 'svelte'

/** What the nearest {@link UserMenuPopover} provides through context. */
export interface UserMenuPopoverContextValue {
  /** Whether the popover panel is currently open. */
  open: boolean
  /** Set the open state. */
  setOpen: (open: boolean) => void
  /** Resolved display name (auth user's name/email, or the guest label). */
  displayName: string
  /** Resolved account email, when the auth user has one. */
  email: string | undefined
  /** Shared id linking the trigger's aria-controls to the panel's id. */
  panelId: string
}

/** The Svelte context key for the popover context. */
export const USER_MENU_POPOVER_CONTEXT = Symbol('molecule-user-menu-popover')

/**
 * Returns a callback that closes the enclosing `UserMenuPopover`. Useful
 * for nav-item click handlers that should dismiss the popover even when
 * they don't change the route. Returns a no-op when called outside a
 * `UserMenuPopover`. Reads Svelte context, so it is only legal during
 * component initialization.
 *
 * @returns A function that closes the popover.
 */
export function useUserMenuPopoverClose(): () => void {
  const ctx = getContext<UserMenuPopoverContextValue>(USER_MENU_POPOVER_CONTEXT)
  if (!ctx) return () => undefined
  return () => ctx.setOpen(false)
}
