/**
 * React announcement / promo bar.
 *
 * Exports `<AnnouncementBar>` — persistent banner with icon, message,
 * action, and optional dismiss.
 *
 * @example
 * ```tsx
 * import { AnnouncementBar } from '@molecule/app-announcement-bar-react'
 *
 * <AnnouncementBar
 *   kind="promo"
 *   icon={<span>🎉</span>}
 *   action={{ label: 'Learn more', href: '/pricing' }}
 *   onDismiss={() => console.log('dismissed')}
 * >
 *   New Pro plan — 3 months free for early adopters.
 * </AnnouncementBar>
 * ```
 *
 * @module
 */

export * from './AnnouncementBar.js'
