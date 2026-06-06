/**
 * React detail-page header.
 *
 * Exports `<DetailHeader>` — title + subtitle + status + actions + optional
 * meta row + optional search slot. Different from `<PageHeader>` in
 * prioritising status + stickiness for long-scrolling detail screens.
 *
 * @example
 * ```tsx
 * import { DetailHeader } from '@molecule/app-detail-header-react'
 *
 * <DetailHeader
 *   title="Project Alpha"
 *   subtitle="Last updated 2 hours ago"
 *   status={<StatusBadge label="Active" color="success" />}
 *   actions={<Button variant="solid" onClick={handleEdit}>Edit</Button>}
 *   meta={<span>Owner: Alice</span>}
 *   sticky
 * />
 * ```
 *
 * @module
 */

export * from './DetailHeader.js'
