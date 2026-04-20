/**
 * Static analysis scanner that reads handler files from mlcl templates
 * and produces endpoint definitions. Uses regex-based AST parsing.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

import type {
  EndpointDefinition,
  HandlerScanResult,
  HttpMethod,
  ResponseHint,
  ZodSchemaDefinition,
} from '../types.js'

/* ------------------------------------------------------------------ */
/*  Regex-based parsing                                                */
/* ------------------------------------------------------------------ */

/**
 * Pattern for router.use() calls in index.ts:
 * router.use('/accounts', accounts)
 */
const ROUTER_USE_RE = /router\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g

/**
 * Pattern for router.method() calls in handler files:
 * router.get('/', async ...)
 * router.post('/', validateBody(schema), async ...)
 * router.put('/:id', validateBody(schema), async ...)
 * Uses a permissive capture for the middleware chain to handle nested parentheses.
 */
const ROUTER_METHOD_RE =
  /router\.(get|post|put|delete)\(\s*['"]([^'"]+)['"]\s*,\s*([\s\S]*?)\basync\b/g

/**
 * Pattern for validateBody(schemaName) in middleware chain
 */
const VALIDATE_BODY_RE = /validateBody\(\s*(\w+)\s*\)/

/**
 * Pattern for getUserId(res) auth check
 */
const GET_USER_ID_RE = /getUserId\(res\)|res\.locals\.session\??\.\s*userId/

/**
 * Pattern for paginated responses: { data: ..., total: ..., page: ..., limit: ... }
 */
const PAGINATED_RE = /res\.json\(\s*\{\s*data\s*:/

/**
 * Pattern for z.object({ ... }) - capture the full object body
 */
const ZOD_OBJECT_RE = /const\s+(\w+)\s*=\s*z\.object\(\{([\s\S]*?)\}\)/g

/**
 * Pattern for individual field in z.object
 */
const ZOD_FIELD_RE = /(\w+)\s*:\s*z\.(\w+)\(([^)]*)\)([.\w()'"]*)/g

/**
 * Scan all handler files for a given app type and produce endpoint definitions.
 * @param handlersPath - Path to the handlers directory
 * @param appType - The app type name
 * @returns The scan result with all discovered endpoints
 */
export function scanHandlers(handlersPath: string, appType: string): HandlerScanResult {
  if (!existsSync(handlersPath)) {
    return { appType, endpoints: [], resources: [] }
  }

  // Read index.ts to find route prefixes
  const indexPath = join(handlersPath, 'index.ts')
  const indexSource = existsSync(indexPath) ? readFileSync(indexPath, 'utf-8') : ''

  // Map: handler variable name -> route prefix
  const prefixMap = new Map<string, string>()
  let match: RegExpExecArray | null

  ROUTER_USE_RE.lastIndex = 0
  while ((match = ROUTER_USE_RE.exec(indexSource)) !== null) {
    const prefix = match[1]
    const varName = match[2]
    prefixMap.set(varName, prefix)
  }

  // Scan each handler file
  const endpoints: EndpointDefinition[] = []
  const resources = new Set<string>()

  const files = readdirSync(handlersPath).filter((f) => f.endsWith('.ts') && f !== 'index.ts')

  for (const file of files) {
    const filePath = join(handlersPath, file)
    const source = readFileSync(filePath, 'utf-8')
    const handlerName = basename(file, '.ts')

    // Find the prefix for this handler
    let prefix = ''
    for (const [varName, routePrefix] of prefixMap) {
      if (varName === handlerName || varName === handlerName.replace(/-/g, '')) {
        prefix = routePrefix
        break
      }
    }

    // If no prefix found, derive from filename
    if (!prefix) {
      prefix = `/${handlerName}`
    }

    resources.add(handlerName)

    // Parse Zod schemas in this file
    const schemas = parseZodSchemas(source)

    // Find all router method calls
    const hasAuth = GET_USER_ID_RE.test(source)
    const isPaginated = PAGINATED_RE.test(source)

    ROUTER_METHOD_RE.lastIndex = 0
    while ((match = ROUTER_METHOD_RE.exec(source)) !== null) {
      const method = match[1].toUpperCase() as HttpMethod
      const routePath = match[2]
      const middlewareChain = match[3] || ''

      const fullPath = `${prefix}${routePath === '/' ? '' : routePath}`

      // Check for validateBody in middleware
      let bodySchema: ZodSchemaDefinition | undefined
      const validateMatch = VALIDATE_BODY_RE.exec(middlewareChain)
      if (validateMatch) {
        const schemaName = validateMatch[1]
        bodySchema = schemas.get(schemaName)
      }

      // Determine response hints
      const responseHints = inferResponseHints(
        method,
        fullPath,
        handlerName,
        isPaginated && method === 'GET' && routePath === '/',
        source,
      )

      endpoints.push({
        method,
        path: fullPath,
        bodySchema,
        requiresAuth: hasAuth,
        responseHints,
      })
    }
  }

  return {
    appType,
    endpoints,
    resources: [...resources],
  }
}

/**
 * Parse Zod schema definitions from source code.
 * Returns a map of schema variable names to serialized definitions.
 * @param source
 */
function parseZodSchemas(source: string): Map<string, ZodSchemaDefinition> {
  const schemas = new Map<string, ZodSchemaDefinition>()

  ZOD_OBJECT_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = ZOD_OBJECT_RE.exec(source)) !== null) {
    const name = match[1]
    const body = match[2]
    const shape = parseZodObjectBody(body)
    schemas.set(name, { type: 'ZodObject', shape })
  }

  return schemas
}

/**
 * Parse the body of a z.object({ ... }) call into field definitions.
 * @param body
 */
function parseZodObjectBody(body: string): Record<string, ZodSchemaDefinition> {
  const shape: Record<string, ZodSchemaDefinition> = {}

  ZOD_FIELD_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = ZOD_FIELD_RE.exec(body)) !== null) {
    const fieldName = match[1]
    const zodType = match[2]
    const args = match[3]
    const chain = match[4] || ''

    shape[fieldName] = parseZodField(zodType, args, chain)
  }

  return shape
}

/**
 * Parse a single Zod field definition into a schema definition.
 * @param zodType
 * @param args
 * @param chain
 */
function parseZodField(zodType: string, args: string, chain: string): ZodSchemaDefinition {
  const constraints: ZodSchemaDefinition['constraints'] = {}

  // Check chain modifiers
  if (chain.includes('.optional()')) {
    const inner = parseZodField(zodType, args, chain.replace('.optional()', ''))
    return { type: 'ZodOptional', innerType: inner }
  }

  if (chain.includes('.nullable()')) {
    const inner = parseZodField(zodType, args, chain.replace('.nullable()', ''))
    return { type: 'ZodNullable', innerType: inner }
  }

  const defaultMatch = chain.match(/\.default\(([^)]+)\)/)
  if (defaultMatch) {
    const inner = parseZodField(zodType, args, chain.replace(defaultMatch[0], ''))
    let defaultValue: unknown = defaultMatch[1]
    try {
      defaultValue = JSON.parse(defaultMatch[1].replace(/'/g, '"'))
    } catch {
      // Keep as string
    }
    return { type: 'ZodDefault', innerType: inner, defaultValue }
  }

  // Parse constraints from chain
  const minMatch = chain.match(/\.min\((\d+)\)/)
  if (minMatch) constraints.min = Number(minMatch[1])

  const maxMatch = chain.match(/\.max\((\d+)\)/)
  if (maxMatch) constraints.max = Number(maxMatch[1])

  if (chain.includes('.positive()')) constraints.positive = true
  if (chain.includes('.int()')) constraints.int = true

  switch (zodType) {
    case 'string':
      return { type: 'ZodString', constraints }

    case 'number':
      return { type: 'ZodNumber', constraints }

    case 'boolean':
      return { type: 'ZodBoolean' }

    case 'enum': {
      const enumMatch = args.match(/\[\s*([^\]]+)\s*\]/)
      if (enumMatch) {
        const enumValues = enumMatch[1]
          .split(',')
          .map((v) => v.trim().replace(/['"]/g, ''))
          .filter(Boolean)
        return { type: 'ZodEnum', enumValues }
      }
      return { type: 'ZodEnum', enumValues: [] }
    }

    case 'array': {
      const elementMatch = args.match(/z\.(\w+)\(/)
      const elementType: ZodSchemaDefinition = elementMatch
        ? { type: `Zod${elementMatch[1].charAt(0).toUpperCase() + elementMatch[1].slice(1)}` }
        : { type: 'ZodUnknown' }
      return { type: 'ZodArray', elementType }
    }

    case 'object':
      return { type: 'ZodObject', shape: {} }

    default:
      return { type: 'ZodUnknown' }
  }
}

/**
 * Infer response hints for an endpoint based on method, path, and handler source.
 * @param method
 * @param path
 * @param handlerName
 * @param isPaginated
 * @param source
 */
function inferResponseHints(
  method: HttpMethod,
  path: string,
  handlerName: string,
  isPaginated: boolean,
  source: string,
): ResponseHint {
  const isSingle = path.includes(':id') || path.includes(':itemId')
  const isList = method === 'GET' && !isSingle && !path.includes('/reports/')
  const isReport = path.includes('/reports/') || path.includes('/storefront/')

  let resourceName = handlerName
  if (isReport) {
    resourceName = 'reports'
  }

  return {
    isList: isList && !isReport,
    isPaginated,
    hasNestedResources: source.includes('Promise.all') || source.includes('findMany'),
    resourceName,
  }
}

/**
 * Resolve the handlers path for a given app type.
 * Searches standard locations in the mlcl templates directory.
 * @param appType - The app type name
 * @param workspaceRoot - The workspace root directory
 * @returns The resolved handlers path, or undefined if not found
 */
export function resolveHandlersPath(appType: string, workspaceRoot?: string): string | undefined {
  const root = workspaceRoot ?? findWorkspaceRoot()
  if (!root) return undefined

  const candidates = [
    join(root, 'mlcl', 'templates', 'apps', appType, 'api', 'handlers'),
    join(root, 'mlcl', 'templates', appType, 'api', 'handlers'),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return undefined
}

/**
 * Attempt to find the workspace root by walking up from cwd.
 */
function findWorkspaceRoot(): string | undefined {
  let dir = process.cwd()
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'mlcl')) && existsSync(join(dir, 'molecule'))) {
      return dir
    }
    const parent = join(dir, '..')
    if (parent === dir) break
    dir = parent
  }
  return undefined
}
