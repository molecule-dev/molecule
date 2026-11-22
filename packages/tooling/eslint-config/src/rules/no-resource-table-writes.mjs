import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { URL } from 'node:url'

const database = '@molecule/api-database'
const mutations = new Set(['create', 'updateById', 'updateMany', 'deleteById', 'deleteMany'])
const databaseAccessors = new Map([
  ['getStore', 'store'],
  ['getPool', 'pool'],
])
const databaseReceivers = new Set(['namespace', ...databaseAccessors.values()])
const sourceExtensions = new Map([
  ['.js', '.ts'],
  ['.mjs', '.mts'],
  ['.cjs', '.cts'],
])

/** Package setup uses unqualified, conditional CREATEs so an app can define its own schema. */
function appTables(directory) {
  let migrations
  try {
    migrations = readdirSync(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return new Set()
    throw error
  }
  const seen = new Set()
  const app = new Set()
  for (const file of migrations
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort()) {
    if (!file.endsWith('.sql')) continue
    const sql = readFileSync(new URL(encodeURIComponent(file), directory), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*--[^\n]*/gm, '')
    for (const [, conditional, schema, quoted, bare] of sql.matchAll(
      /^\s*CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(?:(public|"public")\s*\.\s*)?(?:"([^"]+)"|(\w+))\s*\(/gim,
    )) {
      const name = quoted ?? bare.toLowerCase()
      if (!seen.has(name) && (!conditional || schema)) app.add(name)
      seen.add(name)
    }
  }
  return app
}

/** Match installed package tables to their public mutation APIs once per workspace config. */
export function resourceTableOwners(resources, dependencies, migrations) {
  const installed = resources.filter((entry) => Object.hasOwn(dependencies, entry.package))
  if (!installed.length) return {}
  const app = appTables(migrations)
  const tables = new Map()
  for (const resource of installed) {
    for (const table of resource.tables) {
      if (app.has(table)) continue
      const services = Object.hasOwn(resource.services, table) ? resource.services[table] : []
      const owners = tables.get(table) ?? { packages: [], services: [] }
      owners.packages.push(`the ${resource.package} service API`)
      if (services.length) owners.services.push(`${resource.package}'s ${services.join(', ')}`)
      tables.set(table, owners)
    }
  }
  return Object.fromEntries(
    [...tables].map(([table, { packages, services }]) => [
      table,
      (services.length ? services : packages).join(' or '),
    ]),
  )
}

/** The expression inside optional chains and TypeScript assertions. */
function unwrap(node) {
  while (
    node &&
    ['ChainExpression', 'TSAsExpression', 'TSNonNullExpression', 'TSSatisfiesExpression'].includes(
      node.type,
    )
  ) {
    node = node.expression
  }
  return node
}

/** The variable an identifier resolves to in its scope chain. */
function variableFor(source, node) {
  if (node?.type !== 'Identifier') return undefined
  for (let scope = source.getScope(node); scope; scope = scope.upper) {
    const variable = scope.set.get(node.name)
    if (variable) return variable
  }
}

/** The declarator of a variable declared once with `const`. */
function constant(variable) {
  const def = variable?.defs.length === 1 ? variable.defs[0] : undefined
  if (def?.type === 'Variable' && def.parent.kind === 'const') return def.node
}

/** The static string an expression evaluates to, following `const` aliases; a template with a static head gives that head when `allowPrefix` is set. */
function stringValue(binding, expression, seen = new Set(), allowPrefix = false) {
  const node = unwrap(expression)
  if (!node || seen.has(node)) return undefined
  seen.add(node)
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node.type === 'TemplateLiteral') {
    const prefix = node.quasis[0].value.cooked
    if (!node.expressions.length) return prefix
    if (allowPrefix && prefix != null) return `${prefix}\0`
  }
  const declaration = constant(binding(node))
  if (declaration?.id.type === 'Identifier')
    return stringValue(binding, declaration.init, seen, allowPrefix)
}

/** The static name of a member read or object key. */
function propertyName(binding, node, seen) {
  const key = node.property ?? node.key
  return !node.computed && key.type === 'Identifier' ? key.name : stringValue(binding, key, seen)
}

/** Follow imports and local const aliases of the database namespace, store and pool. */
function databaseMember(binding, expression, seen = new Set()) {
  const node = unwrap(expression)
  if (!node || seen.has(node)) return undefined
  seen.add(node)
  if (node.type === 'CallExpression')
    return databaseAccessors.get(databaseMember(binding, node.callee, seen))
  if (node.type === 'MemberExpression') {
    const receiver = databaseMember(binding, node.object, seen)
    if (databaseReceivers.has(receiver)) return propertyName(binding, node, seen)
    return undefined
  }
  const variable = binding(node)
  const def = variable?.defs.length === 1 ? variable.defs[0] : undefined
  if (def?.type === 'ImportBinding' && def.parent.source.value === database) {
    if (def.node.type === 'ImportNamespaceSpecifier') return 'namespace'
    if (def.node.type === 'ImportSpecifier') return def.node.imported.name
  }
  const declaration = constant(variable)
  if (!declaration) return undefined
  if (declaration.id.type === 'Identifier') return databaseMember(binding, declaration.init, seen)
  if (declaration.id.type === 'ObjectPattern') {
    const receiver = databaseMember(binding, declaration.init, seen)
    if (!databaseReceivers.has(receiver)) return undefined
    const member = declaration.id.properties.find(
      (property) => property.type === 'Property' && property.value.name === node.name,
    )
    if (member) return propertyName(binding, member, seen)
  }
}

const SQL_TRIVIA = /^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)*/
const SQL_WRITE =
  /^(?:INSERT(?:\s+OR\s+\w+)?\s+INTO|REPLACE\s+INTO|UPDATE(?:\s+OR\s+\w+)?|DELETE\s+FROM)\s+/i
const SQL_TARGET = /^(?:"(\w+)"|`(\w+)`|\[(\w+)\]|([A-Za-z_]\w*))(?=[\s(;]|$)/

/** Resolve an unqualified mutation target before any dynamic part of the SQL. */
function sqlWriteTable(sql, owners) {
  if (!sql) return undefined
  const prefix = sql.replace(SQL_TRIVIA, '')
  const write = SQL_WRITE.exec(prefix)
  if (!write) return undefined
  const rest = prefix.slice(write[0].length)
  const target = SQL_TARGET.exec(rest)
  if (!target || /^[.\0]/.test(rest.slice(target[0].length).replace(SQL_TRIVIA, '')))
    return undefined
  const [, quoted, backtick, bracket, bare] = target
  return quoted ?? backtick ?? bracket ?? (Object.hasOwn(owners, bare) ? bare : bare.toLowerCase())
}

/** A wrapper must forward its first parameter straight to the bonded query. */
function forwardsQuery(fn, binding) {
  if (!fn?.params?.length || !fn.body) return false
  const param = fn.params[0]
  const parameter = param.type === 'AssignmentPattern' ? param.left : param
  if (parameter.type !== 'Identifier') return false
  let expression = fn.body
  if (fn.body.type === 'BlockStatement') {
    const [first] = fn.body.body
    expression =
      first?.type === 'VariableDeclaration'
        ? first.declarations[0].init
        : (first?.argument ?? first?.expression)
  }
  const value = unwrap(expression)
  const call = value?.type === 'AwaitExpression' ? unwrap(value.argument) : value
  if (call?.type !== 'CallExpression' || databaseMember(binding, call.callee) !== 'query')
    return false
  const sql = binding(unwrap(call.arguments[0]))
  return (
    sql?.defs[0]?.name === parameter && !sql.references.some((ref) => ref.isWrite() && !ref.init)
  )
}

/** The names of the query functions a module exports, read by parsing that file. */
function exportedQueries(context, file) {
  const names = new Set()
  let parsed
  try {
    parsed = context.languageOptions.parser?.parseForESLint?.(readFileSync(file, 'utf8'), {
      filePath: file,
      sourceType: 'module',
      project: false,
      projectService: false,
      tsconfigRootDir: context.cwd,
    })
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code)) return null
    if (error.name === 'TSError' || error instanceof SyntaxError) return names
    throw error
  }
  if (!parsed?.scopeManager) return names

  const references = new Map()
  for (const scope of parsed.scopeManager.scopes)
    for (const ref of scope.references) references.set(ref.identifier, ref.resolved)
  const binding = (node) => references.get(node)
  for (const node of parsed.ast.body) {
    const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : null
    if (declaration?.type === 'FunctionDeclaration' && forwardsQuery(declaration, binding))
      names.add(declaration.id.name)
    if (declaration?.type === 'VariableDeclaration' && declaration.kind === 'const') {
      for (const { id, init } of declaration.declarations)
        if (id.type === 'Identifier' && forwardsQuery(unwrap(init), binding)) names.add(id.name)
    }
  }
  return names
}

/** Parse local named wrappers on demand, without loading project modules. */
function queryCalls(context, binding) {
  const modules = new Map()
  return (expression) => {
    const callee = unwrap(expression)
    if (databaseMember(binding, callee) === 'query') return true
    const variable = binding(callee)
    if (variable?.defs.length !== 1) return false
    const [def] = variable.defs
    if (def.type !== 'ImportBinding')
      return forwardsQuery(
        def.type === 'FunctionName' ? def.node : unwrap(constant(variable)?.init),
        binding,
      )

    const specifier = def.parent.source.value
    if (def.node.type !== 'ImportSpecifier' || !/^\.\.?\//.test(specifier)) return false
    const file = resolve(dirname(context.physicalFilename), specifier)
    const rootPath = relative(context.cwd, file)
    if (isAbsolute(rootPath) || rootPath === '..' || rootPath.startsWith(`..${sep}`)) return false
    if (!modules.has(file)) {
      const extension = extname(file)
      const substitute = sourceExtensions.get(extension)
      const sources = substitute ? [file.slice(0, -extension.length) + substitute, file] : [file]
      if (!extension) sources.push(`${file}.ts`, `${file}.js`)
      let names
      for (const source of sources) {
        names = exportedQueries(context, source)
        if (names) break
      }
      modules.set(file, names)
    }
    return modules.get(file)?.has(def.node.imported.name) ?? false
  }
}

export default {
  meta: {
    type: 'problem',
    schema: [{ type: 'object', additionalProperties: { type: 'string' } }],
    messages: {
      resourceWrite: 'Use {{service}} to write to the package-owned {{table}} table.',
    },
  },
  create(context) {
    const owners = context.options[0]
    if (!owners || Object.keys(owners).length === 0) return {}
    const binding = (node) => variableFor(context.sourceCode, node)
    const isQuery = queryCalls(context, binding)
    const report = (node, table) =>
      context.report({ node, messageId: 'resourceWrite', data: { table, service: owners[table] } })
    return {
      CallExpression(node) {
        const target = node.arguments[0]
        const text = stringValue(binding, target, undefined, true)
        if (!text) return
        if (Object.hasOwn(owners, text) && mutations.has(databaseMember(binding, node.callee)))
          report(node, text)
        const table = sqlWriteTable(text, owners)
        if (table && Object.hasOwn(owners, table) && isQuery(node.callee)) report(target, table)
      },
    }
  },
}
