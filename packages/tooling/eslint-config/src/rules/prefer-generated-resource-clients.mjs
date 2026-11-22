/** Source literals for a generated API route belong in its resource client. */
import { statSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const DYNAMIC = '\u0000'

const segments = (path) => path.replace(/\/+$/, '').split('/').slice(1)
const parameters = /^(?::[\w-]+|\{[^/{}]+\})$/

/** A route's static segments (null for a parameter) and how many are static. */
function routeShape(path) {
  const parts = segments(path).map((segment) => (parameters.test(segment) ? null : segment))
  return { parts, specificity: parts.filter((part) => part !== null).length }
}

/** The most specific generated routes with a client that a statically known request path matches. */
function matchRoutes(value, routes, apiBase) {
  // An interpolated API origin followed by a static path has the same shape as that path.
  if (value.startsWith(DYNAMIC + '/')) value = value.slice(1)
  if (!value.startsWith('/') || value.startsWith('//')) {
    if (!apiBase.startsWith('http') || !value.startsWith(apiBase + '/')) return []
    value = value.slice(apiBase.length)
  }
  const path = value.split(/[?#]/, 1)[0]
  const prefix = apiBase.startsWith('/') ? apiBase : '/api'
  for (const candidate of [
    path,
    ...(path.startsWith(prefix + '/') ? [path.slice(prefix.length)] : []),
  ]) {
    const parts = segments(candidate)
    const matches = routes.filter(
      (route) =>
        route.parts.length === parts.length &&
        route.parts.every((part, index) =>
          part === null ? parts[index] !== '' : part === parts[index],
        ),
    )
    if (matches.length) {
      const specificity = Math.max(...matches.map((route) => route.specificity))
      return matches.filter((route) => route.specificity === specificity && route.client)
    }
  }
  return []
}

const routerPackage = /^(?:@molecule\/app-routing(?:-[\w-]+)?|react-router(?:-dom)?)$/
const navigationFunctions = new Set([
  'navigate',
  'defineRoute',
  'generatePath',
  'matchPath',
  'matchRoutePattern',
  'resolveLinkPath',
  'routerLinkHref',
])
const navigationHooks = new Set(['useMoleculeNavigate', 'useNavigate'])
const routerFactories = new Set(['getRouter', 'useMoleculeRouter'])

const wrappers = new Set([
  'ChainExpression',
  'TSAsExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
])

const propertyName = (node) => (node.computed ? node.property.value : node.property.name)

/**
 * A test for whether a source literal is a navigation target (a link, a navigate call, a route
 * path, or a `const` read only in those places) rather than an API request.
 */
function navigationTargets(source) {
  /** The variable an identifier resolves to in its scope chain. */
  function binding(node) {
    if (node?.type !== 'Identifier') return undefined
    let scope = source.getScope(node)
    while (scope) {
      const variable = scope.set.get(node.name)
      if (variable) return variable
      scope = scope.upper
    }
  }

  /** The navigation API (`navigate`, `router` or the routing namespace) a node evaluates to. */
  function origin(node, seen = new Set()) {
    if (!node || seen.has(node)) return undefined
    seen.add(node)
    if (wrappers.has(node.type)) return origin(node.expression, seen)
    if (node.type === 'CallExpression') {
      const factory = origin(node.callee, seen)
      if (navigationHooks.has(factory)) return 'navigate'
      if (routerFactories.has(factory)) return 'router'
    }
    if (node.type === 'MemberExpression') {
      const receiver = origin(node.object, seen)
      const name = propertyName(node)
      if (receiver === 'routing namespace' || (receiver === 'router' && name === 'navigate'))
        return name
    }
    const variable = binding(node)
    const [definition] = variable?.defs ?? []
    if (
      definition?.type === 'ImportBinding' &&
      routerPackage.test(definition.parent.source.value)
    ) {
      if (definition.node.type === 'ImportNamespaceSpecifier') return 'routing namespace'
      return definition.node.imported?.name
    }
    if (definition?.type === 'Variable' && definition.parent.kind === 'const') {
      const { id, init } = definition.node
      const source = origin(init, seen)
      if (id.type === 'Identifier') return source
      const property = definition.name.parent
      if (id.type === 'ObjectPattern' && source === 'router' && property.type === 'Property') {
        const key = property.computed ? property.key.value : property.key.name
        if (property.value === definition.name && key === 'navigate') return 'navigate'
      }
    }
  }

  /** Whether a value reaches a navigation call or link as its target. */
  function destination(node) {
    let parent = node.parent
    while (
      (parent?.expression === node &&
        (wrappers.has(parent.type) || parent.type === 'JSXExpressionContainer')) ||
      (parent?.type === 'ConditionalExpression' && parent.test !== node)
    ) {
      node = parent
      parent = node.parent
    }
    if (parent?.type === 'JSXAttribute') {
      return (
        ['to', 'href'].includes(parent.name.name) ||
        (parent.name.name === 'path' && parent.parent.name.name === 'Route')
      )
    }
    if (parent?.type === 'CallExpression') {
      const name = origin(parent.callee)
      return (
        (parent.arguments[0] === node && navigationFunctions.has(name)) ||
        (parent.arguments[1] === node && ['matchPath', 'matchRoutePattern'].includes(name))
      )
    }
    return false
  }

  return (node) => {
    if (destination(node)) return true
    const declaration = node.parent
    if (
      declaration?.type !== 'VariableDeclarator' ||
      declaration.init !== node ||
      declaration.id.type !== 'Identifier' ||
      declaration.parent.kind !== 'const' ||
      declaration.parent.parent.type === 'ExportNamedDeclaration'
    )
      return false
    const reads = binding(declaration.id)?.references.filter((reference) => reference.isRead())
    return Boolean(reads?.length && reads.every(({ identifier }) => destination(identifier)))
  }
}

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Use the generated resource client for API routes it covers.' },
    schema: [{ type: 'object' }],
    messages: {
      generatedClient: 'Use {{calls}} from `{{module}}` for the API route `{{route}}`.',
    },
  },
  create(context) {
    const { registrations, apiBase = '/api' } = context.options[0]
    const routes = registrations.flatMap(({ clients, uncovered }) => [
      ...clients.flatMap((client) =>
        client.routes.map((route) => ({ ...routeShape(route.path), route, client })),
      ),
      ...uncovered.map((path) => routeShape(path)),
    ])
    const isNavigation = navigationTargets(context.sourceCode)
    const base = apiBase.replace(/\/+$/, '')

    const report = (node, value) => {
      if (
        !value ||
        (!value.startsWith('/') && !value.startsWith(DYNAMIC) && !value.startsWith('http'))
      )
        return
      const matches = matchRoutes(value, routes, base)
      if (!matches.length || isNavigation(node)) return
      const { client, route } = matches[0]
      const calls = matches
        .filter((entry) => entry.client === client)
        .map(({ route }) => `\`${route.exportName}\` (${route.methods})`)
      context.report({
        node,
        messageId: 'generatedClient',
        data: { calls: [...new Set(calls)].join(' or '), module: client.path, route: route.path },
      })
    }
    return {
      Literal(node) {
        if (typeof node.value === 'string') report(node, node.value)
      },
      TemplateLiteral(node) {
        if (node.quasis.some((quasi) => quasi.value.cooked === null)) return
        let value = node.quasis[0].value.cooked
        for (const [index, expression] of node.expressions.entries()) {
          const literal =
            expression.type === 'Literal' && ['string', 'number'].includes(typeof expression.value)
              ? String(expression.value)
              : DYNAMIC
          value += literal + node.quasis[index + 1].value.cooked
        }
        report(node, value)
      },
    }
  },
}

/**
 * Install the rule only in a workspace that has generated clients. Load this check even when
 * the app never imported a missing client, so a recursive removal cannot make lint pass.
 */
export function generatedResourceClientConfig(registrations, configUrl, apiBase) {
  if (!registrations.length) return []
  for (const { args, clients } of registrations) {
    for (const { path, view } of clients) {
      for (const file of [path, ...(view ? [view] : [])]) {
        if (!statSync(new URL(file, configUrl), { throwIfNoEntry: false })?.isFile()) {
          const command = args.map((arg) => (/^[\w./@-]+$/.test(arg) ? arg : JSON.stringify(arg)))
          throw new Error(
            `Generated resource client ${file} is missing. Run mlcl resources ${command.join(' ')} from the project root.`,
          )
        }
      }
    }
  }
  return [
    {
      basePath: dirname(fileURLToPath(configUrl)),
      ignores: ['eslint.config.*', 'eslint-rules/**', 'src/resources/**'],
      plugins: { 'molecule-resources': { rules: { 'prefer-generated-client': rule } } },
      rules: {
        'molecule-resources/prefer-generated-client': ['error', { registrations, apiBase }],
      },
    },
  ]
}
