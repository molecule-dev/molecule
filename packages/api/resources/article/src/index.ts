/**
 * Articles and blog posts for molecule.dev.
 *
 * Articles with unique slugs, tags, favorites, a feed of the authors a user
 * follows, and lists filtered by tag, author and who favorited them — the
 * domain of a blog, a Medium-style platform (RealWorld "Conduit"), a news or
 * docs site. Favorites are `@molecule/api-resource-reaction` reactions and the
 * feed reads `@molecule/api-resource-follow`'s follows, so they are the same
 * favorites and follows the rest of the app sees.
 *
 * **Tables this package owns: `articles` and `article_tags`.** The join between them is
 * `article_tags.articleId` = `articles.id` (a declared FK, `ON DELETE CASCADE`; `("articleId", "tag")` is
 * unique, and `article_tags.position` is the order the tags were given in). It also ships
 * `src/__setup__/reactions.sql` and `src/__setup__/follows.sql`, which create the `reactions` and `follows` tables it reads by name.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-article'
 *
 * // Wire routes into your Express app via mlcl inject:
 * // POST   /articles                   create (signed in)
 * // GET    /articles                   ?tag= &author= &favoritedBy= &limit= &offset=
 * // GET    /articles/feed              authors the signed-in user follows
 * // GET    /articles/tags              every tag in use, most-used first (?limit= caps it)
 * // GET    /articles/:slug
 * // PUT    /articles/:slug             author only; a new title gives a new slug
 * // DELETE /articles/:slug             author only
 * // POST   /articles/:slug/favorite    idempotent
 * // DELETE /articles/:slug/favorite    idempotent
 * ```
 *
 * @example
 * ```typescript
 * // An API with its own response shape (a spec you must match) uses the
 * // service and writes its own envelope:
 * import { createArticle, listArticles } from '@molecule/api-resource-article'
 *
 * router.post('/api/articles', authenticate, async (req, res) => {
 *   const article = await createArticle(userId, req.body.article)
 *   res.status(201).json({ article: { ...article, author: await profileOf(article.authorId) } })
 * })
 *
 * const page = await listArticles({ tag: 'dragons', limit: 20, offset: 0, viewerId })
 * // page.data[0].favorited, page.data[0].favoritesCount, page.total
 * ```
 *
 * @example
 * ```typescript
 * // RealWorld's `GET /api/tags` returns EVERY tag in use — that is `allTags()`,
 * // not `popularTags()`, whose default is the top 20:
 * import { allTags } from '@molecule/api-resource-article'
 *
 * router.get('/api/tags', async (_req, res) => {
 *   res.json({ tags: (await allTags()).map((tag) => tag.tag) })
 * })
 * ```
 *
 * @remarks
 * - **A scaffold that lists this package already has these tables** — its `__setup__` SQL is
 *   copied into the app at create time and replayed on every boot, so do not copy it into
 *   `api/migrations/` yourself. This package ships every table it reads, four in
 *   all. `src/__setup__/articles.sql` creates the `articles` and `article_tags` tables;
 *   `src/__setup__/articles_position.sql` adds the `position` column to a database whose
 *   `article_tags` predates it; `src/__setup__/reactions.sql` and `src/__setup__/follows.sql` create the
 *   `reactions` and `follows` tables, which this package reads directly by name
 *   on every response (favorites) and on its feed (who a reader follows). Those
 *   last two are copies of `@molecule/api-resource-reaction`'s and
 *   `@molecule/api-resource-follow`'s own setup files, statement for statement,
 *   and each creates its table only if it is not there yet, so an app that also
 *   installs those packages runs both copies harmlessly. A scaffold copies the
 *   tables a package's registry entry declares, and this one declares all four,
 *   so a project that installs only this package gets every table its endpoints
 *   need. Applying `src/__setup__/articles.sql` alone leaves every article response failing
 *   with `no such table: reactions`.
 * - **`article_tags` keeps the order the tags were given in**, in its `position`
 *   column (0-based). An app that reads the join table itself must order by
 *   `position` — a submission-order assertion (`tagList[0]`, `tagList[1]`) reads
 *   the wrong tag otherwise. `Article.tagList` is already in that order.
 * - **Tags: `allTags()` is every tag in use; `popularTags(limit)` is the top 20
 *   by default.** A `GET /tags` endpoint (RealWorld's `GET /api/tags`, which
 *   returns the whole list) built on `popularTags()` with no argument drops
 *   every tag past the twentieth as soon as the database holds more than 20 —
 *   call `allTags()` for that endpoint, and pass a `limit` only where the caller
 *   asked for the N most-used. The package's own `GET /articles/tags` route does
 *   exactly this: no `?limit=` is the whole list.
 * - **Lists are newest first and paginated** — `{ data, total, limit, offset }`,
 *   at most 100 per page. `createdAt` is written with milliseconds, so two
 *   articles from the same second still come back in order on SQLite.
 * - **Slugs are unique and stable.** The first "Hello World" is `hello-world`,
 *   the next `hello-world-2`; `feed` and `tags` are never used (they are routes).
 *   Changing the title changes the slug — link with the slug the response returns.
 * - **The author is the session user**, always: create ignores any client
 *   author, and update/delete answer 403 to anyone else.
 * - **Reads are public**; `favorited` is `false` without a signed-in viewer.
 * - Article bodies are stored as given. Render markdown with
 *   `@molecule/app-markdown` + a provider (sanitized HTML) on the client.
 * - Comments on articles: `@molecule/api-resource-comment` with resource type
 *   `'article'` and the article id. An API whose comment ids are integers
 *   (RealWorld's) creates them with its `createNumberedComment` and finds them with
 *   `getCommentByNumber`.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Publishing an article opens its page at the slug the API returned,
 *   and it shows first in the global list.
 * - [ ] Two articles with the same title get different slugs and both open.
 * - [ ] Filtering by a tag shows only articles with that tag.
 * - [ ] Favoriting increments the count, survives a reload, and unfavoriting
 *   brings it back; a signed-out visitor sees the count but no "favorited".
 * - [ ] The feed shows only articles by followed authors, and an empty feed
 *   shows a readable empty state.
 * - [ ] Only the author sees edit/delete; another user's direct attempt is refused.
 * - [ ] Deleting removes the article from every list after reload.
 */

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
