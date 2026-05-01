/**
 * Resource template type definitions.
 *
 * A `Template` is a reusable, versioned snapshot of a resource keyed by
 * (resourceType, slug). Snapshots are arbitrary JSON payloads that may
 * contain `{{variable}}` placeholders, which the `instantiate` helper
 * substitutes when creating a new resource entity from the template.
 *
 * @module
 */

/**
 * A single declared variable a template expects when instantiated.
 */
export interface TemplateVariable {
  /** Variable name, referenced as `{{name}}` in the snapshot. */
  name: string
  /** Optional default value when the caller does not supply one. */
  defaultValue?: string | number | boolean | null
  /** Whether the variable must be provided at instantiation time. */
  required?: boolean
  /** Free-form human-readable description of the variable. */
  description?: string
}

/**
 * A persisted template entry. The `snapshot` field is the raw JSON to
 * clone on instantiation; placeholders inside it are resolved against
 * the supplied `variables` map.
 */
export interface Template {
  /** Unique template identifier. */
  id: string
  /** The type of resource this template materialises (e.g. 'document'). */
  resourceType: string
  /** Human-friendly URL slug, unique within `resourceType`. */
  slug: string
  /** Display name. */
  name: string
  /** Optional long description. */
  description: string | null
  /** Raw JSON snapshot — may contain `{{variable}}` placeholders. */
  snapshot: unknown
  /** Declared variables expected by the snapshot. */
  variables: TemplateVariable[]
  /** Free-form tags for filtering and search. */
  tags: string[]
  /** Monotonic version counter — bumped on every update. */
  version: number
  /** Whether the template is publicly listable. */
  isPublic: boolean
  /** ID of the creating user, if known. */
  createdBy: string | null
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-update timestamp. */
  updatedAt: string
}

/**
 * Filters for listing templates.
 */
export interface TemplateQuery {
  /** Limit results to a specific resource type. */
  resourceType?: string
  /** Restrict to public templates only. */
  publicOnly?: boolean
  /** Filter by creator user ID. */
  createdBy?: string
  /** Match any of the supplied tags. */
  tags?: string[]
  /** Maximum number of rows to return. */
  limit?: number
  /** Number of rows to skip. */
  offset?: number
}

/**
 * A paginated result set.
 */
export interface PaginatedResult<T> {
  /** Items on the current page. */
  data: T[]
  /** Total matching rows across all pages. */
  total: number
  /** Page size. */
  limit: number
  /** Rows skipped before this page. */
  offset: number
}

/**
 * Input for creating a new template.
 */
export interface CreateTemplateInput {
  /** Resource type the template materialises. */
  resourceType: string
  /** Unique slug within `resourceType`. */
  slug: string
  /** Display name. */
  name: string
  /** Optional long description. */
  description?: string | null
  /** Raw JSON snapshot. */
  snapshot: unknown
  /** Declared variables. */
  variables?: TemplateVariable[]
  /** Free-form tags. */
  tags?: string[]
  /** Whether to expose the template publicly. */
  isPublic?: boolean
  /** Creator user ID. */
  createdBy?: string | null
}

/**
 * Input for updating an existing template. Any field omitted is left as-is;
 * `version` is incremented automatically when any field changes.
 */
export interface UpdateTemplateInput {
  /** New display name. */
  name?: string
  /** New description (`null` to clear). */
  description?: string | null
  /** Replace the snapshot wholesale. */
  snapshot?: unknown
  /** Replace the declared variables. */
  variables?: TemplateVariable[]
  /** Replace the tags. */
  tags?: string[]
  /** Toggle public visibility. */
  isPublic?: boolean
}

/**
 * Map of variable name to substitution value.
 */
export type VariableValues = Record<string, string | number | boolean | null | undefined>

/**
 * Result of an instantiation request.
 */
export interface InstantiateResult<T = unknown> {
  /** Cloned snapshot with placeholders resolved. */
  payload: T
  /** Variable map that was actually applied (defaults merged in). */
  resolvedVariables: VariableValues
  /** Variable names that were left unresolved (no value supplied, no default). */
  missingVariables: string[]
}
