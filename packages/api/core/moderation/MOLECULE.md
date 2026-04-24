# @molecule/api-content-moderation

Content moderation core interface for molecule.dev.

Defines the abstract contract for AI-powered content moderation and
user report management. Bond a concrete provider (e.g., one backed
by `@molecule/api-ai`) to enable moderation in your application.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-content-moderation'
import type { ContentModerationProvider } from '@molecule/api-content-moderation'

// Bond a provider at startup
setProvider(myModerationProvider)

// Use anywhere in the app
const moderation = requireProvider()
const result = await moderation.check('some user content')
if (result.flagged) {
  console.log('Content flagged:', result.categories)
}
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-content-moderation
```

## API

### Interfaces

#### `ContentModerationConfig`

Configuration for the content moderation provider.

```typescript
interface ContentModerationConfig {
  /** Default score threshold above which content is flagged (0–1). */
  threshold?: number
  /** Categories to check by default. */
  defaultCategories?: string[]
  /** Whether to include reasoning in moderation results. */
  includeReasoning?: boolean
}
```

#### `ContentModerationProvider`

Content moderation provider interface.

Implement this interface in a bond package to provide concrete
content moderation (e.g., via `@molecule/api-ai`) and report
management (e.g., via `@molecule/api-database`).

```typescript
interface ContentModerationProvider {
  /** Provider name (e.g. 'ai-moderation', 'perspective-api'). */
  readonly name: string

  /**
   * Checks text content against moderation rules.
   *
   * @param content - The text content to check.
   * @param options - Optional moderation configuration.
   * @returns The moderation result with per-category scores.
   */
  check(content: string, options?: ModerationOptions): Promise<ModerationResult>

  /**
   * Checks image content against moderation rules.
   *
   * @param image - The image data as a byte array.
   * @param options - Optional moderation configuration.
   * @returns The moderation result with per-category scores.
   */
  checkImage(image: Uint8Array, options?: ModerationOptions): Promise<ModerationResult>

  /**
   * Submits a user report against a resource.
   *
   * @param input - The report creation input.
   * @returns The created report.
   */
  report(input: CreateReportInput): Promise<Report>

  /**
   * Retrieves reports with optional filtering and pagination.
   *
   * @param options - Query and pagination options.
   * @returns A paginated result of reports.
   */
  getReports(options?: ReportQuery): Promise<PaginatedResult<Report>>

  /**
   * Resolves a pending report with a moderation decision.
   *
   * @param reportId - The ID of the report to resolve.
   * @param resolution - The resolution action and details.
   */
  resolveReport(reportId: string, resolution: Resolution): Promise<void>
}
```

#### `CreateReportInput`

Input for creating a new report.

```typescript
interface CreateReportInput {
  /** The type of resource being reported. */
  resourceType: string
  /** The ID of the resource being reported. */
  resourceId: string
  /** The ID of the user submitting the report. */
  reporterId: string
  /** The reason for the report. */
  reason: string
}
```

#### `ModerationCategoryResult`

Per-category result from a moderation check.

```typescript
interface ModerationCategoryResult {
  /** The category that was evaluated. */
  category: string
  /** Whether the content was flagged in this category. */
  flagged: boolean
  /** Confidence score between 0 and 1. */
  score: number
}
```

#### `ModerationOptions`

Options for configuring a moderation check.

```typescript
interface ModerationOptions {
  /** Limit checking to specific categories. Defaults to all categories. */
  categories?: string[]
  /** Score threshold above which content is flagged (0–1). Defaults to provider-specific value. */
  threshold?: number
  /** Additional context to help the moderation model make a decision. */
  context?: string
}
```

#### `ModerationResult`

Result of checking content against moderation rules.

```typescript
interface ModerationResult {
  /** Whether the content was flagged by any category. */
  flagged: boolean
  /** Per-category breakdown of the moderation result. */
  categories: ModerationCategoryResult[]
  /** Optional reasoning explaining why content was or was not flagged. */
  reasoning?: string
}
```

#### `PaginatedResult`

A paginated result set.

```typescript
interface PaginatedResult<T> {
  /** The result items for the current page. */
  data: T[]
  /** Total number of matching items across all pages. */
  total: number
  /** Maximum number of results per page. */
  limit: number
  /** Number of results skipped. */
  offset: number
}
```

#### `PaginationOptions`

Options for paginated queries.

```typescript
interface PaginationOptions {
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip. */
  offset?: number
}
```

#### `Report`

A user-submitted report against a resource.

```typescript
interface Report {
  /** Unique report identifier. */
  id: string
  /** The type of resource being reported (e.g. 'comment', 'post'). */
  resourceType: string
  /** The ID of the resource being reported. */
  resourceId: string
  /** The ID of the user who submitted the report. */
  reporterId: string
  /** The reason for the report. */
  reason: string
  /** Current status of the report. */
  status: ReportStatus
  /** Resolution details, if resolved. */
  resolution?: string
  /** ID of the moderator who resolved the report. */
  resolvedBy?: string
  /** When the report was created (ISO 8601). */
  createdAt: string
  /** When the report was last updated (ISO 8601). */
  updatedAt: string
}
```

#### `ReportQuery`

Query options for fetching reports.

```typescript
interface ReportQuery {
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip. */
  offset?: number
  /** Filter by report status. */
  status?: ReportStatus
  /** Filter by resource type. */
  resourceType?: string
}
```

#### `Resolution`

Resolution action for a moderation report.

```typescript
interface Resolution {
  /** The action taken on the report. */
  action: 'approve' | 'reject' | 'dismiss'
  /** Optional reason for the resolution. */
  reason?: string
  /** ID of the moderator who resolved the report. */
  resolvedBy: string
}
```

### Types

#### `ModerationCategory`

Category of content violation detected during moderation.

```typescript
type ModerationCategory =
  | 'hate'
  | 'violence'
  | 'sexual'
  | 'self-harm'
  | 'harassment'
  | 'dangerous'
  | 'spam'
  | 'custom'
```

#### `ReportStatus`

Status of a user-submitted report.

```typescript
type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'
```

### Functions

#### `getProvider()`

Retrieves the bonded content moderation provider, or `null` if none is bonded.

```typescript
function getProvider(): ContentModerationProvider | null
```

**Returns:** The bonded provider, or `null`.

#### `hasProvider()`

Checks whether a content moderation provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a provider is bonded.

#### `requireProvider()`

Retrieves the bonded content moderation provider, throwing if none is bonded.
Use this when moderation functionality is required.

```typescript
function requireProvider(): ContentModerationProvider
```

**Returns:** The bonded content moderation provider.

#### `setProvider(provider)`

Registers a content moderation provider.

```typescript
function setProvider(provider: ContentModerationProvider): void
```

- `provider` — The content moderation provider to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
