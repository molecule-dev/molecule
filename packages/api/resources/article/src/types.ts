/**
 * Article resource type definitions.
 *
 * @module
 */

/**
 * An article row as stored. `tagList` is a JSON array of tag names.
 */
export interface ArticleRow {
  /** Unique article identifier. */
  id: string
  /** URL slug, unique across articles. */
  slug: string
  /** Title. */
  title: string
  /** Short summary shown in lists. */
  description: string
  /** Full body (markdown or plain text — the app decides how to render it). */
  body: string
  /** Tag names, JSON-encoded. */
  tagList: string
  /** The user who wrote it. */
  authorId: string
  /** When it was created (ISO 8601, millisecond precision). */
  createdAt: string
  /** When it was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * An article as the service returns it: tags decoded, favorites counted, and
 * whether the viewing user favorited it.
 */
export interface Article {
  /** Unique article identifier. */
  id: string
  /** URL slug, unique across articles. */
  slug: string
  /** Title. */
  title: string
  /** Short summary shown in lists. */
  description: string
  /** Full body. */
  body: string
  /** Tag names, in the order they were given. */
  tagList: string[]
  /** The user who wrote it. */
  authorId: string
  /** When it was created (ISO 8601). */
  createdAt: string
  /** When it was last updated (ISO 8601). */
  updatedAt: string
  /** How many users favorited it. */
  favoritesCount: number
  /** Whether the viewing user favorited it (`false` with no viewer). */
  favorited: boolean
}

/**
 * Input for creating an article.
 */
export interface CreateArticleInput {
  /** Title (the slug is derived from it). */
  title: string
  /** Short summary. */
  description?: string
  /** Full body. */
  body: string
  /** Tag names. */
  tagList?: string[]
}

/**
 * Input for updating an article. A changed title gives the article a new slug.
 */
export interface UpdateArticleInput {
  /** New title. */
  title?: string
  /** New summary. */
  description?: string
  /** New body. */
  body?: string
  /** New tag names (replaces the old ones). */
  tagList?: string[]
}

/**
 * Filters and paging for {@link listArticles}.
 */
export interface ListArticlesOptions {
  /** Only articles with this tag. */
  tag?: string
  /** Only articles by this author id. */
  authorId?: string
  /** Only articles this user id favorited. */
  favoritedBy?: string
  /** Page size (default 20, at most 100). */
  limit?: number
  /** Rows to skip. */
  offset?: number
  /** The viewing user, for `favorited`. */
  viewerId?: string
}

/**
 * A page of articles.
 */
export interface PaginatedArticles {
  /** The articles on this page, newest first. */
  data: Article[]
  /** Articles matching the filters across all pages. */
  total: number
  /** Page size used. */
  limit: number
  /** Rows skipped. */
  offset: number
}

/**
 * A tag and how many articles carry it.
 */
export interface TagCount {
  /** Tag name. */
  tag: string
  /** Articles with this tag. */
  count: number
}
