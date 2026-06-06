/**
 * React card container for cross-linked / related item lists.
 *
 * Exports `<RelatedItemsCard>` — titled Card with header + list + empty state + "View all" link.
 * Use for "Company → Deals", "Contact → Notes", "Ticket → Related Articles" panels.
 *
 * @example
 * ```tsx
 * import { RelatedItemsCard } from '@molecule/app-related-items-card-react'
 *
 * <RelatedItemsCard
 *   title="Related Articles"
 *   items={articles}
 *   viewAllHref="/articles"
 *   emptyState={<p>No related articles yet.</p>}
 *   renderItem={(article) => (
 *     <span>{article.title}</span>
 *   )}
 *   onItemClick={(article) => navigate(`/articles/${article.id}`)}
 * />
 * ```
 * @module
 */

export * from './RelatedItemsCard.js'
