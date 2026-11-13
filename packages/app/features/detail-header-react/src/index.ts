/**
 * React detail-page header.
 *
 * Exports `<DetailHeader>` — leading slot + title/subtitle + status +
 * right-aligned actions, with an optional meta row and an optional search
 * slot. Different from `<PageHeader>` (top of list/index pages) in
 * prioritising status + search + stickiness for long-scrolling detail
 * screens. All slots are ReactNode props — compose any components.
 * `commonActions` always renders beside `actions`: keep viewer-independent controls there
 * while `actions` selects owner/reader controls. Ownership of a record need not remove
 * actions the owner can still perform, such as bookmarking a document or exporting a task.
 *
 * @example
 * ```tsx
 * import { DetailHeader } from '@molecule/app-detail-header-react'
 * import { Button } from '@molecule/app-ui-react'
 * import { StatusBadge } from '@molecule/app-status-badge-react'
 *
 * <DetailHeader
 *   title="Project Alpha"
 *   subtitle="Last updated 2 hours ago"
 *   status={<StatusBadge kind="success">Active</StatusBadge>}
 *   commonActions={<Button onClick={handleBookmark}>Bookmark</Button>}
 *   actions={canEdit ? <Button variant="solid" onClick={handleEdit}>Edit</Button> : null}
 *   meta={<span>Owner: Alice</span>}
 *   sticky
 * />
 * ```
 *
 * @remarks
 * - `sticky` applies `position: sticky; top: 0` but adds NO background —
 *   pass a surface class via `className` (e.g. your ClassMap's surface
 *   helper) or content will scroll visibly through the header.
 * - There is no breadcrumb prop; put a breadcrumb in the `leading` slot or
 *   render one above the header (see
 *   `@molecule/app-detail-page-layout-react`, which has a breadcrumb slot).
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup). No text of its own, so no locale
 *   bond is needed; translate the values you pass in.
 *
 * @module
 */

export * from './DetailHeader.js'
