/**
 * React detail-page layout scaffold.
 *
 * Exports `<DetailPageLayout>` — breadcrumb + top bar + [main column +
 * optional sidebar]. All regions are ReactNode slots.
 *
 * @example
 * ```tsx
 * import { Breadcrumb } from '@molecule/app-breadcrumb-react'
 * import { DetailHeader } from '@molecule/app-detail-header-react'
 * import { DetailPageLayout } from '@molecule/app-detail-page-layout-react'
 * import { t } from '@molecule/app-i18n'
 *
 * export function InvoiceDetailPage() {
 *   const invoice = {
 *     number: 'INV-1042',
 *     customer: 'Acme Corp',
 *     lines: [
 *       { id: 'l1', description: 'Design sprint', amount: '$4,800.00' },
 *       { id: 'l2', description: 'Hosting (June)', amount: '$120.00' },
 *     ],
 *     notes: 'Net 30. Thank you for your business.',
 *   }
 *   return (
 *     <DetailPageLayout
 *       breadcrumb={<Breadcrumb items={[{ label: t('nav.invoices', undefined, { defaultValue: 'Invoices' }), to: '/invoices' }, { label: invoice.number }]} />}
 *       topBar={<DetailHeader title={invoice.number} subtitle={invoice.customer} />}
 *       main={invoice.lines.map((line) => (
 *         <p key={line.id}>
 *           {line.description} — {line.amount}
 *         </p>
 *       ))}
 *       sidebar={
 *         <section>
 *           <h2>{t('form.notes', undefined, { defaultValue: 'Notes' })}</h2>
 *           <p>{invoice.notes}</p>
 *         </section>
 *       }
 *       sidebarPosition="right"
 *       sidebarWidth="md"
 *       dataMolId="invoice-detail"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - `main` is REQUIRED; every other region is optional. It is a slot scaffold only — it fetches
 *   nothing and renders no title/breadcrumb of its own; compose `@molecule/app-breadcrumb-react`
 *   and `@molecule/app-detail-header-react` (or anything) into the slots.
 * - `main` is wrapped in a `<main>` element and `sidebar` in `<aside>` — do not render this
 *   layout inside another `<main>` (e.g. an app shell that already has one).
 * - The layout itself does NOT make `topBar` sticky — it just stacks the regions. Use a slot
 *   component that brings its own stickiness (e.g. `<DetailHeader sticky>`), or wrap your top
 *   bar in a sticky container.
 * - `sidebarWidth` presets are fixed flex-basis widths: sm = 256px, md = 320px, lg = 384px.
 *   There is no built-in responsive collapse — hide the sidebar yourself on narrow viewports
 *   if needed.
 * - Styling resolves through `getClassMap()` — `setClassMap(classMap)` from `@molecule/app-ui`
 *   must run at startup (it throws otherwise). No text of its own, so no locale bond.
 *
 * @module
 */

export * from './DetailPageLayout.js'
