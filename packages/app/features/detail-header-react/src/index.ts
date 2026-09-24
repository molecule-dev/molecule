/**
 * React detail-page header.
 *
 * Exports `<DetailHeader>` — leading slot + title/subtitle + status +
 * right-aligned actions, with an optional meta row and an optional search
 * slot. Different from `<PageHeader>` (top of list/index pages) in
 * prioritising status + search + stickiness for long-scrolling detail
 * screens. All slots are ReactNode props — compose any components.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { DetailHeader } from '@molecule/app-detail-header-react'
 * import { t } from '@molecule/app-i18n'
 * import { StatusBadge } from '@molecule/app-status-badge-react'
 * import { getClassMap } from '@molecule/app-ui'
 * import { Button } from '@molecule/app-ui-react'
 *
 * export function ProjectHeader() {
 *   const cm = getClassMap()
 *   const project = { name: 'Project Alpha', updated: 'Updated 2 hours ago', owner: 'Alice Chen' }
 *   const [editing, setEditing] = useState(false)
 *   return (
 *     <DetailHeader
 *       title={project.name}
 *       subtitle={project.updated}
 *       status={<StatusBadge kind="success">{t('status.active', undefined, { defaultValue: 'Active' })}</StatusBadge>}
 *       actions={
 *         <Button variant="solid" onClick={() => setEditing(true)} disabled={editing}>
 *           {t('common.edit', undefined, { defaultValue: 'Edit' })}
 *         </Button>
 *       }
 *       meta={<span>{project.owner}</span>}
 *       sticky
 *       className={cm.surface}
 *       dataMolId="project-header"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - `sticky` applies `position: sticky; top: 0` but adds NO background — pass a surface class
 *   via `className` (e.g. `getClassMap().surface`) or content will scroll visibly through the
 *   header.
 * - There is no breadcrumb prop; put a breadcrumb in the `leading` slot or
 *   render one above the header (see
 *   `@molecule/app-detail-page-layout-react`, which has a breadcrumb slot).
 * - `title` renders as the page's `<h1>` — do not add another `<h1>` beside it.
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup). No text of its own, so no locale
 *   bond is needed; translate the values you pass in.
 *
 * @module
 */

export * from './DetailHeader.js'
