/**
 * Resource template business logic.
 *
 * Pure DataStore-backed CRUD over the `resource-templates` table plus
 * pure-data helpers (`substitute`, `instantiateTemplate`) that resolve
 * `{{variable}}` placeholders inside a template snapshot. No raw SQL —
 * all reads and writes go through the abstract `@molecule/api-database`
 * methods.
 *
 * @module
 */

import {
  create as dbCreate,
  deleteMany,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'

import type {
  CreateTemplateInput,
  InstantiateResult,
  PaginatedResult,
  Template,
  TemplateQuery,
  TemplateVariable,
  UpdateTemplateInput,
  VariableValues,
} from './types.js'

const TABLE = 'resource-templates'

/**
 * Matches a single `{{name}}` placeholder. Whitespace inside the braces
 * is tolerated; the captured group is the bare variable name.
 */
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g

/**
 * Substitutes `{{variable}}` placeholders inside any string value. Numbers,
 * booleans, and `null` are coerced to their JSON-string form. Unknown
 * variables are pushed onto `missing` and left as the original placeholder
 * text.
 *
 * @param input - The template string.
 * @param variables - Map of variable name to value.
 * @param missing - Mutable array collecting unresolved variable names.
 * @returns The substituted string.
 */
export function substituteString(
  input: string,
  variables: VariableValues,
  missing: string[] = [],
): string {
  return input.replace(PLACEHOLDER_RE, (match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(variables, name)) {
      if (!missing.includes(name)) missing.push(name)
      return match
    }
    const value = variables[name]
    if (value === undefined) {
      if (!missing.includes(name)) missing.push(name)
      return match
    }
    if (value === null) return ''
    return String(value)
  })
}

/**
 * Recursively walks a JSON-like value and substitutes placeholders inside
 * any string leaves. Non-string scalars are returned unchanged.
 *
 * @param value - Snapshot value to walk (object, array, scalar, or null).
 * @param variables - Map of variable name to value.
 * @param missing - Mutable array collecting unresolved variable names.
 * @returns A deep clone with placeholders resolved.
 */
export function substitute<T>(value: T, variables: VariableValues, missing: string[] = []): T {
  if (typeof value === 'string') {
    return substituteString(value, variables, missing) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => substitute(item, variables, missing)) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = substitute(item, variables, missing)
    }
    return out as unknown as T
  }
  return value
}

/**
 * Merges declared template defaults with caller-supplied overrides.
 * Caller values take precedence; declared defaults fill in the rest.
 *
 * @param declared - Variable declarations from the template.
 * @param supplied - Caller-supplied variable map.
 * @returns The merged variable map.
 */
export function mergeVariableValues(
  declared: TemplateVariable[],
  supplied: VariableValues = {},
): VariableValues {
  const merged: VariableValues = {}
  for (const decl of declared) {
    if (decl.defaultValue !== undefined) {
      merged[decl.name] = decl.defaultValue
    }
  }
  for (const [key, value] of Object.entries(supplied)) {
    if (value !== undefined) merged[key] = value
  }
  return merged
}

/**
 * Resolves a template's snapshot against a caller-supplied variable map.
 * Declared defaults are merged in for any variable the caller omits.
 *
 * @param template - The template to instantiate.
 * @param variables - Caller-supplied variable values.
 * @returns The resolved payload, the merged variable map, and any
 *          unresolved variable names.
 */
export function instantiateTemplate<T = unknown>(
  template: Pick<Template, 'snapshot' | 'variables'>,
  variables: VariableValues = {},
): InstantiateResult<T> {
  const resolvedVariables = mergeVariableValues(template.variables, variables)
  const missing: string[] = []
  const payload = substitute(template.snapshot, resolvedVariables, missing) as T

  // Required-but-missing variables surface even if no placeholder used them.
  for (const decl of template.variables) {
    if (
      decl.required &&
      (resolvedVariables[decl.name] === undefined || resolvedVariables[decl.name] === null) &&
      !missing.includes(decl.name)
    ) {
      missing.push(decl.name)
    }
  }

  return { payload, resolvedVariables, missingVariables: missing }
}

/**
 * Creates a new template entry. Throws when a row already exists for the
 * same `(resourceType, slug)` pair.
 *
 * @param input - Template creation payload.
 * @returns The persisted template.
 */
export async function createTemplate(input: CreateTemplateInput): Promise<Template> {
  const existing = await findOne<Template>(TABLE, [
    { field: 'resourceType', operator: '=', value: input.resourceType },
    { field: 'slug', operator: '=', value: input.slug },
  ])
  if (existing) {
    const err = new Error('template already exists')
    ;(err as Error & { code?: string }).code = 'conflict'
    throw err
  }

  const result = await dbCreate<Template>(TABLE, {
    resourceType: input.resourceType,
    slug: input.slug,
    name: input.name,
    description: input.description ?? null,
    snapshot: input.snapshot,
    variables: input.variables ?? [],
    tags: input.tags ?? [],
    version: 1,
    isPublic: input.isPublic ?? false,
    createdBy: input.createdBy ?? null,
  })
  return result.data!
}

/**
 * Updates an existing template by ID. Any provided field replaces the
 * stored value; `version` is incremented when at least one field changes.
 *
 * @param id - The template ID.
 * @param patch - Fields to update.
 * @returns The updated template, or `null` when the row does not exist.
 */
export async function updateTemplate(
  id: string,
  patch: UpdateTemplateInput,
): Promise<Template | null> {
  const existing = await findOne<Template>(TABLE, [{ field: 'id', operator: '=', value: id }])
  if (!existing) return null

  const next: Record<string, unknown> = {}
  if (patch.name !== undefined) next.name = patch.name
  if (patch.description !== undefined) next.description = patch.description
  if (patch.snapshot !== undefined) next.snapshot = patch.snapshot
  if (patch.variables !== undefined) next.variables = patch.variables
  if (patch.tags !== undefined) next.tags = patch.tags
  if (patch.isPublic !== undefined) next.isPublic = patch.isPublic

  if (Object.keys(next).length === 0) return existing

  next.version = (existing.version ?? 1) + 1

  const updated = await updateById<Template>(TABLE, id, next)
  return updated.data ?? null
}

/**
 * Returns a single template by ID, or `null` when not found.
 *
 * @param id - The template ID.
 * @returns The template or `null`.
 */
export async function getTemplate(id: string): Promise<Template | null> {
  return findOne<Template>(TABLE, [{ field: 'id', operator: '=', value: id }])
}

/**
 * Returns a single template by `(resourceType, slug)`, or `null` when not
 * found.
 *
 * @param resourceType - The resource type.
 * @param slug - The template slug, unique within the resource type.
 * @returns The template or `null`.
 */
export async function getTemplateBySlug(
  resourceType: string,
  slug: string,
): Promise<Template | null> {
  return findOne<Template>(TABLE, [
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'slug', operator: '=', value: slug },
  ])
}

/**
 * Lists templates visible to the caller, with optional filtering and
 * pagination.
 *
 * Visibility is scoped to the caller (`query.viewerId`): a viewer sees public
 * templates PLUS their own private ones — never another user's private rows.
 * The DataStore's `buildWhere` joins clauses with AND only (there is no OR
 * group), so the visibility OR is realised as two queries (public rows + the
 * viewer's own rows) merged + de-duped in memory. Tag filtering is likewise
 * in-memory (no native JSONB `?|` operator). The table is bounded
 * (admin/user-managed), so the in-memory merge, sort, and pagination are fine —
 * the same justification used for the in-memory tag filter.
 *
 * Filters compose with the visibility scope:
 * - `publicOnly=true` restricts to public rows only (drops the viewer's private).
 * - `createdBy=<X>` is INTERSECTED with the viewer-visible set: a non-owner
 *   `createdBy` still only surfaces that user's PUBLIC rows — a caller can never
 *   page another tenant's private rows via `createdBy`.
 * - When `viewerId` is omitted, only public rows are returned (fail closed).
 *
 * @param query - Filters, viewer scope, and pagination.
 * @returns Paginated list of viewer-visible templates.
 */
export async function listTemplates(query: TemplateQuery = {}): Promise<PaginatedResult<Template>> {
  const limit = query.limit ?? 50
  const offset = query.offset ?? 0
  const viewerId = query.viewerId

  // Filters shared by every sub-query.
  const baseWhere: Array<{ field: string; operator: '='; value: unknown }> = []
  if (query.resourceType) {
    baseWhere.push({ field: 'resourceType', operator: '=', value: query.resourceType })
  }
  if (query.createdBy) {
    baseWhere.push({ field: 'createdBy', operator: '=', value: query.createdBy })
  }

  // The public half of the visibility OR — always part of the result.
  const publicWhere = [...baseWhere, { field: 'isPublic', operator: '=' as const, value: true }]

  // The viewer's own rows are included only when not restricted to public-only
  // AND any client-supplied `createdBy` is not pointed at another user — so a
  // caller cannot page another tenant's private rows via `createdBy=<other>`.
  const includeOwn =
    !query.publicOnly &&
    !!viewerId &&
    (query.createdBy === undefined || query.createdBy === viewerId)

  // Bounded over-fetch (page math happens in memory after the merge).
  const fetchOpts = {
    orderBy: [{ field: 'createdAt', direction: 'desc' as const }],
    limit: Math.max(limit + offset, 200),
    offset: 0,
  }

  const subQueries: Array<Promise<Template[]>> = [
    findMany<Template>(TABLE, { where: publicWhere, ...fetchOpts }),
  ]
  if (includeOwn) {
    const ownWhere = [...baseWhere, { field: 'createdBy', operator: '=' as const, value: viewerId }]
    subQueries.push(findMany<Template>(TABLE, { where: ownWhere, ...fetchOpts }))
  }

  const resultSets = await Promise.all(subQueries)

  // Merge + de-dupe by id (a public row authored by the viewer hits both sets).
  const byId = new Map<string, Template>()
  for (const rows of resultSets) {
    for (const row of rows) byId.set(row.id, row)
  }
  let merged = Array.from(byId.values())

  // In-memory tag filter — DataStore has no native JSONB `?|` operator.
  const tagFilter = query.tags && query.tags.length > 0 ? new Set(query.tags) : null
  if (tagFilter) {
    merged = merged.filter((row) =>
      Array.isArray(row.tags) ? row.tags.some((tag) => tagFilter.has(tag)) : false,
    )
  }

  // Re-sort: the union of two ordered sets is no longer globally ordered.
  merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))

  return {
    data: merged.slice(offset, offset + limit),
    total: merged.length,
    limit,
    offset,
  }
}

/**
 * Deletes a template by ID. Idempotent — returns `false` when no row was
 * deleted (e.g. unknown ID).
 *
 * @param id - The template ID.
 * @returns `true` when a row was deleted.
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  const result = await deleteMany(TABLE, [{ field: 'id', operator: '=', value: id }])
  return (result.affected ?? 0) > 0
}

/**
 * Loads a template and resolves its snapshot against the supplied variable
 * map. Returns `null` when the template does not exist.
 *
 * @param id - The template ID.
 * @param variables - Caller-supplied variable values.
 * @returns The instantiation result, or `null` when not found.
 */
export async function instantiateById<T = unknown>(
  id: string,
  variables: VariableValues = {},
): Promise<InstantiateResult<T> | null> {
  const tpl = await getTemplate(id)
  if (!tpl) return null
  return instantiateTemplate<T>(tpl, variables)
}
