/**
 * Keep declared clients and resource mutation results on the normal verification path.
 *
 * This checks ownership signals, not imports: importing a package does not
 * excuse a second credential store. Public fetches, business API adapters and
 * form state are allowed. An intentionally independent protocol can use ESLint's
 * normal, reasoned disable comment at the narrow call site.
 *
 * Threat model: the rule catches ACCIDENTAL bypass, the shapes a model or a
 * developer writes when it builds its own client instead of using the bonded
 * one. It is not a sandbox against code written to evade it. Every provider-
 * factory creation must be passed, directly or through an immutable local
 * alias, to setClient or an imported bond('http'/'http-client', …) in the same
 * file, handed off through an export, or configured with its own setAuthToken /
 * setAuthTokenResolver credential. The last case deliberately acts independently
 * of the visitor's session. Factory options never establish an exemption.
 *
 * Applicability limit: factory hand-off is a single-module check. An exported client or
 * exported factory is not reported in its defining module; whether an importing
 * composition root bonds it is outside this rule's syntax-only view. The export
 * may be direct, through immutable const aliases, or a local factory's returned
 * value. Sol r11 #2's separate-invocation case (one invocation exported and a
 * different invocation used locally) is therefore an accepted miss.
 * Session-action omissions use React hook identities and the scaffold's literal
 * src/config + direct auth-default bond. Dynamic config and other composition
 * roots are not inferred. Local call discovery does not prove branch timing or
 * the identity of the value passed to a session publisher.
 * Auth snapshot checks cover a custom React hook seeding a combined session
 * snapshot, and a component or hook storing the bonded user's profile and token
 * in separate state slots. Form defaults that project a profile field stay local.
 * A custom storage key is a credential store when the bonded auth config owns it or
 * its written value also feeds the bonded HTTP client's setAuthToken in this module.
 * Independent clients, read-only storage and unrelated values remain separate.
 * The app's HTTP token source, token setters and Authorization overrides use the
 * declared auth client's token. The sink establishes ownership even if the
 * credential comes from another module. Separate services can use their own keys.
 * Restoring the bonded auth client from a browser storage read creates a second
 * session source. Follow the returned value through local and project helpers.
 * Article checks cover awaited updates followed by a lookup using the same lexical
 * slug binding in that function. Cross-module control flow is not inferred.
 * Query checks compare a useQuery key with one extra array around that same binding in a
 * getQueryClient invalidation. Explicit nested keys and different keys remain valid.
 * Value checks follow immutable, module-local bindings: an unconditional identity update of
 * a default optimistic controller and a structured markdown render result at an HTML sink.
 * Conditional updates, custom equality, other stores and other renderers are not inferred.
 * Contract checks reject an imported package value retyped through unknown/any/never
 * into an app-written object with named function members. Local aliases and types are
 * followed; data projections, imported adapter types and dynamic index maps stay valid.
 * A one-parameter legacy auth requestBody is ambiguous: its argument is the operation,
 * not the values. Require the two explicit positions or the payload-first mapRequestBody.
 * Only imported auth config types and local factory inputs establish that ownership;
 * opaque configs, spreads and callbacks are not inferred.
 */
import { readFileSync } from 'node:fs'
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  parse,
  relative,
  resolve,
  sep,
} from 'node:path'
import { URL } from 'node:url'

const AUTH = '@molecule/app-auth'
const HTTP = '@molecule/app-http'
const DEFAULT_API_BASE = '/api'
// mlcl/registry.json's app `http` bond category: the core and every provider factory.
const HTTP_FACTORIES = [
  { module: HTTP, name: 'createFetchClient' },
  { module: '@molecule/app-http-axios', name: 'createAxiosClient' },
]
const INDEPENDENT_API_KEY = /api[_-]?key/i
const TEST =
  /(?:^|[/\\])(?:__tests__|__fixtures__|e2e|fixtures)(?:[/\\]|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/

/** Read only the nearest package: workspace hoisting does not declare a capability. */
function declared(filename, cwd) {
  const file = isAbsolute(filename) ? filename : resolve(cwd, filename)
  let dir = dirname(file)
  for (;;) {
    let text
    try {
      text = readFileSync(join(dir, 'package.json'), 'utf8')
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error
    }
    if (text !== undefined) {
      const pkg = JSON.parse(text)
      const dependencies = {
        ...pkg.dependencies,
        ...pkg.optionalDependencies,
        ...pkg.peerDependencies,
      }
      return {
        root: dir,
        auth:
          pkg.name !== AUTH &&
          basename(dir) !== 'api' &&
          relative(dir, file).split(sep)[0] !== 'api' &&
          Object.hasOwn(dependencies, AUTH),
        http: pkg.name !== HTTP && Object.hasOwn(dependencies, HTTP),
        article: Object.hasOwn(dependencies, '@molecule/api-resource-article'),
        query:
          Object.hasOwn(dependencies, '@molecule/app-query') ||
          Object.hasOwn(dependencies, '@molecule/app-query-react'),
        optimistic:
          Object.hasOwn(dependencies, '@molecule/app-react') ||
          Object.hasOwn(dependencies, '@molecule/app-state'),
        markdown: Object.hasOwn(dependencies, '@molecule/app-markdown'),
      }
    }
    if (dir === parse(dir).root) return { auth: false, http: false }
    dir = dirname(dir)
  }
}

const sessionRepair =
  'Use your app’s login call, then authClient.setSession({ accessToken, user }) and read the session with useAuth(). Storing the token and user together lets the app restore the session immediately on document load.'

/** The value of a string literal or a template literal with no expressions, else null. */
function literalString(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0].value.cooked
  return null
}

/** Return a statically named HTTP host, including its port when present. */
function httpHost(target) {
  if (!target || !/^(?:https?:)?\/\//i.test(target)) return null
  try {
    return new URL(target, 'http://localhost').host
  } catch (_error) {
    // Not a URL: there is no host to name.
    return null
  }
}

export default {
  meta: {
    type: 'problem',
    schema: [],
    docs: {
      description:
        'Use the declared auth and HTTP clients instead of a second session or authenticated transport',
    },
    messages: {
      manifest:
        'Cannot check declared clients: {{reason}}. Repair the nearest package.json before verifying reuse.',
      credential:
        '@molecule/app-auth is declared: this browser credential store duplicates its session. Use the bonded client to sign in or out. For an exact browser key, set tokenKey in the auth config and omit storage: "memory". Configure authScheme in that config, and read getClient().getAccessToken() or the framework auth binding.',
      session:
        'This call restores the bonded auth client from a separate browser store. Set tokenKey in the auth config and use the default browser storage. Configure currentUserEndpoint and any extra currentUserRejectionStatuses there. Read status and user from the framework auth binding.',
      credentialSource:
        'The app’s HTTP token source must read the declared auth client. Use setAuthTokenSource(() => authClient.getAccessToken()) in the app’s HTTP bond. ' +
        sessionRepair,
      clientCredential:
        'The app’s HTTP client must use the declared auth client’s token. Wire setAuthTokenSource(() => authClient.getAccessToken()) in the app’s HTTP bond. ' +
        sessionRepair,
      requestCredential:
        'This Authorization header overrides the app’s session credential. Remove the Authorization override and configure authScheme in the app’s HTTP bond. ' +
        sessionRepair,
      logout:
        'This sign-out handler only navigates and leaves the subscribed session signed in. Call useAuth().logout() or the bonded auth client logout() before navigation. If another route owns sign-out, delegate to that action or use a reasoned ESLint disable at this handler.',
      profile:
        'This write targets the configured auth profile endpoint but does not publish the saved user. Use useAuth().updateProfile(changes), or publish the canonical response through the bonded client in this handler before navigation. Call setUser(savedUser), or setSession({ user, accessToken }) if the response also rotates the token.',
      authSubscription:
        'This React session snapshot can go stale. Keep AppRoot or mount AuthProvider with the bonded client. Use useAuth() from @molecule/app-react or subscribe to that client.',
      renderNavigation:
        'This component calls the useNavigate result during render. React Router cannot navigate on the initial render, so a signed-out deep link can stay on the protected URL. Return <Navigate to={destination} replace /> or use AuthGuard from @molecule/app-ui-react; put imperative navigation in an effect or event handler.',
      nestedQueryKey:
        'This query is stored under key, but invalidate([key]) wraps that same key in another array and does not invalidate it. Pass the original key to invalidate(key). Invalidation only marks cached data stale: refresh mounted data with the hook result.refetch() when the installed version provides it, or invalidate(key) then await client.fetch with the same query options.',
      unchangedOptimisticValue:
        'This optimistic update returns the current value unchanged (or only spreads it). The default shallowEqual comparison sees no change, so commit never runs. Return the desired changed fields, such as { ...current, enabled: !current.enabled }, and update any related count in the same value. Memoizing the input cannot repair an unchanged update.',
      markdownHtml:
        '@molecule/app-markdown render() returns { html, toc }, not an HTML string. Select result.html (or provider.render(source).html) at this HTML sink; passing the whole result renders [object Object] instead of the markdown content.',
      erasedPackageType:
        'This assertion replaces the declared {{package}} methods with an app-written function contract through unknown, any or never. Remove the assertion and call the package’s declared members; a type assertion does not convert the value.',
      staleArticleSlug:
        'updateArticle can rename the slug, so this lookup can return null after a successful save. Use the successful update result’s article directly; if another lookup is needed, use article.slug from that result instead of the old slug. The service also sets updatedAt.',
      authRequestBodyOrder:
        '@molecule/app-auth calls requestBody(kind, payload): a one-argument callback receives the operation string, not the form values. Use mapRequestBody: (data) => ({ user: data }) with your API’s envelope, or declare both (kind, payload) positions for an intentional legacy adapter. The first argument is a string, so payload-property reads require the second parameter. Kind-only adapters remain supported.',
      http: '@molecule/app-http is declared: replace this authenticated transport with getClient().request/get/post; keep response/error mapping local. Configure authScheme on createFetchClient and tokenKey in the auth bond; keep setAuthTokenSource and setAuthGate.',
      unbonded:
        "@molecule/app-http is declared: this {{factory}} result is created without setClient or an HTTP bond, so it does not receive the app token source that setAuthTokenSource installs on bonded clients (and the getClient() fallback). setAuthGate is global and still applies; it does not install that token source. For the visitor's session, call setClient({{factory}}(...)) or bond('http', …, {{factory}}(...)) once in the existing bonds/ composition root, then use getClient(). For a separate account, keep the package client unbonded and configure its own setAuthToken(token) or setAuthTokenResolver(() => token); do not replace the visitor's client or session.",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename()
    if (TEST.test(filename)) return {}
    let packages
    try {
      packages = declared(filename, context.cwd ?? context.getCwd())
    } catch (error) {
      return {
        Program(node) {
          context.report({ node, messageId: 'manifest', data: { reason: error.message } })
        },
      }
    }
    const source = context.sourceCode ?? context.getSourceCode()
    if (
      !packages.auth &&
      !packages.http &&
      !packages.article &&
      !packages.query &&
      !packages.optimistic &&
      !packages.markdown &&
      !source.ast.body.some(
        (node) => node.type === 'ImportDeclaration' && node.source.value.startsWith('@molecule/'),
      )
    )
      return {}
    const calls = []
    const storageAssignments = []
    const defaultHeaderAssignments = []
    const states = []
    const clickHandlers = []
    const clientBonds = []
    const authConfigs = []
    const sessionUpdates = []
    const mutations = new Map()
    const importedReferences = new WeakMap()

    const variable = (node) => {
      if (node?.type !== 'Identifier') return null
      if (importedReferences.has(node)) return importedReferences.get(node)
      for (let scope = source.getScope(node); scope; scope = scope.upper) {
        const found = scope.set.get(node.name)
        if (found) return found
      }
      return null
    }
    const global = (node, names) =>
      node?.type === 'Identifier' && names.includes(node.name) && !variable(node)?.defs.length
    const unwrap = (node) => {
      while (
        node &&
        [
          'ChainExpression',
          'TSAsExpression',
          'TSTypeAssertion',
          'TSNonNullExpression',
          'TSSatisfiesExpression',
        ].includes(node.type)
      )
        node = node.expression
      return node
    }
    const value = (node, seen = new Set()) => {
      node = unwrap(node)
      if (!node || seen.has(node)) return node
      seen.add(node)
      const binding = variable(node)
      const definition = binding?.defs[0]
      if (
        binding?.defs.length === 1 &&
        definition.type === 'Variable' &&
        definition.node.init &&
        !binding.references.some((ref) => ref.isWrite() && !ref.init)
      )
        return value(definition.node.init, seen)
      return node
    }
    const string = (node) => literalString(value(node))
    const credential = (name, stored) => {
      const candidate = value(stored)
      if (
        candidate?.type === 'CallExpression' &&
        (authAction(candidate.callee, 'getAccessToken') ||
          authAction(candidate.callee, 'getRefreshToken'))
      )
        return true
      return (
        ['molecule:auth:accessToken', 'molecule:auth:refreshToken'].includes(name) ||
        (name !== null && name === configuredTokenKey())
      )
    }
    const identity = (node) => {
      const resolved = value(node)
      return variable(resolved) ?? resolved
    }
    const key = (node) =>
      node.computed
        ? string(node.property ?? node.key)
        : ((node.property ?? node.key)?.name ?? string(node.key))
    const globalMember = (node, name) =>
      node?.type === 'MemberExpression' &&
      key(node) === name &&
      global(value(node.object), ['window', 'globalThis', 'self'])
    const storage = (node) => {
      node = value(node)
      return (
        global(node, ['localStorage', 'sessionStorage']) ||
        ['localStorage', 'sessionStorage'].some((name) => globalMember(node, name))
      )
    }
    const imported = (node, modules, names, seen = new Set()) => {
      node = unwrap(node)
      if (!node || seen.has(node)) return false
      seen.add(node)
      if (node.type === 'Identifier') {
        const binding = variable(node)
        const def = binding?.defs[0]
        if (
          def?.type === 'ImportBinding' &&
          modules.includes(def.parent.source.value) &&
          names.includes(def.node.imported?.name ?? 'default')
        )
          return true
        if (
          binding?.defs.length === 1 &&
          def?.type === 'Variable' &&
          def.node.init &&
          !binding.references.some((ref) => ref.isWrite() && !ref.init)
        ) {
          if (def.node.id.type === 'ObjectPattern') {
            if (def.node.parent.kind !== 'const') return false
            const property = def.node.id.properties.find((prop) => {
              if (prop.type !== 'Property') return false
              const selected =
                prop.value.type === 'AssignmentPattern' ? prop.value.left : prop.value
              return selected === def.name
            })
            const namespace = variable(value(def.node.init))?.defs[0]
            return Boolean(
              property &&
              namespace?.type === 'ImportBinding' &&
              namespace.node.type === 'ImportNamespaceSpecifier' &&
              modules.includes(namespace.parent.source.value) &&
              names.includes(key(property)),
            )
          }
          if (def.node.id.type === 'Identifier')
            return imported(def.node.init, modules, names, seen)
        }
      }
      if (node.type === 'MemberExpression') {
        const def = variable(value(node.object))?.defs[0]
        return Boolean(
          def?.type === 'ImportBinding' &&
          modules.includes(def.parent.source.value) &&
          names.includes(key(node)),
        )
      }
      return false
    }
    const clientFactory = (callee) =>
      HTTP_FACTORIES.find(({ module, name }) => imported(callee, [module], [name]))
    const authConfigType = (node) =>
      node?.type === 'TSTypeReference' &&
      imported(node.typeName, [AUTH], ['AuthClientConfig', 'AuthClientConfigOptions'])
    const property = (node, name, seen = new Set(), exact = false) => {
      node = value(node)
      if (!node || typeof name !== 'string' || seen.has(node)) return null
      seen.add(node)
      const matches = (candidate) =>
        typeof candidate === 'string' &&
        (exact ? candidate === name : candidate.toLowerCase() === name.toLowerCase())
      if (node.type === 'ConditionalExpression')
        return (
          property(node.consequent, name, seen, exact) ??
          property(node.alternate, name, seen, exact)
        )
      if (node.type === 'LogicalExpression')
        return property(node.left, name, seen, exact) ?? property(node.right, name, seen, exact)
      for (const [prop, next] of mutations.get(identity(node)) ?? []) if (matches(prop)) return next
      if (node.type === 'ObjectExpression') {
        for (const prop of [...node.properties].reverse()) {
          if (prop.type === 'SpreadElement') {
            const found = property(prop.argument, name, seen, exact)
            if (found) return found
          } else if (matches(key(prop))) return prop.value
        }
      }
      if (node.type === 'MemberExpression')
        return property(property(node.object, key(node), seen, exact), name, seen, exact)
      if (node.type === 'NewExpression' && global(node.callee, ['Headers']))
        return property(node.arguments[0], name, seen, exact)
      return null
    }
    // A third-party API key authenticates a different service, not the app's
    // Molecule session. Resolve aliases and template/binary expressions, but
    // stay conservative when any dynamic branch could instead hold a token.
    const independentApiKey = (node, seen = new Set()) => {
      node = value(node)
      if (!node || seen.has(node)) return false
      seen.add(node)
      if (node.type === 'Identifier') return INDEPENDENT_API_KEY.test(node.name)
      if (node.type === 'MemberExpression') return INDEPENDENT_API_KEY.test(key(node) ?? '')
      if (node.type === 'TemplateLiteral')
        return (
          node.expressions.length > 0 &&
          node.expressions.every((part) => independentApiKey(part, seen))
        )
      if (node.type === 'BinaryExpression') {
        const parts = [node.left, node.right].filter(
          (part) => !(part.type === 'Literal' && typeof part.value === 'string'),
        )
        return parts.length > 0 && parts.every((part) => independentApiKey(part, seen))
      }
      if (node.type === 'ConditionalExpression')
        return independentApiKey(node.consequent, seen) && independentApiKey(node.alternate, seen)
      if (node.type === 'LogicalExpression')
        return independentApiKey(node.left, seen) && independentApiKey(node.right, seen)
      return false
    }
    const mutate = (target, name, next) => {
      if (name === null || name === undefined) return
      const owner = identity(target)
      mutations.set(owner, [...(mutations.get(owner) ?? []), [name, next]])
    }

    const FUNCTIONS = ['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression']
    const functionReturns = (node) => {
      // Overload signatures, declare functions and abstract methods have no body.
      if (!node?.body) return []
      if (node.body.type !== 'BlockStatement') return [node.body]
      const returns = []
      const stack = [node.body]
      const seen = new Set()
      while (stack.length) {
        const current = stack.pop()
        if (!current || typeof current.type !== 'string' || seen.has(current)) continue
        seen.add(current)
        if (current !== node.body && FUNCTIONS.includes(current.type)) continue
        if (current.type === 'ReturnStatement') {
          if (current.argument) returns.push(current.argument)
          continue
        }
        for (const [name, child] of Object.entries(current)) {
          if (name === 'parent') continue
          if (Array.isArray(child)) stack.push(...child)
          else if (child && typeof child === 'object') stack.push(child)
        }
      }
      return returns
    }
    const stableConst = (id) => {
      if (id?.type !== 'Identifier') return null
      const binding = variable(id)
      const definition = binding?.defs[0]
      if (
        binding?.defs.length !== 1 ||
        definition.type !== 'Variable' ||
        definition.parent.kind !== 'const' ||
        definition.node.id.type !== 'Identifier' ||
        !definition.node.init ||
        binding.references.some((ref) => ref.isWrite() && !ref.init)
      )
        return null
      return definition.node
    }
    const localFunction = (callee, seen = new Set()) => {
      callee = unwrap(callee)
      if (FUNCTIONS.includes(callee?.type)) return callee
      if (callee?.type === 'CallExpression' && imported(callee.callee, ['react'], ['useCallback']))
        return localFunction(callee.arguments[0], seen)
      if (callee?.type !== 'Identifier' || seen.has(callee)) return null
      seen.add(callee)
      const binding = variable(callee)
      const definition = binding?.defs[0]
      if (
        binding?.defs.length === 1 &&
        definition.type === 'FunctionName' &&
        !binding.references.some((ref) => ref.isWrite() && !ref.init)
      )
        return definition.node
      const declarator = stableConst(callee)
      return declarator ? localFunction(declarator.init, seen) : null
    }
    // Follow the binding that already has a package contract, without inferring
    // a domain, renderer or sink. Opaque external data and local APIs stay local.
    const moleculeValue = (node, seen = new Set()) => {
      node = unwrap(node)
      if (!node || seen.has(node)) return null
      seen.add(node)
      const binding = variable(node)
      const definition = binding?.defs[0]
      if (
        definition?.type === 'ImportBinding' &&
        definition.parent.importKind !== 'type' &&
        definition.node.importKind !== 'type' &&
        definition.parent.source.value.startsWith('@molecule/')
      )
        return definition.parent.source.value
      const declarator = stableConst(node)
      if (declarator) return moleculeValue(declarator.init, seen)
      if (node.type === 'MemberExpression') return moleculeValue(node.object, seen)
      if (node.type === 'CallExpression') return moleculeValue(node.callee, seen)
      if (node.type === 'AwaitExpression' || node.type === 'TSInstantiationExpression')
        return moleculeValue(node.argument ?? node.expression, seen)
      return null
    }
    const callableContract = (node, member = false, seen = new Set()) => {
      if (!node || seen.has(node)) return false
      seen.add(node)
      if (node.type === 'TSFunctionType') return member
      if (node.type === 'TSUnionType' || node.type === 'TSIntersectionType')
        return node.types.some((type) => callableContract(type, member, new Set(seen)))
      if (node.type === 'TSTypeReference' && node.typeName.type === 'Identifier') {
        const declaration = variable(node.typeName)?.defs.find((def) =>
          ['TSTypeAliasDeclaration', 'TSInterfaceDeclaration'].includes(def.node.type),
        )?.node
        return callableContract(declaration, member, seen)
      }
      if (node.type === 'TSTypeAliasDeclaration')
        return callableContract(node.typeAnnotation, member, seen)
      const members =
        node.type === 'TSTypeLiteral'
          ? node.members
          : node.type === 'TSInterfaceDeclaration'
            ? node.body.body
            : []
      return members.some(
        (part) =>
          (!part.computed || part.key?.type === 'Literal') &&
          (part.type === 'TSMethodSignature' ||
            (part.type === 'TSPropertySignature' &&
              callableContract(part.typeAnnotation?.typeAnnotation, true, new Set(seen)))),
      )
    }
    const erasedPackageType = (node) => {
      if (!callableContract(node.typeAnnotation)) return null
      let operand = node.expression
      while (
        ['TSNonNullExpression', 'TSSatisfiesExpression', 'ChainExpression'].includes(operand?.type)
      )
        operand = operand.expression
      const assertion = ['TSAsExpression', 'TSTypeAssertion'].includes(operand?.type)
      const erased = ['TSUnknownKeyword', 'TSAnyKeyword', 'TSNeverKeyword']
      if (assertion && erased.includes(operand.typeAnnotation.type)) return moleculeValue(operand)
      return null
    }
    const FRAMEWORK_AUTH = ['@molecule/app-react', '@molecule/app-react-native']
    const clientValue = (node, seen = new Set()) => {
      node = unwrap(node)
      if (!node || seen.has(node)) return node
      seen.add(node)
      const declarator = stableConst(node)
      return declarator ? clientValue(declarator.init, seen) : node
    }
    const unchangedOptimisticUpdate = (call) => {
      if (!packages.optimistic) return false
      const callee = unwrap(call.callee)
      if (callee?.type !== 'MemberExpression' || key(callee) !== 'update') return false
      const controller = clientValue(callee.object)
      if (
        controller?.type !== 'CallExpression' ||
        !imported(
          controller.callee,
          ['@molecule/app-react', '@molecule/app-state'],
          ['useOptimisticValue', 'createOptimisticValue'],
        )
      )
        return false
      const options = clientValue(controller.arguments[0])
      // An unknown/custom equality contract may deliberately treat a fresh identity as a change.
      if (
        options?.type !== 'ObjectExpression' ||
        options.properties.some((prop) => prop.type !== 'Property' || key(prop) === 'equals')
      )
        return false
      const callback = localFunction(call.arguments[0])
      if (!callback || callback.async || callback.params[0]?.type !== 'Identifier') return false
      const body = callback.body
      // Do not infer effects, mutations or guarded no-op branches from their return value.
      const result = unwrap(
        body.type === 'BlockStatement'
          ? body.body.length === 1 && body.body[0].type === 'ReturnStatement'
            ? body.body[0].argument
            : null
          : body,
      )
      const current = variable(callback.params[0])
      const same = (node) => node?.type === 'Identifier' && variable(node) === current
      return (
        same(result) ||
        (result?.type === 'ObjectExpression' &&
          result.properties.length > 0 &&
          result.properties.every(
            (prop) => prop.type === 'SpreadElement' && same(unwrap(prop.argument)),
          ))
      )
    }
    const markdownResult = (node, seen = new Set()) => {
      node = clientValue(node)
      if (!node || seen.has(node)) return false
      seen.add(node)
      if (node.type === 'ConditionalExpression')
        return markdownResult(node.consequent, seen) || markdownResult(node.alternate, seen)
      if (node.type === 'LogicalExpression')
        return markdownResult(node.left, seen) || markdownResult(node.right, seen)
      if (node.type !== 'CallExpression') return false
      if (imported(node.callee, ['react'], ['useMemo']))
        return functionReturns(localFunction(node.arguments[0])).some((result) =>
          markdownResult(result, seen),
        )
      const callee = unwrap(node.callee)
      if (callee?.type !== 'MemberExpression' || key(callee) !== 'render') return false
      const provider = clientValue(callee.object)
      return (
        provider?.type === 'CallExpression' &&
        imported(provider.callee, ['@molecule/app-markdown'], ['getProvider', 'requireProvider'])
      )
    }
    const htmlPayload = (node) => {
      node = clientValue(node)
      if (node?.type !== 'ObjectExpression' || mutations.has(identity(node))) return null
      // Later fields win; an unknown spread or computed key may replace __html. Do not
      // diagnose a value the sink does not actually receive.
      for (const prop of [...node.properties].reverse()) {
        if (prop.type !== 'Property' || key(prop) === null) return null
        if (key(prop) === '__html') return prop.value
      }
      return null
    }
    // Cache only for this linted file, so another lint pass sees any edits.
    const projectModules = new Map()
    const readProjectModule = (path) => {
      if (path === filename) return source
      const parser = context.languageOptions?.parser
      if (!parser?.parseForESLint) return null
      if (projectModules.has(path)) return projectModules.get(path)
      let parsed = null
      try {
        parsed = parser.parseForESLint(readFileSync(path, 'utf8'), {
          sourceType: 'module',
          ecmaVersion: 'latest',
          filePath: path,
          tsconfigRootDir: packages.root,
          project: false,
          projectService: false,
        })
      } catch (error) {
        if (
          error.code !== 'ENOENT' &&
          error.code !== 'ENOTDIR' &&
          error.code !== 'EISDIR' &&
          !(error instanceof SyntaxError) &&
          error.name !== 'TSError'
        )
          throw error
      }
      projectModules.set(path, parsed)
      return parsed
    }
    const projectModule = (stem) => {
      for (const extension of ['ts', 'js', 'mjs']) {
        const parsed = readProjectModule(`${stem}.${extension}`)
        if (parsed) return parsed.ast
      }
      return null
    }
    const importedName = (ast, module, name) => {
      for (const declaration of ast.body) {
        if (
          declaration.type !== 'ImportDeclaration' ||
          declaration.importKind === 'type' ||
          declaration.source.value !== module
        )
          continue
        const specifier = declaration.specifiers.find(
          (entry) =>
            entry.type === 'ImportSpecifier' &&
            entry.importKind !== 'type' &&
            entry.imported.name === name,
        )
        if (specifier) return specifier.local.name
      }
    }
    const barrelExportsAuthClient = (stem) => {
      const barrel = projectModule(stem)
      if (!barrel) return false
      const from = './auth-default.js'
      const localClient = importedName(barrel, from, 'authClient')
      return barrel.body.some(
        (node) =>
          node.type === 'ExportNamedDeclaration' &&
          node.exportKind !== 'type' &&
          node.specifiers.some(
            (entry) =>
              entry.type === 'ExportSpecifier' &&
              entry.exportKind !== 'type' &&
              entry.exported.name === 'authClient' &&
              (node.source
                ? node.source.value === from && entry.local.name === 'authClient'
                : entry.local.name === localClient),
          ),
      )
    }
    // SvelteKit puts scaffold config and bonds under src/lib. The other web
    // scaffolds put them directly under src.
    const appSources = packages.root
      ? ['src', 'src/lib'].map((path) => join(packages.root, path))
      : []
    const isScaffoldModule = (target, module) =>
      appSources.some((dir) => target === join(dir, module))
    // A SvelteKit app's vite.config.ts aliases both `$lib` (SvelteKit 2) and `#lib`
    // (SvelteKit 3) to src/lib.
    const libAlias = /^[$#]lib(?:\/|$)/
    const projectImportPath = (specifier, importer) =>
      specifier.startsWith('.')
        ? resolve(dirname(importer), specifier)
        : libAlias.test(specifier)
          ? resolve(packages.root, 'src/lib', specifier.slice('$lib/'.length))
          : null
    const projectImport = (node, name) => {
      const definition = variable(clientValue(node))?.defs[0]
      if (
        definition?.type !== 'ImportBinding' ||
        definition.node.imported?.name !== name ||
        definition.parent.importKind === 'type' ||
        definition.node.importKind === 'type' ||
        !packages.root
      )
        return null
      const target = projectImportPath(definition.parent.source.value, filename)
      return target?.replace(/\.[cm]?[jt]s$/, '') ?? null
    }
    const authSource = (node, bondedOnly = false) => {
      node = clientValue(node)
      const target = projectImport(node, 'authClient')
      if (
        target &&
        (isScaffoldModule(target, 'bonds/auth-default') ||
          (isScaffoldModule(target, 'bonds/index') && barrelExportsAuthClient(target)))
      )
        return true
      return (
        node?.type === 'CallExpression' &&
        (imported(node.callee, [AUTH], ['getClient']) ||
          (!bondedOnly && imported(node.callee, [AUTH], ['createJWTAuthClient'])) ||
          imported(node.callee, FRAMEWORK_AUTH, ['useAuth', 'useAuthClient']))
      )
    }
    const indexedModules = new WeakSet()
    const importedReader = (callee, importer) => {
      callee = clientValue(callee)
      const member = callee?.type === 'MemberExpression'
      const definition = variable(member ? clientValue(callee.object) : callee)?.defs[0]
      if (
        definition?.type !== 'ImportBinding' ||
        (definition.node.type === 'ImportNamespaceSpecifier') !== member ||
        definition.parent.importKind === 'type' ||
        definition.node.importKind === 'type'
      )
        return null
      const name = member ? key(callee) : (definition.node.imported?.name ?? 'default')
      if (!name) return null
      const target = projectImportPath(definition.parent.source.value, importer)
      if (!target) return null
      const parts = relative(packages.root, target).split(sep)
      if (parts[0] === '..' || parts.includes('node_modules')) return null

      const extension = extname(target)
      const candidates =
        {
          '.js': [target, target.slice(0, -3) + '.ts', target.slice(0, -3) + '.tsx'],
          '.jsx': [target, target.slice(0, -4) + '.tsx'],
          '.mjs': [target, target.slice(0, -4) + '.mts'],
          '.cjs': [target, target.slice(0, -4) + '.cts'],
        }[extension] ??
        (extension ? [target] : ['.ts', '.tsx', '.js', '.jsx'].map((ext) => target + ext))
      for (const path of candidates) {
        if (!/\.[cm]?[jt]sx?$/.test(path)) continue
        const parsed = readProjectModule(path)
        if (!parsed) continue
        if (!parsed.scopeManager) return null
        if (parsed !== source && !indexedModules.has(parsed)) {
          for (const scope of parsed.scopeManager.scopes) {
            for (const binding of scope.variables)
              for (const identifier of binding.identifiers)
                importedReferences.set(identifier, binding)
            for (const { identifier, resolved } of scope.references)
              importedReferences.set(identifier, resolved)
          }
          indexedModules.add(parsed)
        }
        for (const statement of parsed.ast.body) {
          if (statement.type === 'ExportDefaultDeclaration' && name === 'default')
            return { fn: localFunction(statement.declaration), path }
          if (
            statement.type !== 'ExportNamedDeclaration' ||
            statement.exportKind === 'type' ||
            statement.source
          )
            continue
          const declaration = statement.declaration
          if (declaration?.type === 'FunctionDeclaration' && declaration.id?.name === name)
            return { fn: localFunction(declaration.id), path }
          if (declaration?.type === 'VariableDeclaration' && declaration.kind === 'const') {
            const binding = declaration.declarations.find((part) => part.id.name === name)
            if (binding) return { fn: localFunction(binding.init), path }
          }
          const exported = statement.specifiers.find(
            (part) => part.exportKind !== 'type' && part.exported.name === name,
          )
          if (exported) return { fn: localFunction(exported.local), path }
        }
        return null
      }
      return null
    }
    const storedSessionToken = (node, importer, seen = new Set()) => {
      node = value(node)
      if (!node || seen.has(node)) return false
      seen.add(node)
      const stored = (part) => storedSessionToken(part, importer, seen)
      if (node.type === 'ConditionalExpression')
        return stored(node.consequent) || stored(node.alternate)
      if (node.type === 'LogicalExpression')
        return stored(node.right) || (node.operator !== '&&' && stored(node.left))
      if (node.type === 'AwaitExpression') return stored(node.argument)
      if (node.type === 'MemberExpression') return node.computed && storage(node.object)
      if (node.type !== 'CallExpression') return false
      const callee = unwrap(node.callee)
      if (callee.type === 'MemberExpression' && key(callee) === 'getItem' && storage(callee.object))
        return true
      const local = localFunction(callee)
      if (local) return functionReturns(local).some(stored)
      const reader = importedReader(callee, importer)
      return functionReturns(reader?.fn).some((result) =>
        storedSessionToken(result, reader.path, seen),
      )
    }
    const sessionAccessToken = (input) => {
      const session = value(input)
      if (session?.type !== 'ObjectExpression' || mutations.has(session)) return null
      // A later spread or unknown property may replace the token at runtime.
      const field = session.properties.findLast((prop) => {
        if (prop.type !== 'Property') return true
        const name = key(prop)
        return name == null || name === 'accessToken'
      })
      return field?.type === 'Property' && key(field) === 'accessToken' ? field.value : null
    }
    const authAction = (callee, method, seen = new Set()) => {
      callee = unwrap(callee)
      if (!callee || seen.has(callee)) return false
      seen.add(callee)
      if (callee?.type === 'MemberExpression')
        return key(callee) === method && authSource(callee.object)
      if (imported(callee, [AUTH], [method])) return true
      const alias = stableConst(callee)
      if (alias) return authAction(alias.init, method, seen)
      const definition = variable(callee)?.defs[0]
      if (
        definition?.type !== 'Variable' ||
        definition.node.id.type !== 'ObjectPattern' ||
        !authSource(definition.node.init)
      )
        return false
      return definition.node.id.properties.some(
        (prop) =>
          prop.type === 'Property' &&
          key(prop) === method &&
          (prop.value.type === 'AssignmentPattern' ? prop.value.left : prop.value) ===
            definition.name,
      )
    }
    const httpSource = (node) => {
      node = clientValue(node)
      return (
        node?.type === 'CallExpression' &&
        (imported(node.callee, [HTTP], ['getClient']) ||
          imported(node.callee, FRAMEWORK_AUTH, ['useHttpClient']))
      )
    }
    const httpRequestConfig = new Map([
      ['request', 0],
      ['get', 1],
      ['delete', 1],
      ['post', 2],
      ['put', 2],
      ['patch', 2],
    ])
    const httpUtilities = ['get', 'post', 'put', 'patch', 'del']
    const noCredential = (node) =>
      !node ||
      (node.type === 'Literal' && (node.value === null || node.value === '')) ||
      global(node, ['undefined'])
    const sessionCredential = (node, header = false, seen = new Set()) => {
      node = value(node)
      if (noCredential(node)) return true
      if (seen.has(node)) return false
      seen = new Set(seen).add(node)
      const allowed = (part) => sessionCredential(part, header, seen)
      if (node.type === 'CallExpression') {
        if (authAction(node.callee, 'getAccessToken')) return true
        const fn = localFunction(node.callee)
        return Boolean(fn?.body && functionReturns(fn).every(allowed))
      }
      if (node.type === 'ConditionalExpression')
        return allowed(node.consequent) && allowed(node.alternate)
      if (node.type === 'LogicalExpression' && node.operator !== '&&')
        return allowed(node.left) && allowed(node.right)
      if (header && node.type === 'TemplateLiteral' && node.expressions.length === 1)
        return sessionCredential(node.expressions[0], false, seen)
      if (header && node.type === 'BinaryExpression' && node.operator === '+' && string(node.left))
        return sessionCredential(node.right, false, seen)
      return false
    }
    const sessionTokenSource = (node) => {
      if (noCredential(value(node)) || authAction(node, 'getAccessToken')) return true
      const fn = localFunction(node)
      return Boolean(fn?.body && functionReturns(fn).every((result) => sessionCredential(result)))
    }
    const isApiBaseImport = (node) =>
      isScaffoldModule(projectImport(node, 'API_BASE_URL'), 'config')
    let cachedApiBase
    const appApiBase = () => {
      if (cachedApiBase !== undefined) return cachedApiBase
      const config = appSources.map((dir) => projectModule(join(dir, 'config'))).find(Boolean)
      const apiBase = config?.body
        .flatMap((statement) => statement.declaration?.declarations ?? statement.declarations ?? [])
        .find((part) => part.id.name === 'API_BASE_URL')?.init
      const base = unwrap(apiBase)
      const fallback =
        base?.type === 'LogicalExpression' && ['||', '??'].includes(base.operator)
          ? unwrap(base.right)
          : base
      cachedApiBase = literalString(fallback) ?? DEFAULT_API_BASE
      return cachedApiBase
    }
    const checkHttpCredentials = (bonded) => {
      const factoryBase = (node) => {
        if (node?.type === 'CallExpression' && clientFactory(node.callee))
          return property(node.arguments[0], 'baseURL', new Set(), true)
        return null
      }
      const appClient = (node, baseNode) => {
        if (
          httpSource(node) ||
          bonded.has(node) ||
          isScaffoldModule(projectImport(node, 'httpClient'), 'bonds/http-default') ||
          isApiBaseImport(baseNode)
        )
          return true
        const base = string(baseNode)
        return (
          base === '' ||
          (base !== null && base.replace(/\/$/, '') === appApiBase().replace(/\/$/, ''))
        )
      }
      const urlHost = (node) => {
        node = value(node)
        if (node?.type !== 'TemplateLiteral' || node.expressions.length === 0)
          return httpHost(literalString(node))
        const prefix = node.quasis[0].value.cooked
        // The first interpolation may be part of the host itself.
        return /^(?:https?:)?\/\/[^/?#]+[/?#]/i.test(prefix) ? httpHost(prefix) : null
      }
      const appHost = (baseNode) => {
        if (baseNode && !isApiBaseImport(baseNode)) return httpHost(string(baseNode))
        const enabled = [...bonded].map(factoryBase).find(Boolean)
        return httpHost(string(enabled) ?? appApiBase())
      }
      const checkHeaderValue = (node, header) => {
        if (header && !sessionCredential(header, true))
          context.report({ node, messageId: 'requestCredential' })
      }
      const reportHeader = (node, headers) => {
        checkHeaderValue(node, property(headers, 'authorization'))
      }
      for (const call of calls) {
        const callee = unwrap(call.callee)
        if (imported(callee, [HTTP], ['setAuthTokenSource'])) {
          if (!sessionTokenSource(call.arguments[0]))
            context.report({ node: call, messageId: 'credentialSource' })
          continue
        }
        const member = callee?.type === 'MemberExpression' ? callee : null
        const utility = imported(callee, [HTTP], httpUtilities)
          ? httpUtilities.find((name) => imported(callee, [HTTP], [name]))
          : null
        const method = utility === 'del' ? 'delete' : (utility ?? (member && key(member)))
        const index = httpRequestConfig.get(method)
        if (index === undefined && method !== 'setAuthToken') continue
        const receiver = clientValue(member?.object)
        const baseNode = factoryBase(receiver)
        if (!utility && !appClient(receiver, baseNode)) continue
        if (method === 'setAuthToken') {
          if (!sessionCredential(call.arguments[0]))
            context.report({ node: call, messageId: 'clientCredential' })
          continue
        }
        const options = call.arguments[index]
        const host = urlHost(method === 'request' ? property(options, 'url') : call.arguments[0])
        if (host && host !== appHost(baseNode)) continue
        reportHeader(call, property(options, 'headers'))
      }
      for (const call of calls) {
        if (clientFactory(call.callee) && appClient(call, factoryBase(call)))
          reportHeader(call, property(call.arguments[0], 'defaultHeaders'))
      }
      for (const { node, client, direct } of defaultHeaderAssignments) {
        const receiver = clientValue(client)
        if (!appClient(receiver, factoryBase(receiver))) continue
        if (direct) checkHeaderValue(node, node.right)
        else reportHeader(node, node.right)
      }
    }
    const ownerFunction = (node) => {
      for (let parent = node.parent; parent; parent = parent.parent)
        if (FUNCTIONS.includes(parent.type)) return parent
      return null
    }
    // ESLint supplies the parser and scope graph. Inspect calls in the action,
    // including called local helpers and Promise continuations, not unused closures
    // or another handler's publication. This is omission feedback, not a proof of
    // every branch's timing or the response value passed to a session publisher.
    const actionCalls = (fn, seen = new Set()) => {
      if (!fn?.body || seen.has(fn)) return []
      seen.add(fn)
      const found = []
      const visit = (node) => {
        if (!node || FUNCTIONS.includes(node.type)) return
        if (node.type === 'CallExpression') {
          found.push(node)
          const called = localFunction(node.callee)
          if (called) found.push(...actionCalls(called, seen))
          if (
            node.callee.type === 'MemberExpression' &&
            ['then', 'catch', 'finally'].includes(key(node.callee))
          )
            for (const argument of node.arguments) {
              const callback = localFunction(argument)
              if (callback) found.push(...actionCalls(callback, seen))
            }
        }
        for (const name of source.visitorKeys[node.type] ?? []) {
          const child = node[name]
          if (Array.isArray(child)) child.forEach(visit)
          else visit(child)
        }
      }
      visit(fn.body)
      return found
    }
    const subscribesToAuthSnapshot = (owner, client, setter) => {
      const ownerCalls = actionCalls(owner)
      for (const call of [...ownerCalls]) {
        if (imported(call.callee, ['react'], ['useEffect', 'useLayoutEffect']))
          ownerCalls.push(...actionCalls(localFunction(call.arguments[0])))
      }
      return ownerCalls.some((call) => {
        const callee = unwrap(call.callee)
        return (
          callee.type === 'MemberExpression' &&
          ['subscribe', 'onAuthChange'].includes(key(callee)) &&
          identity(callee.object) === client &&
          actionCalls(localFunction(call.arguments[0])).some(
            (notify) => variable(notify.callee) === variable(setter),
          )
        )
      })
    }
    // The scaffold's authored src/config is the source of the bonded auth contract.
    // Parse literal configuration with ESLint's parser; never execute it or guess
    // routes from words such as "user". Dynamic contracts stay outside this check.
    const bondedAuthFields = (names) => {
      if (!packages.root) return null
      const declarations = (ast) =>
        ast.body.flatMap((statement) => {
          const declaration =
            statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
          return declaration?.type === 'VariableDeclaration' && declaration.kind === 'const'
            ? declaration.declarations
            : []
        })
      // Do not treat an unused config as the bonded contract. Recognize the
      // scaffold's direct factory + config argument/spread + setClient wiring. An override
      // or a custom composition root cannot be resolved here and stays quiet.
      const bond = projectModule(join(packages.root, 'src/bonds/auth-default'))
      if (!bond) return null
      const factory = importedName(bond, AUTH, 'createJWTAuthClient')
      const configImport = importedName(bond, '../config.js', 'authConfig')
      const setter = importedName(bond, AUTH, 'setClient')
      const wrappers = [
        'createDefaultAuthClient',
        'createDefaultAuthClientWithHttpSync',
        'createDefaultAuthClientWithFetchClient',
      ]
        .map((name) => importedName(bond, '@molecule/app-bonds-default-react', name))
        .filter(Boolean)
      const client = declarations(bond).find(
        (node) =>
          node.init?.type === 'CallExpression' &&
          ((factory && node.id.type === 'Identifier' && node.init.callee.name === factory) ||
            (node.id.type === 'ObjectPattern' &&
              wrappers.includes(node.init.callee.name) &&
              ['authClient', 'setupAuthDefault'].every((name) =>
                node.id.properties.some(
                  (prop) => prop.type === 'Property' && prop.key.name === name,
                ),
              ))),
      )
      if (!configImport || !client) return null
      const wrapped = wrappers.includes(client.init.callee.name)
      if (!wrapped && !setter) return null
      const options = unwrap(client.init.arguments[0])
      if (
        !(options?.type === 'Identifier' && options.name === configImport) &&
        (options?.type !== 'ObjectExpression' ||
          options.properties.filter((prop) => prop.type === 'SpreadElement').length !== 1 ||
          !options.properties.some(
            (prop) => prop.type === 'SpreadElement' && prop.argument.name === configImport,
          ) ||
          options.properties.some(
            (prop) =>
              prop.type === 'Property' &&
              (prop.computed || names.includes(prop.key.name ?? prop.key.value)),
          ))
      )
        return null
      const bonded = (node) => {
        if (!node || typeof node !== 'object') return false
        if (
          node.type === 'CallExpression' &&
          node.callee.name === setter &&
          node.arguments[0]?.name === client.id.name
        )
          return true
        return Object.entries(node).some(
          ([name, child]) =>
            name !== 'parent' && (Array.isArray(child) ? child.some(bonded) : bonded(child)),
        )
      }
      if (!wrapped && !bonded(bond)) return null
      const ast = projectModule(join(packages.root, 'src/config'))
      if (!ast) return null
      const config = unwrap(declarations(ast).find((node) => node.id.name === 'authConfig')?.init)
      if (
        config?.type !== 'ObjectExpression' ||
        config.properties.some((prop) => prop.type !== 'Property' || prop.computed)
      )
        return null
      return (name) =>
        config.properties.findLast((prop) => (prop.key.name ?? prop.key.value) === name)
    }
    let tokenKey
    const configuredTokenKey = () => {
      if (tokenKey === undefined) {
        const field = bondedAuthFields(['tokenKey'])?.('tokenKey')
        tokenKey = literalString(unwrap(field?.value))
      }
      return tokenKey
    }
    const profileTarget = () => {
      const field = bondedAuthFields(['profileEndpoint', 'profileUpdateMethod'])
      if (!field) return null
      const literal = (node) => {
        node = unwrap(node)
        if (FUNCTIONS.includes(node?.type)) {
          const returns = functionReturns(node)
          node = returns.length === 1 ? unwrap(returns[0]) : null
        }
        if (node?.type === 'Literal' && typeof node.value === 'string') return node.value
        if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
          return node.quasis[0].value.cooked
        return null
      }
      const endpoint = literal(field('profileEndpoint')?.value)
      const methodField = field('profileUpdateMethod')
      const method = methodField ? literal(methodField.value) : 'PATCH'
      return endpoint && ['PUT', 'PATCH', 'POST'].includes(method)
        ? { endpoint, method: method.toLowerCase() }
        : null
    }
    // Bonding is deliberately a creation-site fact. Only an identifier
    // declarator can hold that client itself; a destructured method cannot.
    const bondedHttpClients = () => {
      const bonded = new Set()
      const add = (client, seen = new Set()) => {
        client = unwrap(client)
        if (!client || seen.has(client)) return
        seen.add(client)
        if (client.type === 'CallExpression' && clientFactory(client.callee)) {
          bonded.add(client)
          return
        }
        const declarator = stableConst(client)
        if (declarator) add(declarator.init, seen)
      }
      for (const client of clientBonds) add(client)
      return bonded
    }
    // An explicit token setter owns this client's credential independently of
    // the visitor's bond. Follow the same immutable bindings as bond detection;
    // a setter on some other object does not establish this client's ownership.
    const independentlyAuthenticatedHttpClients = () => {
      const independent = new Set()
      for (const call of calls) {
        const callee = unwrap(call.callee)
        if (
          callee?.type !== 'MemberExpression' ||
          !['setAuthToken', 'setAuthTokenResolver'].includes(key(callee)) ||
          call.arguments.length !== 1
        )
          continue
        const client = value(callee.object)
        if (client?.type === 'CallExpression' && clientFactory(client.callee))
          independent.add(client)
      }
      return independent
    }
    // A single module can prove an export hand-off, not what its importer does.
    // Containers and calls through arbitrary wrappers stay outside this proof.
    const exportedHttpClients = () => {
      const exported = new Set()
      const creation = (target, seen = new Set()) => {
        target = unwrap(target)
        if (!target || seen.has(target)) return
        seen.add(target)
        if (target.type === 'CallExpression') {
          if (clientFactory(target.callee)) {
            exported.add(target)
            return
          }
          const fn = localFunction(target.callee)
          if (!fn || fn.async || fn.generator) return
          for (const returned of functionReturns(fn)) creation(returned, seen)
          return
        }
        if (FUNCTIONS.includes(target.type)) {
          if (target.async || target.generator) return
          for (const returned of functionReturns(target)) creation(returned, seen)
          return
        }
        if (target.type !== 'Identifier') return
        const declarator = stableConst(target)
        if (declarator) creation(declarator.init, seen)
        else {
          const fn = localFunction(target)
          if (fn) creation(fn, seen)
        }
      }
      for (const statement of source.ast.body) {
        if (statement.exportKind === 'type') continue
        if (statement.type === 'ExportDefaultDeclaration') {
          creation(statement.declaration)
          continue
        }
        if (statement.type !== 'ExportNamedDeclaration') continue
        if (statement.declaration?.type === 'VariableDeclaration') {
          if (statement.declaration.kind !== 'const') continue
          for (const declarator of statement.declaration.declarations)
            if (declarator.id.type === 'Identifier' && declarator.init) creation(declarator.init)
        } else if (statement.declaration?.type === 'FunctionDeclaration') {
          creation(statement.declaration)
        } else if (!statement.declaration && !statement.source) {
          for (const specifier of statement.specifiers)
            if (specifier.exportKind !== 'type') creation(specifier.local)
        }
      }
      return exported
    }
    const AXIOS_CONFIG = new Map([
      ['default', 0],
      ['request', 0],
      ['create', 0],
      ['get', 1],
      ['delete', 1],
      ['head', 1],
      ['options', 1],
      ['post', 2],
      ['put', 2],
      ['patch', 2],
      ['postForm', 2],
      ['putForm', 2],
      ['patchForm', 2],
      ['query', 2],
    ])
    const transportConfig = (callee, args) => {
      callee = value(callee)
      if (global(callee, ['fetch']) || globalMember(callee, 'fetch')) return 1
      let method = null
      if (callee?.type === 'Identifier') {
        const definition = variable(callee)?.defs[0]
        if (definition?.type === 'ImportBinding' && definition.parent.source.value === 'axios')
          method = definition.node.imported?.name ?? 'default'
      } else if (callee?.type === 'MemberExpression') {
        if (imported(callee, ['axios'], [...AXIOS_CONFIG.keys()])) method = key(callee)
        else {
          const owner = value(callee.object)
          if (owner?.type === 'CallExpression' && imported(owner.callee, ['axios'], ['create']))
            method = key(callee)
        }
      }
      if (method === 'default' || method === 'request') {
        if (args.length === 1) return 0
        return value(args[0])?.type === 'ObjectExpression' ? 0 : 1
      }
      return method === null ? null : (AXIOS_CONFIG.get(method) ?? null)
    }
    return {
      'TSAsExpression, TSTypeAssertion'(node) {
        const pkg = erasedPackageType(node)
        if (pkg) context.report({ node, messageId: 'erasedPackageType', data: { package: pkg } })
      },
      VariableDeclarator(node) {
        if (packages.auth && authConfigType(node.id.typeAnnotation?.typeAnnotation))
          authConfigs.push(node.init)
      },
      'TSAsExpression, TSSatisfiesExpression'(node) {
        if (packages.auth && authConfigType(node.typeAnnotation)) authConfigs.push(node.expression)
      },
      JSXAttribute(node) {
        if (node.name.name === 'onClick' && node.value?.type === 'JSXExpressionContainer')
          clickHandlers.push(node.value.expression)
        if (
          packages.markdown &&
          node.name.name === 'dangerouslySetInnerHTML' &&
          node.value?.type === 'JSXExpressionContainer' &&
          markdownResult(htmlPayload(node.value.expression))
        )
          context.report({ node, messageId: 'markdownHtml' })
      },
      AssignmentExpression(node) {
        if (node.left.type === 'MemberExpression' && storage(node.left.object))
          storageAssignments.push(node)
        if (node.left.type !== 'MemberExpression') return
        if (packages.auth && node.operator === '=') {
          const member = node.left.object
          if (key(node.left) === 'defaultHeaders')
            defaultHeaderAssignments.push({ node, client: member, direct: false })
          else if (
            member.type === 'MemberExpression' &&
            key(member) === 'defaultHeaders' &&
            key(node.left)?.toLowerCase() === 'authorization'
          )
            defaultHeaderAssignments.push({ node, client: member.object, direct: true })
        }
        if (packages.markdown && key(node.left) === 'innerHTML' && markdownResult(node.right))
          context.report({ node, messageId: 'markdownHtml' })
        mutate(node.left.object, key(node.left), node.right)
        if (packages.auth && storage(node.left.object) && credential(key(node.left), node.right)) {
          context.report({ node, messageId: 'credential' })
        }
      },
      CallExpression(node) {
        calls.push(node)
        if (unchangedOptimisticUpdate(node))
          context.report({ node, messageId: 'unchangedOptimisticValue' })
        const callee = unwrap(node.callee)
        if (packages.http && imported(callee, [HTTP], ['setClient']))
          clientBonds.push(...node.arguments)
        if (
          packages.http &&
          imported(callee, ['@molecule/app-bond'], ['bond']) &&
          ['http', 'http-client'].includes(string(node.arguments[0]))
        ) {
          const provider =
            node.arguments.length === 2
              ? node.arguments[1]
              : node.arguments.length === 3
                ? node.arguments[2]
                : null
          if (provider) clientBonds.push(provider)
        }
        if (callee.type === 'MemberExpression') {
          const method = key(callee)
          if (packages.auth && (method === 'setAccessToken' || method === 'setSession'))
            sessionUpdates.push({ node, receiver: callee.object, method })
          if (method === 'set' || method === 'append')
            mutate(callee.object, string(node.arguments[0]), node.arguments[1])
          if (
            packages.auth &&
            ['setItem', 'removeItem'].includes(method) &&
            storage(callee.object) &&
            credential(string(node.arguments[0]), node.arguments[1])
          ) {
            context.report({ node, messageId: 'credential' })
          }
        }
        if (
          imported(
            callee,
            ['react', 'solid-js', 'solid-js/store', 'vue', 'svelte/store', '@angular/core'],
            [
              'useState',
              'useReducer',
              'createSignal',
              'createStore',
              'ref',
              'reactive',
              'writable',
              'signal',
            ],
          )
        )
          states.push(node)
      },
      'Program:exit'() {
        const bonded = bondedHttpClients()
        if (packages.auth) {
          checkHttpCredentials(bonded)
          for (const { node, receiver, method } of sessionUpdates) {
            if (!authSource(receiver, true)) continue
            const token =
              method === 'setSession' ? sessionAccessToken(node.arguments[0]) : node.arguments[0]
            if (storedSessionToken(token, filename)) context.report({ node, messageId: 'session' })
          }
          // A key's spelling cannot identify a credential. Its flow to the visitor's
          // bonded transport can: only stable lexical values establish that fact.
          const tokenBinding = (node) => {
            const binding = variable(value(node))
            return binding?.defs.length === 1 &&
              !binding.references.some((ref) => ref.isWrite() && !ref.init)
              ? binding
              : null
          }
          const tokens = new Set(
            calls.flatMap((call) => {
              const callee = unwrap(call.callee)
              const binding =
                callee?.type === 'MemberExpression' &&
                key(callee) === 'setAuthToken' &&
                httpSource(callee.object) &&
                tokenBinding(call.arguments[0])
              return binding ? [binding] : []
            }),
          )
          const checkStored = (node, name, stored) => {
            const binding = tokenBinding(stored)
            if (binding && tokens.has(binding) && !credential(name, stored))
              context.report({ node, messageId: 'credential' })
          }
          for (const call of calls) {
            const callee = unwrap(call.callee)
            if (
              callee?.type === 'MemberExpression' &&
              key(callee) === 'setItem' &&
              storage(callee.object)
            )
              checkStored(call, string(call.arguments[0]), call.arguments[1])
          }
          for (const assignment of storageAssignments)
            checkStored(assignment, key(assignment.left), assignment.right)
        }
        if (packages.query) {
          const queries = calls.flatMap((call) => {
            if (!imported(call.callee, ['@molecule/app-query-react'], ['useQuery'])) return []
            const options = value(call.arguments[0])
            if (options?.type !== 'ObjectExpression') return []
            const property = options.properties.find(
              (prop) => prop.type === 'Property' && key(prop) === 'key',
            )
            return property ? [{ key: identity(property.value), owner: ownerFunction(call) }] : []
          })
          for (const call of calls) {
            const callee = unwrap(call.callee)
            if (callee.type !== 'MemberExpression' || key(callee) !== 'invalidate') continue
            const client = value(callee.object)
            if (
              client?.type !== 'CallExpression' ||
              !imported(client.callee, ['@molecule/app-query'], ['getQueryClient'])
            )
              continue
            const argument = value(call.arguments[0])
            if (argument?.type !== 'ArrayExpression' || argument.elements.length !== 1) continue
            const wrapped = identity(argument.elements[0])
            if (
              queries.some(
                (query) =>
                  query.key === wrapped &&
                  query.owner &&
                  query.owner.range[0] < call.range[0] &&
                  query.owner.range[1] > call.range[1],
              )
            )
              context.report({ node: call, messageId: 'nestedQueryKey' })
          }
        }
        if (packages.article) {
          const module = '@molecule/api-resource-article'
          const updates = calls.filter((call) => {
            if (!imported(call.callee, [module], ['updateArticle'])) return false
            if (call.parent.type !== 'AwaitExpression') return false
            const input = unwrap(call.arguments[2])
            // A literal patch that cannot change the title cannot rename the slug.
            return (
              input?.type !== 'ObjectExpression' ||
              input.properties.some(
                (prop) => prop.type === 'SpreadElement' || key(prop) === 'title',
              )
            )
          })
          for (const read of calls) {
            if (!imported(read.callee, [module], ['getArticleBySlug', 'findArticleRow'])) continue
            const argument = unwrap(read.arguments[0])
            if (argument?.type !== 'Identifier') continue
            const slug = identity(argument)
            const binding = variable(argument)
            const update = updates.find(
              (call) =>
                call.range[1] < read.range[0] &&
                ownerFunction(call) === ownerFunction(read) &&
                identity(call.arguments[0]) === slug &&
                !binding?.references.some(
                  (ref) =>
                    ref.isWrite() &&
                    ref.identifier.range[0] > call.range[1] &&
                    ref.identifier.range[0] < read.range[0],
                ),
            )
            if (update) context.report({ node: read, messageId: 'staleArticleSlug' })
          }
        }
        if (packages.auth) {
          const configs = [
            ...authConfigs,
            ...calls
              .filter((call) => imported(call.callee, [AUTH], ['createJWTAuthClient']))
              .map((call) => call.arguments[0]),
          ]
          const reportedAdapters = new Set()
          for (const config of configs) {
            const object = value(config)
            // A spread may override the adapter or install mapRequestBody, which wins at runtime.
            if (
              object?.type !== 'ObjectExpression' ||
              object.properties.some((prop) => prop.type !== 'Property' || key(prop) === null)
            )
              continue
            const mapped = value(property(object, 'mapRequestBody', new Set(), true))
            if (mapped && !(mapped.type === 'Identifier' && global(mapped, ['undefined']))) continue
            let adapter = value(property(object, 'requestBody', new Set(), true))
            if (adapter?.type === 'Identifier') {
              const binding = variable(adapter)
              if (
                binding?.defs.length === 1 &&
                binding.defs[0].type === 'FunctionName' &&
                !binding.references.some((ref) => ref.isWrite())
              )
                adapter = binding.defs[0].node
            }
            if (
              !['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(
                adapter?.type,
              ) ||
              adapter.params.length !== 1 ||
              adapter.params[0].type === 'RestElement' ||
              reportedAdapters.has(adapter)
            )
              continue
            const first =
              adapter.params[0].type === 'AssignmentPattern'
                ? adapter.params[0].left
                : adapter.params[0]
            const binding = first.type === 'Identifier' ? variable(first) : null
            const invalidObjectRead =
              first.type === 'ObjectPattern' ||
              binding?.references.some(({ identifier }) => {
                const parent = identifier.parent
                return (
                  parent?.type === 'MemberExpression' &&
                  parent.object === identifier &&
                  !parent.computed &&
                  !['length', ...Object.getOwnPropertyNames(String.prototype)].includes(
                    parent.property.name,
                  )
                )
              })
            if (!invalidObjectRead) continue
            reportedAdapters.add(adapter)
            context.report({ node: adapter, messageId: 'authRequestBodyOrder' })
          }
          for (const call of calls) {
            const navigation = value(call.callee)
            if (
              navigation?.type !== 'CallExpression' ||
              !imported(navigation.callee, ['react-router', 'react-router-dom'], ['useNavigate'])
            )
              continue
            const component = ownerFunction(navigation)
            const name = component?.id?.name ?? component?.parent?.id?.name
            // A callback in an effect or event runs after render and remains valid. Only a
            // direct call in the component that owns this hook is established by this scope.
            if (/^[A-Z]/.test(name ?? '') && ownerFunction(call) === component)
              context.report({ node: call, messageId: 'renderNavigation' })
          }
          const splitSnapshots = new Map()
          for (const state of states) {
            if (!imported(state.callee, ['react'], ['useState'])) continue
            const owner = ownerFunction(state)
            const name = owner?.id?.name ?? owner?.parent?.id?.name ?? ''
            const hook = /^use[A-Z]/.test(name)
            const seed = state.arguments[0]
            const setter = state.parent.id?.type === 'ArrayPattern' && state.parent.id.elements[1]
            if ((!hook && !/^[A-Z]/.test(name)) || !seed || setter?.type !== 'Identifier') continue

            const initializer = localFunction(seed)
            const results = initializer ? functionReturns(initializer) : [seed]
            const read = results.length === 1 ? value(results[0]) : null
            const getter = read?.type === 'CallExpression' ? unwrap(read.callee) : null
            if (getter?.type === 'MemberExpression') {
              const field = key(getter)
              if (
                (field === 'getUser' || field === 'getAccessToken') &&
                authSource(getter.object, true)
              ) {
                const client = identity(getter.object)
                const snapshots = splitSnapshots.get(owner) ?? new Map()
                const fields = snapshots.get(client) ?? []
                fields.push({ field, state, setter })
                snapshots.set(client, fields)
                splitSnapshots.set(owner, snapshots)
              }
            }

            if (!hook) continue
            const clients = new Map()
            for (const call of calls) {
              if (call.range[0] < seed.range[0] || call.range[1] > seed.range[1]) continue
              const callee = unwrap(call.callee)
              if (
                callee.type !== 'MemberExpression' ||
                !['getState', 'getUser', 'getAccessToken'].includes(key(callee))
              )
                continue
              const client = identity(callee.object)
              const readers = clients.get(client) ?? new Set()
              readers.add(key(callee))
              clients.set(client, readers)
            }
            for (const [client, readers] of clients) {
              if (readers.size === 3 && !subscribesToAuthSnapshot(owner, client, setter)) {
                context.report({ node: state, messageId: 'authSubscription' })
                break
              }
            }
          }
          for (const [owner, snapshots] of splitSnapshots) {
            for (const [client, fields] of snapshots) {
              if (
                !fields.some(({ field }) => field === 'getUser') ||
                !fields.some(({ field }) => field === 'getAccessToken')
              )
                continue
              const stale = fields.find(
                ({ setter }) => !subscribesToAuthSnapshot(owner, client, setter),
              )
              if (stale) context.report({ node: stale.state, messageId: 'authSubscription' })
            }
          }
          // A deliberately narrow sign-out omission: a named click handler whose
          // sole operation is the router's navigate. External sign-out delegates,
          // genuine logout calls and ordinary navigation controls remain valid.
          if (
            calls.some((node) =>
              imported(node.callee, FRAMEWORK_AUTH, ['useAuth', 'useAuthClient']),
            )
          ) {
            const reported = new Set()
            for (const handler of clickHandlers) {
              const fn = localFunction(handler)
              const name = handler.type === 'Identifier' ? handler.name : fn?.id?.name
              if (
                !fn ||
                reported.has(fn) ||
                !/^(?:(?:handle|on))?(?:logout|logOut|signOut)$/i.test(name ?? '')
              )
                continue
              const body = fn.body.type === 'BlockStatement' ? fn.body.body : [fn.body]
              if (body.length !== 1) continue
              const statement = body[0]
              let expression =
                statement.type === 'ExpressionStatement'
                  ? statement.expression
                  : statement.type === 'ReturnStatement'
                    ? statement.argument
                    : statement
              if (expression?.type === 'AwaitExpression') expression = expression.argument
              const navigation = value(expression?.callee)
              if (
                expression?.type === 'CallExpression' &&
                navigation?.type === 'CallExpression' &&
                imported(
                  navigation.callee,
                  ['react-router', 'react-router-dom', '@molecule/app-react'],
                  ['useNavigate'],
                )
              ) {
                reported.add(fn)
                context.report({ node: fn, messageId: 'logout' })
              }
            }
          }
          const writes = calls.filter(
            (node) =>
              node.callee.type === 'MemberExpression' &&
              ['put', 'patch', 'post'].includes(key(node.callee)) &&
              httpSource(node.callee.object),
          )
          const target = writes.length ? profileTarget() : null
          if (target)
            for (const node of writes) {
              if (
                key(node.callee) !== target.method ||
                string(node.arguments[0]) !== target.endpoint
              )
                continue
              const fn = ownerFunction(node)
              if (
                !fn ||
                !actionCalls(fn).some(
                  (call) =>
                    authAction(call.callee, 'setUser') || authAction(call.callee, 'setSession'),
                )
              )
                context.report({ node, messageId: 'profile' })
            }
        }
        if (packages.http) {
          const exported = exportedHttpClients()
          const independent = independentlyAuthenticatedHttpClients()
          for (const node of calls) {
            const factory = clientFactory(node.callee)
            if (!factory || bonded.has(node) || exported.has(node) || independent.has(node))
              continue
            context.report({
              node,
              messageId: 'unbonded',
              data: { factory: factory.name },
            })
          }
          for (const node of calls) {
            const configIndex = transportConfig(node.callee, node.arguments)
            if (configIndex === null) continue
            const authorization = property(
              property(node.arguments[configIndex], 'headers'),
              'authorization',
            )
            if (authorization && !independentApiKey(authorization))
              context.report({ node, messageId: 'http' })
          }
        }
      },
    }
  },
}

const reactFlows = new WeakMap()
/**
 * Local React data flow, shared by the collection and editable-field diagnostics below.
 * Bindings, not spelling, identify hooks/state. No endpoint, copy, selector or CSS vocabulary
 * participates in recognition. This is deliberately a single-module syntax check.
 */
function reactStateFlow(context) {
  if (reactFlows.has(context.sourceCode)) return reactFlows.get(context.sourceCode)
  const source = context.sourceCode
  const unwrap = (node) => {
    while (
      [
        'ChainExpression',
        'TSAsExpression',
        'TSNonNullExpression',
        'TSSatisfiesExpression',
        'ParenthesizedExpression',
      ].includes(node?.type)
    )
      node = node.expression
    return node
  }
  const walk = (node, visit, descend = () => true) => {
    if (!node?.type) return
    visit(node)
    if (!descend(node)) return
    for (const key of source.visitorKeys[node.type] ?? []) {
      const value = node[key]
      if (Array.isArray(value)) value.forEach((part) => walk(part, visit, descend))
      else walk(value, visit, descend)
    }
  }
  const variable = (node) => {
    node = unwrap(node)
    if (!['Identifier', 'JSXIdentifier'].includes(node?.type)) return null
    for (let scope = source.getScope(node); scope; scope = scope.upper) {
      if (scope.set.has(node.name)) return scope.set.get(node.name)
    }
    return null
  }
  const member = (node) =>
    node?.type === 'MemberExpression'
      ? node.computed
        ? node.property.value
        : node.property.name
      : null
  const init = (node) => {
    const definition = variable(node)?.defs[0]
    return definition?.type === 'Variable' && definition.parent.kind === 'const'
      ? unwrap(definition.node.init)
      : null
  }
  const react = (node, name, seen = new Set()) => {
    node = unwrap(node)
    if (!node || seen.has(node)) return false
    seen.add(node)
    if (node.type === 'MemberExpression' && member(node) === name) {
      const definition = variable(node.object)?.defs[0]
      return (
        definition?.type === 'ImportBinding' &&
        definition.parent.source.value === 'react' &&
        ['ImportNamespaceSpecifier', 'ImportDefaultSpecifier'].includes(definition.node.type)
      )
    }
    const definition = variable(node)?.defs[0]
    if (definition?.type === 'ImportBinding')
      return definition.parent.source.value === 'react' && definition.node.imported?.name === name
    return react(init(node), name, seen)
  }
  const isFunction = (node) =>
    ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node?.type)
  const owner = (node) => {
    for (let parent = node.parent; parent; parent = parent.parent)
      if (isFunction(parent)) return parent
    return null
  }
  const callback = (node) =>
    isFunction(unwrap(node)) ? unwrap(node) : isFunction(init(node)) ? init(node) : null
  const states = []
  const effects = []
  const formTuple = (call) => {
    if (member(call?.callee) !== 'asState') return false
    let form = unwrap(call.callee.object)
    if (form?.type === 'Identifier') form = init(form)
    if (form?.type !== 'CallExpression') return false
    const imported = variable(form.callee)?.defs[0]
    return (
      imported?.type === 'ImportBinding' &&
      imported.parent.source.value === '@molecule/app-react' &&
      imported.node.imported?.name === 'useForm'
    )
  }
  walk(source.ast, (node) => {
    if (
      node.type === 'VariableDeclarator' &&
      node.id.type === 'ArrayPattern' &&
      node.init?.type === 'CallExpression' &&
      (react(node.init.callee, 'useState') || formTuple(node.init))
    ) {
      const [value, setter] = node.id.elements
      if (value?.type === 'Identifier' && setter?.type === 'Identifier')
        states.push({
          node,
          value: variable(value),
          setter: variable(setter),
          initial: formTuple(node.init) ? null : unwrap(node.init.arguments[0]),
          owner: owner(node),
        })
    }
    if (
      node.type === 'CallExpression' &&
      (react(node.callee, 'useEffect') || react(node.callee, 'useLayoutEffect'))
    ) {
      const fn = callback(node.arguments[0])
      if (fn) effects.push({ node, fn, owner: owner(node), writes: [] })
    }
  })
  const stateFor = (node) => states.find((state) => state.value && state.value === variable(node))
  const contains = (tree, part) => tree.range[0] <= part.range[0] && tree.range[1] >= part.range[1]
  const asyncGroup = (node, effect) => {
    const promise = (call) => {
      while (
        call?.type === 'CallExpression' &&
        ['then', 'catch', 'finally'].includes(member(call.callee))
      )
        call = unwrap(call.callee.object)
      return call
    }
    for (let parent = node; parent; parent = parent.parent) {
      if (
        isFunction(parent) &&
        parent.parent?.type === 'CallExpression' &&
        ['then', 'catch', 'finally'].includes(member(parent.parent.callee))
      )
        return promise(parent.parent)
      if (isFunction(parent) && parent.async) {
        let awaits = false
        walk(
          parent.body,
          (part) => {
            if (part.type === 'AwaitExpression' && part.range[0] < node.range[1]) awaits = true
          },
          (part) => part === parent.body || !isFunction(part),
        )
        if (awaits) return parent
      }
      if (parent === effect.fn) break
    }
    let awaits = false
    walk(node, (part) => {
      if (part.type === 'AwaitExpression') awaits = true
    })
    return awaits ? node : null
  }
  const asyncWrite = (node, effect) => Boolean(asyncGroup(node, effect))
  for (const effect of effects)
    walk(effect.fn.body, (node) => {
      if (node.type !== 'CallExpression') return
      const state = states.find(
        (item) =>
          item.setter && item.setter === variable(node.callee) && item.owner === effect.owner,
      )
      if (state)
        effect.writes.push({
          node,
          state,
          argument: unwrap(node.arguments[0]),
          group: asyncGroup(node, effect),
          async: asyncWrite(node, effect),
        })
      // Promise.then(setItems), without an intermediate arrow callback.
      if (member(node.callee) === 'then') {
        const target = states.find(
          (item) =>
            item.setter &&
            item.setter === variable(node.arguments[0]) &&
            item.owner === effect.owner,
        )
        if (target)
          effect.writes.push({
            node,
            state: target,
            argument: null,
            group: unwrap(node.callee.object),
            async: true,
          })
      }
    })
  const exits = (node) =>
    node?.type === 'ReturnStatement' ||
    node?.type === 'ThrowStatement' ||
    (node?.type === 'BlockStatement' && exits(node.body.at(-1)))
  // Conditions which must hold to reach a syntax location, including earlier return guards.
  const conditions = (node, stop) => {
    const result = []
    for (let part = node; part?.parent && part !== stop; part = part.parent) {
      const parent = part.parent
      if (
        parent.type === 'LogicalExpression' &&
        parent.right === part &&
        ['&&', '||'].includes(parent.operator)
      )
        result.push([parent.left, parent.operator === '&&'])
      if (['IfStatement', 'ConditionalExpression'].includes(parent.type) && parent.test !== part)
        result.push([parent.test, parent.consequent === part])
      if (parent.type === 'BlockStatement') {
        for (const previous of parent.body) {
          if (previous === part) break
          if (previous.range[0] >= part.range[0]) break
          if (previous.type === 'IfStatement' && !previous.alternate && exits(previous.consequent))
            result.push([previous.test, false])
        }
      }
    }
    return result
  }
  const implies = (test, truth, target, expected) => {
    test = unwrap(test)
    if (!test) return false
    if (target(test)) return truth === expected
    if (test.type === 'UnaryExpression' && test.operator === '!')
      return implies(test.argument, !truth, target, expected)
    if (test.type === 'BinaryExpression' && ['===', '!==', '==', '!='].includes(test.operator)) {
      for (const [left, right] of [
        [test.left, test.right],
        [test.right, test.left],
      ])
        if (typeof right.value === 'boolean')
          return implies(
            left,
            truth === !test.operator.includes('!') ? right.value : !right.value,
            target,
            expected,
          )
    }
    if (
      test.type === 'LogicalExpression' &&
      ((test.operator === '&&' && truth) || (test.operator === '||' && !truth))
    )
      return (
        implies(test.left, truth, target, expected) || implies(test.right, truth, target, expected)
      )
    return false
  }
  const guarded = (node, stop, target, expected) =>
    conditions(node, stop).some(([test, truth]) => implies(test, truth, target, expected))
  const attr = (node, name) =>
    node.attributes?.find((part) => part.type === 'JSXAttribute' && part.name.name === name)
  const expression = (attribute) =>
    unwrap(
      attribute?.value?.type === 'JSXExpressionContainer'
        ? attribute.value.expression
        : attribute?.value,
    )
  const actionable = (opening) => {
    if (attr(opening, 'onClick')) return true
    if (opening.name.type !== 'JSXIdentifier') return false
    if (['a', 'area'].includes(opening.name.name)) return Boolean(attr(opening, 'href'))
    const definition = variable(opening.name)?.defs[0]
    return (
      definition?.type === 'ImportBinding' &&
      ['react-router', 'react-router-dom', '@molecule/app-routing-react-router'].includes(
        definition.parent.source.value,
      ) &&
      ['Link', 'NavLink'].includes(definition.node.imported?.name) &&
      Boolean(attr(opening, 'to'))
    )
  }
  const flow = {
    source,
    unwrap,
    walk,
    variable,
    member,
    init,
    react,
    isFunction,
    owner,
    callback,
    states,
    effects,
    stateFor,
    contains,
    asyncWrite,
    conditions,
    implies,
    guarded,
    attr,
    expression,
    actionable,
  }
  reactFlows.set(source, flow)
  return flow
}

/**
 * Reads the components a file renders from their own modules: each relative import is parsed once
 * per linted file with the scaffold parser, and `roots` lists the expressions a component function
 * returns. Shared by the scaffold rules that must see through an imported component.
 *
 * @param parser - The parser the scaffold lints with (typescript-eslint).
 * @param context - The rule context of the file being linted.
 * @returns Resolution helpers sharing one parse cache for this file.
 */
function componentResolver(parser, context) {
  const cache = new Map()
  const scopes = new WeakMap([[context.sourceCode.ast, context.sourceCode.scopeManager.scopes]])
  const unwrap = (node) =>
    ['TSAsExpression', 'TSNonNullExpression', 'ParenthesizedExpression'].includes(node?.type)
      ? unwrap(node.expression)
      : node
  const declaration = (tree, name) => {
    for (const statement of tree.body) {
      const node = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
      if (!node) continue
      if (node.type === 'FunctionDeclaration' && node.id?.name === name) return node
      if (node.type === 'VariableDeclaration') {
        const found = node.declarations.find(
          (item) => item.id.type === 'Identifier' && item.id.name === name,
        )
        if (found) return unwrap(found.init)
      }
    }
    return null
  }
  const imported = (tree, name, filename) => {
    const statement = tree.body.find(
      (node) =>
        node.type === 'ImportDeclaration' &&
        node.specifiers.some((item) => item.local.name === name),
    )
    if (!statement || statement.importKind === 'type' || !statement.source.value.startsWith('.'))
      return null
    const spec = statement.specifiers.find((item) => item.local.name === name)
    if (spec.importKind === 'type') return null
    const stem = new URL(statement.source.value, `file://${filename}`).pathname
    const paths = [
      stem,
      ...['.tsx', '.ts', '.jsx', '.js'].map((ext) => stem.replace(/\.[cm]?jsx?$/, '') + ext),
      stem + '/index.tsx',
    ]
    for (const file of paths) {
      let source = cache.get(file)
      if (source === undefined) {
        try {
          const parsed = parser.parseForESLint(readFileSync(file, 'utf8'), {
            filePath: file,
            tsconfigRootDir: dirname(file),
            ecmaFeatures: { jsx: true },
            sourceType: 'module',
            loc: true,
            range: true,
          })
          source = parsed.ast
          scopes.set(source, parsed.scopeManager.scopes)
        } catch (_error) {
          source = null
        }
        cache.set(file, source)
      }
      if (!source) continue
      const name = spec.type === 'ImportDefaultSpecifier' ? 'default' : spec.imported?.name
      const exported =
        name === 'default'
          ? source.body.find((node) => node.type === 'ExportDefaultDeclaration')?.declaration
          : declaration(source, name)
      return exported ? { node: exported, tree: source, filename: file } : null
    }
    return null
  }
  const roots = (node) => {
    if (node?.type === 'Identifier') return []
    if (
      ['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(node?.type)
    ) {
      if (node.body.type !== 'BlockStatement') return [node.body]
      const result = []
      const visit = (part) => {
        if (
          !part ||
          ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
            part.type,
          )
        )
          return
        if (part.type === 'ReturnStatement') {
          if (part.argument) result.push(part.argument)
          return
        }
        for (const [key, value] of Object.entries(part)) {
          if (['parent', 'tokens', 'comments', 'loc', 'range'].includes(key)) continue
          if (Array.isArray(value)) for (const item of value) visit(item)
          else if (value && typeof value === 'object') visit(value)
        }
      }
      visit(node.body)
      return result
    }
    return []
  }
  return { scopes, unwrap, imported, roots, declaration }
}

const noInAppDocumentNavigation = {
  meta: {
    type: 'problem',
    docs: { description: 'Use router links for page destinations within the app' },
    schema: [
      {
        type: 'object',
        properties: { apiBase: { type: 'string' } },
        additionalProperties: false,
      },
    ],
    messages: {
      documentNavigation:
        'This starts a new document load for an app page. Use client-side navigation. Use a router Link for a page destination. For navigation after an action, call useNavigate() from react-router and use its returned function{{options}}.',
      routeButton:
        'This button only opens an app page. Use a router <Link to={{target}}> with the same content and styling so it has a link destination.',
    },
  },
  create(context) {
    const source = context.sourceCode
    const rootRelative = /^\/(?![/\\])/
    const apiBases = [DEFAULT_API_BASE, context.options[0]?.apiBase]
      .filter((base) => base && rootRelative.test(base))
      .map((base) => new URL(base, 'http://localhost').pathname.replace(/\/$/, ''))
    const name = (member) =>
      member?.type === 'MemberExpression'
        ? member.computed
          ? literalString(member.property)
          : member.property.name
        : null
    const binding = (node) => {
      if (node?.type !== 'Identifier') return null
      for (let scope = source.getScope(node); scope; scope = scope.upper) {
        const variable = scope.set.get(node.name)
        if (variable) return variable
      }
      return null
    }
    const localDefinition = (node) => {
      const variable = binding(node)
      if (
        variable?.defs.length !== 1 ||
        variable.references.some((ref) => ref.isWrite() && !ref.init)
      )
        return null
      return variable.defs[0]
    }
    const initializer = (def) =>
      def?.type === 'Variable' && def.parent.kind === 'const' ? def.node.init : null
    const global = (node, names) => {
      return node?.type === 'Identifier' && names.includes(node.name) && !binding(node)?.defs.length
    }
    const isLocation = (node) =>
      global(node, ['location']) ||
      (name(node) === 'location' && global(node.object, ['window', 'globalThis', 'self']))
    const appPath = (target, allowTemplatePrefix = false) => {
      const whole = literalString(target)
      const prefix =
        whole ??
        (allowTemplatePrefix && target?.type === 'TemplateLiteral' && target.quasis[0].value.cooked)
      const clean = prefix && prefix.replace(/[\n\r\t]/g, '')
      if (!clean || !rootRelative.test(clean)) return null
      const path =
        whole === null ? clean.split(/[?#]/, 1)[0] : new URL(clean, 'http://localhost').pathname
      return apiBases.some(
        (base) =>
          path.startsWith(`${base}/`) || (path === base && (whole !== null || path !== clean)),
      )
        ? null
        : clean
    }
    const check = (node, target, replace = false) => {
      if (!appPath(target, true)) return
      context.report({
        node,
        messageId: 'documentNavigation',
        data: { options: replace ? ' with { replace: true }' : '' },
      })
    }
    // A plain button that delegates to a named handler hides its destination.
    // Check a single default push with a literal path and no other behavior.
    const presentationAttribute =
      /^(?:type|onClick|id|className|style|title|tabIndex|aria-label|aria-labelledby|aria-describedby|data-.+)$/
    const checkRouteButton = (node) => {
      if (
        node.name.type !== 'JSXIdentifier' ||
        node.name.name !== 'button' ||
        !node.attributes.every(
          (attr) => attr.type === 'JSXAttribute' && presentationAttribute.test(attr.name.name),
        )
      )
        return
      const attribute = (name) => node.attributes.find((attr) => attr.name.name === name)?.value
      if (literalString(attribute('type')) !== 'button') return
      const click = attribute('onClick')
      if (click?.type !== 'JSXExpressionContainer' || click.expression.type !== 'Identifier') return
      const def = localDefinition(click.expression)
      const fn = def?.type === 'FunctionName' ? def.node : initializer(def)
      if (
        !fn ||
        !['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(fn.type)
      )
        return
      if (fn.async || fn.generator || fn.params.length) return
      let call = fn.body
      if (call.type === 'BlockStatement') {
        const [only] = call.body
        if (
          call.body.length !== 1 ||
          !['ExpressionStatement', 'ReturnStatement'].includes(only.type)
        )
          return
        call = only.type === 'ExpressionStatement' ? only.expression : only.argument
      }
      if (call?.type !== 'CallExpression' || call.optional || call.arguments.length !== 1) return
      const hook = initializer(localDefinition(call.callee))
      if (hook?.type !== 'CallExpression' || hook.optional || hook.arguments.length) return
      const imported = localDefinition(hook.callee)
      if (
        imported?.type !== 'ImportBinding' ||
        !['react-router', 'react-router-dom'].includes(imported.parent.source.value) ||
        imported.node.imported?.name !== 'useNavigate'
      )
        return
      const target = appPath(call.arguments[0])
      if (target)
        context.report({ node, messageId: 'routeButton', data: { target: JSON.stringify(target) } })
    }
    return {
      JSXOpeningElement: checkRouteButton,
      CallExpression(node) {
        const method = name(node.callee)
        if (['assign', 'replace'].includes(method) && isLocation(node.callee.object))
          check(node, node.arguments[0], method === 'replace')
      },
      AssignmentExpression(node) {
        if (node.operator === '=' && name(node.left) === 'href' && isLocation(node.left.object))
          check(node, node.right)
      },
    }
  },
}

/** Shared scaffold diagnostics. ESLint supplies the parser used for imported source files. */
export function scaffoldRules(parser) {
  const rules = {
    'no-in-app-document-navigation': noInAppDocumentNavigation,
    // WCAG technique H2: avoid two adjacent keyboard stops for the same image/name
    // destination. Inspect only a direct image link and its next static layout sibling;
    // separate rows, conditional layouts and opaque components remain independent.
    // The fix hides the image link from assistive technology and the tab order, so the
    // markup, classes and click target stay as written; the deploy applies it like every
    // other ESLint fix, and the rule is a warning like the scaffold's other fixable rules.
    'single-image-name-link': {
      meta: {
        type: 'suggestion',
        fixable: 'code',
        docs: {
          description:
            'Combine adjacent image and text links for the same name and destination, or keep the image decorative.',
        },
        schema: [],
        messages: {
          redundant:
            'These adjacent image and text links use the same displayed name and destination, so keyboard and screen-reader users meet the same link twice. ESLint --fix hides the image link (aria-hidden="true" tabIndex={-1}); or use one link around both.',
          unnamed:
            'This image link has no name (its image has an empty or missing alt) and sits beside a text link to the same destination. ESLint --fix hides the image link (aria-hidden="true" tabIndex={-1}); or use one link around both.',
        },
      },
      create(context) {
        const source = context.sourceCode
        const attr = (node, name) =>
          node.openingElement.attributes.find(
            (part) => part.type === 'JSXAttribute' && part.name.name === name,
          )
        const value = (node) => {
          if (node?.type === 'Literal' && typeof node.value === 'string')
            return `text:${node.value}`
          if (node?.type === 'JSXExpressionContainer') return value(node.expression)
          if (['Identifier', 'MemberExpression', 'TemplateLiteral'].includes(node?.type))
            return `expression:${source.getText(node)}`
          return null
        }
        const tag = (node) => node?.openingElement?.name
        const binding = (node) => {
          for (let scope = source.getScope(node); scope; scope = scope.upper)
            if (scope.set.has(node.name)) return scope.set.get(node.name)?.defs[0]
          return null
        }
        const link = (node) => {
          const name = tag(node)
          if (name?.type !== 'JSXIdentifier') return null
          let destination = 'href'
          if (name.name !== 'a') {
            const definition = binding(name)
            if (
              definition?.type !== 'ImportBinding' ||
              !['react-router', 'react-router-dom'].includes(definition.parent.source.value) ||
              !['Link', 'NavLink'].includes(definition.node.imported?.name)
            )
              return null
            destination = 'to'
          }
          if (
            node.openingElement.attributes.some((part) => part.type === 'JSXSpreadAttribute') ||
            ['aria-label', 'aria-labelledby', 'aria-hidden', 'download', 'target', 'onClick'].some(
              (name) => attr(node, name),
            )
          )
            return null
          return value(attr(node, destination)?.value)
        }
        const children = (node) =>
          (node.children ?? []).filter(
            (child) =>
              !(child.type === 'JSXText' && child.value.trim() === '') &&
              !(
                child.type === 'JSXExpressionContainer' &&
                (child.expression.type === 'JSXEmptyExpression' ||
                  (child.expression.type === 'Literal' &&
                    typeof child.expression.value === 'string' &&
                    child.expression.value.trim() === ''))
              ),
          )
        const textName = (node) => {
          const parts = children(node)
          if (parts.length !== 1) return null
          const part = parts[0]
          return part.type === 'JSXText' ? `text:${part.value.trim()}` : value(part)
        }
        // The link's only child is an image without a name of its own (empty or missing alt).
        const unnamedImage = (node) => {
          const [image, ...others] = children(node)
          if (others.length || tag(image)?.name !== 'img' || attr(image, 'aria-hidden'))
            return false
          const alt = attr(image, 'alt')
          return !alt || value(alt.value) === 'text:'
        }
        const imageNames = (node) => {
          const [image, ...others] = children(node)
          if (others.length || tag(image)?.name !== 'img' || attr(image, 'aria-hidden')) return []
          const alt = attr(image, 'alt')?.value
          const name = value(alt)
          if (!name || name === 'text:') return []
          const expression = alt.expression
          // Descriptive words can surround a single name. Match the interpolation
          // itself so the decision does not depend on the language of those words.
          if (expression?.type === 'TemplateLiteral' && expression.expressions.length === 1)
            return [name, value(expression.expressions[0])].filter(Boolean)
          return [name]
        }
        const textLinks = (node) => {
          if (node.type !== 'JSXElement') return []
          const destination = link(node)
          if (destination) return [{ node, destination, name: textName(node) }]
          if (!['div', 'span', 'p', 'small', 'strong', 'b'].includes(tag(node)?.name)) return []
          if (
            node.openingElement.attributes.some((part) => part.type === 'JSXSpreadAttribute') ||
            ['aria-hidden', 'hidden', 'onClick'].some((name) => attr(node, name))
          )
            return []
          return children(node).flatMap(textLinks)
        }
        // aria-hidden="true" tabIndex={-1} on the image link: an existing tabIndex is replaced,
        // never duplicated, and the attributes go after the last one (or after the tag and any
        // type arguments).
        const hideImageLink = (opening) => (fixer) => {
          const tabIndex = opening.attributes.find(
            (part) => part.type === 'JSXAttribute' && part.name.name === 'tabIndex',
          )
          const after =
            opening.attributes.at(-1) ??
            opening.typeArguments ??
            opening.typeParameters ??
            opening.name
          if (!tabIndex) return fixer.insertTextAfter(after, ' aria-hidden="true" tabIndex={-1}')
          return [
            fixer.replaceText(tabIndex, 'tabIndex={-1}'),
            fixer.insertTextAfter(after, ' aria-hidden="true"'),
          ]
        }
        return {
          JSXElement(node) {
            const parts = children(node)
            for (let i = 0; i + 1 < parts.length; i++) {
              const image = parts[i]
              if (image.type !== 'JSXElement') continue
              const destination = link(image)
              if (!destination) continue
              const names = imageNames(image)
              const unnamed = !names.length && unnamedImage(image)
              if (!names.length && !unnamed) continue
              if (
                textLinks(parts[i + 1]).some(
                  (text) =>
                    text.destination === destination &&
                    (unnamed ? Boolean(text.name) : names.includes(text.name)),
                )
              )
                context.report({
                  node: image.openingElement,
                  messageId: unnamed ? 'unnamed' : 'redundant',
                  fix: hideImageLink(image.openingElement),
                })
            }
          },
        }
      },
    },
    // ESLint owns this syntax policy; neither route names nor supplied tests establish access.
    // Keep a raw URL match independent of the session, or handle access explicitly. TypeScript
    // cannot diagnose a missing navigation effect, and a landing-page probe cannot discover a
    // query view whose link the signed-out render omits. Reuse the module resolver for thin
    // app-owned session hooks rather than guessing authentication from identifier spelling.
    'url-selections-declare-access': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Keep raw React Router URL selections independent of session state, or explicitly handle their access with a route guard.',
        },
        schema: [],
        messages: {
          access:
            'This URL selection is combined with session state without an explicit navigation guard in this component. Hiding its link or disabling its request does not guard a direct visit. Keep public selections independent of the session. For a private view, use useListRoute from @molecule/app-routing-react-router with selections: { public: { path }, private: { path, query, requiresAuth: true } }, auth: { status, redirectTo }, and load only with canLoad. A custom guard may instead return <Navigate> for the signed-out URL selection.',
        },
      },
      create(context) {
        if (TEST.test(context.filename)) return {}
        const source = context.sourceCode
        const routers = ['react-router', 'react-router-dom', '@molecule/app-routing-react-router']
        if (
          !source.ast.body.some(
            (node) =>
              node.type === 'ImportDeclaration' &&
              routers.includes(node.source.value) &&
              node.importKind !== 'type' &&
              node.specifiers.some(
                (spec) =>
                  spec.importKind !== 'type' &&
                  (spec.type === 'ImportNamespaceSpecifier' ||
                    ['useSearchParams', 'useLocation'].includes(spec.imported?.name)),
              ),
          )
        )
          return {}
        const resolver = componentResolver(parser, context)
        const { walk, owner, isFunction, member, unwrap, effects } = reactStateFlow(context)
        const tree = source.ast
        const filename = context.filename
        const binding = (node, ast) => {
          if (!['Identifier', 'JSXIdentifier'].includes(node?.type)) return null
          for (const scope of resolver.scopes.get(ast) ?? []) {
            const reference = scope.references.find((ref) => ref.identifier === node)
            if (reference) return reference.resolved
          }
          return null
        }
        const imported = (node, ast, modules, names) => {
          node = unwrap(node)
          const def = binding(node?.type === 'MemberExpression' ? node.object : node, ast)?.defs[0]
          return (
            def?.type === 'ImportBinding' &&
            def.parent.importKind !== 'type' &&
            def.node.importKind !== 'type' &&
            modules.includes(def.parent.source.value) &&
            (node.type === 'MemberExpression'
              ? def.node.type === 'ImportNamespaceSpecifier' && names.includes(member(node))
              : names.includes(def.node.imported?.name))
          )
        }
        const children = (node) =>
          (source.visitorKeys[node?.type] ?? []).flatMap((key) =>
            Array.isArray(node[key]) ? node[key] : [node[key]],
          )
        // Immutable aliases and destructured hook results preserve provenance. Reassigned
        // values, opaque external hooks and arbitrary function arguments are not inferred.
        const initial = (node, ast) => {
          const variable = binding(node, ast)
          const def = variable?.defs[0]
          return def?.type === 'Variable' &&
            def.parent.kind === 'const' &&
            !variable.references.some((ref) => ref.isWrite() && !ref.init)
            ? def.node.init
            : null
        }
        const session = (node, ast = tree, file = filename, seen = new Set(), projection = []) => {
          node = unwrap(node)
          if (!node || seen.has(node)) return false
          seen.add(node)
          if (node.type === 'Identifier') {
            const pattern = binding(node, ast)?.defs[0]?.node.id
            if (pattern?.type === 'ObjectPattern') {
              const prop = pattern.properties.find((part) => part.value?.name === node.name)
              if (!prop || prop.computed) return false
              projection = [prop.key.name ?? prop.key.value, ...projection]
            }
            return session(initial(node, ast), ast, file, seen, projection)
          }
          if (node.type === 'CallExpression') {
            if (imported(node.callee, ast, ['@molecule/app-react'], ['useAuth'])) return true
            const def = binding(node.callee, ast)?.defs[0]
            if (def?.type === 'ImportBinding' && def.parent.source.value.startsWith('.')) {
              const resolved = resolver.imported(ast, node.callee.name, file)
              return Boolean(
                resolved &&
                resolver
                  .roots(resolved.node)
                  .some((root) =>
                    session(root, resolved.tree, resolved.filename, new Set(seen), projection),
                  ),
              )
            }
            const fn = def?.type === 'FunctionName' ? def.node : initial(node.callee, ast)
            return isFunction(fn)
              ? resolver
                  .roots(fn)
                  .some((root) => session(root, ast, file, new Set(seen), projection))
              : false
          }
          if (node.type === 'MemberExpression')
            return session(node.object, ast, file, seen, [member(node), ...projection])
          if (node.type === 'ObjectExpression' && projection.length) {
            const prop = node.properties.find(
              (part) => !part.computed && (part.key?.name ?? part.key?.value) === projection[0],
            )
            return Boolean(prop && session(prop.value, ast, file, seen, projection.slice(1)))
          }
          if (projection.length) return false
          return children(node).some((child) => session(child, ast, file, seen))
        }
        const query = (node, seen = new Set()) => {
          if (!node || seen.has(node)) return false
          seen.add(node)
          const init = unwrap(initial(node, tree))
          if (init?.type === 'Identifier') return query(init, seen)
          return (
            init?.type === 'CallExpression' &&
            imported(init.callee, tree, routers, ['useSearchParams']) &&
            binding(node, tree)?.defs[0]?.node.id.type === 'ArrayPattern' &&
            binding(node, tree).defs[0].node.id.elements[0]?.name === node.name
          )
        }
        const location = (node, seen = new Set()) => {
          node = unwrap(node)
          if (!node || seen.has(node)) return false
          seen.add(node)
          return node.type === 'CallExpression'
            ? imported(node.callee, tree, routers, ['useLocation'])
            : node.type === 'Identifier' && location(initial(node, tree), seen)
        }
        const urlRead = (node, seen = new Set()) => {
          node = unwrap(node)
          if (!node || seen.has(node)) return false
          seen.add(node)
          if (node.type === 'Identifier') return urlRead(initial(node, tree), seen)
          if (node.type === 'LogicalExpression' && node.operator === '??')
            return urlRead(node.left, seen)
          return (
            (node.type === 'CallExpression' &&
              member(node.callee) === 'get' &&
              query(node.callee.object)) ||
            (member(node) === 'pathname' && location(node.object))
          )
        }
        const match = (node) => {
          if (
            node?.type !== 'BinaryExpression' ||
            !['===', '==', '!==', '!='].includes(node.operator)
          )
            return false
          return [
            [unwrap(node.left), unwrap(node.right)],
            [unwrap(node.right), unwrap(node.left)],
          ].some(
            ([read, value]) =>
              value?.type === 'Literal' &&
              typeof value.value === 'string' &&
              value.value !== '' &&
              urlRead(read),
          )
        }
        const selections = (node, seen = new Set()) => {
          node = unwrap(node)
          if (!node || seen.has(node)) return []
          seen.add(node)
          if (match(node)) return [node]
          if (node.type === 'Identifier') return selections(initial(node, tree), seen)
          if (isFunction(node)) return []
          return children(node).flatMap((child) => selections(child, seen))
        }
        const combinations = []
        const guards = []
        // Session-aware actions on a public filter do not make its view private. Follow
        // immutable aliases to their consumers, excluding event handlers, control attributes
        // and expressions whose only rendered elements are native interactive controls.
        const affectsView = (node, seen = new Set()) => {
          if (!node || seen.has(node)) return false
          seen.add(node)
          for (let part = node; part; part = part.parent)
            if (part.type === 'JSXAttribute' && /^on[A-Z]/.test(part.name?.name)) return false
          for (let part = node; part?.parent; part = part.parent) {
            const parent = part.parent
            if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
              const variable = binding(parent.id, tree)
              return Boolean(
                variable?.references.some(
                  (ref) => ref.isRead() && affectsView(ref.identifier, seen),
                ),
              )
            }
            if (parent.type === 'JSXExpressionContainer') {
              if (parent.parent.type === 'JSXAttribute')
                return ![
                  'disabled',
                  'hidden',
                  'className',
                  'aria-disabled',
                  'aria-current',
                  'aria-selected',
                ].includes(parent.parent.name?.name)
              const elements = []
              walk(part, (child) => {
                if (child.type === 'JSXOpeningElement') elements.push(child.name)
              })
              return (
                !elements.length ||
                !elements.every(
                  (name) =>
                    name.type === 'JSXIdentifier' &&
                    ['a', 'button', 'input', 'select', 'textarea', 'option'].includes(name.name),
                )
              )
            }
            if (
              parent.type === 'CallExpression' ||
              parent.type === 'ReturnStatement' ||
              isFunction(parent)
            )
              return true
          }
          return false
        }
        const renderOwner = (node) => {
          const fn = owner(node)
          return effects.find((effect) => effect.fn === fn)?.owner ?? fn
        }
        // A component's redirect also covers the callbacks written inside it (a loader handed to a
        // request hook): they exist only while that component renders, and a signed-out direct
        // visit still leaves through its <Navigate>. On 2026-11-21 (P491 l3778) a Home page with
        // `if (following && status === 'unauthenticated') return <Navigate …>` was flagged for
        // `following && !user` in its useApiData loader; the rewrite that satisfied this rule hid
        // the Your Feed tab from signed-in readers. A guard in another component still covers nothing.
        const covers = (guardOwner, inner) => {
          if (guardOwner === inner) return true
          for (let node = inner; guardOwner && node; node = node.parent)
            if (node === guardOwner) return true
          return false
        }
        const navigates = (node) => {
          node = unwrap(node)
          if (node?.type === 'ReturnStatement') return navigates(node.argument)
          if (node?.type === 'BlockStatement') return node.body.some(navigates)
          if (node?.type === 'ExpressionStatement') return navigates(node.expression)
          if (node?.type === 'CallExpression') {
            const init = unwrap(initial(node.callee, tree))
            return Boolean(
              init?.type === 'CallExpression' &&
              imported(init.callee, tree, routers, ['useNavigate']) &&
              effects.some((effect) => effect.fn === owner(node)),
            )
          }
          return (
            node?.type === 'JSXElement' &&
            imported(node.openingElement.name, tree, routers, ['Navigate']) &&
            Boolean(node.openingElement.attributes.find((attr) => attr.name?.name === 'to'))
          )
        }
        const condition = (node) => {
          const selected = selections(node)
          if (selected.length && session(node))
            combinations.push({ node, selected, owner: renderOwner(node) })
        }
        return {
          LogicalExpression: condition,
          ConditionalExpression(node) {
            condition(node.test)
            if (navigates(node.consequent) || navigates(node.alternate)) guards.push(node.test)
          },
          IfStatement(node) {
            condition(node.test)
            if (navigates(node.consequent) || navigates(node.alternate)) guards.push(node.test)
          },
          'Program:exit'() {
            const reported = new Set()
            for (const combination of combinations) {
              if (!affectsView(combination.node)) continue
              // An explicit guard is a supported custom implementation, not a reason to
              // require our helper. This is guard presence, not proof of its boolean logic.
              const guarded = guards.some(
                (guard) =>
                  covers(renderOwner(guard), combination.owner) &&
                  session(guard) &&
                  selections(guard).some((selection) => combination.selected.includes(selection)),
              )
              if (guarded) continue
              for (const node of combination.selected) {
                if (reported.has(node)) continue
                reported.add(node)
                context.report({ node, messageId: 'access' })
              }
            }
          },
        }
      },
    },
    'effects-preserve-form-edits': {
      meta: {
        type: 'problem',
        schema: [],
        docs: {
          description: 'Hydrate editable fields when their record arrives while preserving edits.',
        },
        messages: {
          overwrite:
            'This effect can overwrite typed edits. Render the form once its record loads, keyed by record.id, fields from props; or useForm({ values: record }) from @molecule/app-react.',
          unfilled:
            'This draft skips pristine fields after an edit. Render the form once its record loads, keyed by record.id, fields from props; or useForm({ values: record }) from @molecule/app-react.',
          earlyMount:
            'This form mounts empty, before its record. Render the form once its record loads, keyed by record.id, fields from props; or useForm({ values: record }) from @molecule/app-react.',
        },
      },
      create(context) {
        return {
          'Program:exit'() {
            const flow = reactStateFlow(context)
            const {
              walk,
              unwrap,
              variable,
              stateFor,
              member,
              attr,
              expression,
              callback,
              effects,
              guarded,
            } = flow
            const fields = []
            const keyedChildren = []
            // Editability is a state/control fact, independent of how a handler is spelled.
            // A curried helper, useCallback or object method must not hide the field.
            const mutators = (state) => [
              ...new Set(
                state.setter.references
                  .filter(
                    (ref) =>
                      ref.isRead() &&
                      !effects.some((effect) => flow.contains(effect.node, ref.identifier)),
                  )
                  .map((ref) => flow.owner(ref.identifier))
                  .filter((fn) => {
                    if (!fn) return false
                    const name =
                      fn.id ?? (fn.parent?.type === 'VariableDeclarator' ? fn.parent.id : null)
                    return !name || variable(name)?.references.length > 0
                  }),
              ),
            ]
            // A controlled value is a draft only if its own input handler stores it
            // synchronously. Resolve same-file definitions, including factories, but
            // stop at imports, deferred callbacks and the first await of each function.
            const inputStores = (handler, state) => {
              const seen = new Set()
              const dereference = (node, aliases, visited = new Set()) => {
                node = unwrap(node)
                const binding = variable(node)
                if (!binding || visited.has(binding)) return node
                visited.add(binding)
                if (aliases.has(binding)) return dereference(aliases.get(binding), aliases, visited)
                const def = binding.defs[0]
                if (def?.type === 'FunctionName') return def.node
                if (
                  def?.type === 'Variable' &&
                  def.parent.kind === 'const' &&
                  def.node.id.type === 'Identifier'
                )
                  return dereference(def.node.init, aliases, visited)
                return node
              }
              const bind = (fn, args, aliases) => {
                const next = new Map(aliases)
                fn.params.forEach((param, i) => {
                  if (param.type === 'Identifier' && args[i]) next.set(variable(param), args[i])
                })
                return next
              }
              const firstAwait = (fn) => {
                let end = Infinity
                walk(
                  fn.body,
                  (part) => {
                    if (part.type === 'AwaitExpression') end = Math.min(end, part.range[0])
                  },
                  (part) => !flow.isFunction(part),
                )
                return end
              }
              const functionOf = (value, aliases) => {
                value = dereference(value, aliases)
                if (value?.type === 'CallExpression' && flow.react(value.callee, 'useCallback'))
                  value = dereference(value.arguments[0], aliases)
                if (value?.type === 'MemberExpression') {
                  const owners = new Set()
                  const object = dereference(value.object, aliases, owners)
                  const readonly = () => {
                    for (const binding of owners) {
                      if (
                        binding.defs.some(
                          (def) => def.node?.parent?.parent?.type === 'ExportNamedDeclaration',
                        )
                      )
                        return false
                      for (const reference of binding.references) {
                        if (!reference.isRead()) continue
                        const identifier = reference.identifier
                        const parent = identifier.parent
                        if (
                          parent?.type === 'VariableDeclarator' &&
                          parent.init === identifier &&
                          parent.id.type === 'Identifier' &&
                          parent.parent.kind === 'const'
                        ) {
                          const alias = variable(parent.id)
                          if (!alias) return false
                          owners.add(alias)
                          continue
                        }
                        if (parent?.type !== 'MemberExpression' || parent.object !== identifier)
                          return false
                        let access = parent
                        while (
                          access.parent?.type === 'MemberExpression' &&
                          access.parent.object === access
                        )
                          access = access.parent
                        const use = access.parent
                        if (
                          (use?.type === 'AssignmentExpression' && use.left === access) ||
                          (use?.type === 'UpdateExpression' && use.argument === access) ||
                          (use?.type === 'UnaryExpression' && use.operator === 'delete') ||
                          (use?.type === 'CallExpression' &&
                            use.callee === access &&
                            access !== value)
                        )
                          return false
                      }
                    }
                    return true
                  }
                  let prop
                  if (
                    object?.type === 'ObjectExpression' &&
                    !object.properties.some(
                      (part) => part.type === 'Property' && part.kind !== 'init',
                    ) &&
                    readonly()
                  )
                    for (const part of object.properties.toReversed()) {
                      // Later properties win. An opaque override cannot certify a handler.
                      if (
                        part.type === 'SpreadElement' ||
                        (part.computed && part.key.type !== 'Literal')
                      )
                        break
                      if (
                        part.type !== 'Property' ||
                        String(part.key.name ?? part.key.value) !== member(value)
                      )
                        continue
                      if (part.kind === 'init') prop = part
                      break
                    }
                  value = prop && dereference(prop.value, aliases)
                }
                return flow.isFunction(value) ? value : null
              }
              const invoke = (fn, aliases) => {
                if (!fn || seen.has(fn)) return false
                seen.add(fn)
                const end = firstAwait(fn)
                let stored = false
                walk(
                  fn.body,
                  (part) => {
                    if (part.type !== 'CallExpression' || part.range[1] > end) return
                    const callee = dereference(part.callee, aliases)
                    if (variable(callee) === state.setter) stored = true
                    const called = functionOf(callee, aliases)
                    if (called && invoke(called, bind(called, part.arguments, aliases)))
                      stored = true
                  },
                  (part) => !flow.isFunction(part) && part.range[0] < end,
                )
                seen.delete(fn)
                return stored
              }
              const entries = (node, aliases, factories = new Set()) => {
                node = dereference(node, aliases)
                if (!node) return false
                if (variable(node) === state.setter) return true
                const direct = functionOf(node, aliases)
                if (direct) return invoke(direct, aliases)
                if (node.type !== 'CallExpression') return false
                const factory = functionOf(node.callee, aliases)
                if (!factory || factory.async || factories.has(factory)) return false
                const next = bind(factory, node.arguments, aliases)
                const visited = new Set(factories).add(factory)
                const returns = []
                if (factory.body.type !== 'BlockStatement') returns.push(factory.body)
                else
                  walk(
                    factory.body,
                    (part) => {
                      if (part.type === 'ReturnStatement' && part.argument)
                        returns.push(part.argument)
                    },
                    (part) => !flow.isFunction(part),
                  )
                return returns.some((value) => entries(value, next, visited))
              }
              return entries(handler, new Map())
            }
            walk(flow.source.ast, (node) => {
              if (node.type !== 'JSXOpeningElement') return
              if (node.name.type === 'JSXIdentifier' && attr(node, 'key')) keyedChildren.push(node)
              const value = expression(attr(node, 'value')) ?? expression(attr(node, 'checked'))
              let root =
                value?.type === 'LogicalExpression' && value.operator === '??'
                  ? unwrap(value.left)
                  : value
              while (root?.type === 'MemberExpression') root = unwrap(root.object)
              const state = stateFor(root)
              const handler =
                expression(attr(node, 'onChange')) ?? expression(attr(node, 'onInput'))
              if (!state || !handler) return
              const mutationBodies = mutators(state).map((fn) => fn.body)
              if (inputStores(handler, state))
                fields.push({ node, state, change: callback(handler), mutationBodies, value })
            })
            // A dirty witness must be written by this field's own change handler.
            const dirtyGuards = (field) => {
              const bodies = []
              // One logical field may use a local helper without a call graph. Every
              // mutator of that state must set the same dirty witness. Multiple-field
              // drafts cannot use one witness to skip their initial fill.
              for (const body of field.mutationBodies) {
                const guards = []
                walk(
                  body,
                  (part) => {
                    if (
                      part.type === 'AssignmentExpression' &&
                      part.operator === '=' &&
                      member(part.left) === 'current' &&
                      part.right.value === true
                    ) {
                      const ref = variable(part.left.object)
                      const initial = flow.init(part.left.object)
                      if (
                        initial?.type === 'CallExpression' &&
                        flow.react(initial.callee, 'useRef') &&
                        initial.arguments[0]?.value === false
                      )
                        guards.push({
                          target: (node) =>
                            member(node) === 'current' && variable(node.object) === ref,
                          ref: true,
                          binding: ref,
                        })
                    }
                    if (part.type === 'CallExpression' && part.arguments[0]?.value === true) {
                      const state = flow.states.find(
                        (item) =>
                          variable(part.callee) === item.setter && item.initial?.value === false,
                      )
                      if (state)
                        guards.push({
                          target: (node) => variable(node) === state.value,
                          ref: false,
                          binding: state.value,
                        })
                    }
                  },
                  (part) => !flow.isFunction(part),
                )
                bodies.push(guards)
              }
              return (bodies[0] ?? []).filter((guard) =>
                bodies.every((body) =>
                  body.some((other) => other.binding === guard.binding && other.ref === guard.ref),
                ),
              )
            }
            const constantSeed = (node, seen = new Set()) => {
              node = unwrap(node)
              if (!node || seen.has(node)) return false
              seen.add(node)
              if (node.type === 'Literal') return true
              if (node.type === 'ArrayExpression')
                return node.elements.every((part) => constantSeed(part, new Set(seen)))
              if (node.type === 'ObjectExpression')
                return node.properties.every(
                  (part) => part.type === 'Property' && constantSeed(part.value, new Set(seen)),
                )
              const key = member(node)
              if (key != null) {
                const object = unwrap(flow.init(node.object) ?? node.object)
                if (object?.type !== 'ObjectExpression') return false
                for (const part of object.properties.toReversed()) {
                  if (part.type !== 'Property' || (part.computed && part.key.type !== 'Literal'))
                    return false
                  if (String(part.key.name ?? part.key.value) === String(key))
                    return part.kind === 'init' && constantSeed(part.value, seen)
                }
                return false
              }
              return constantSeed(flow.init(node), seen)
            }
            // A scalar dirty witness preserves one value. On an initially defaulted
            // object shared by several inputs, it can prevent the *other* inputs from
            // ever receiving their first record. Already-prefilled objects remain valid.
            const defaultedAggregate = (state, editable) => {
              const path = (node) => {
                node = unwrap(node)
                if (node?.type === 'MemberExpression') {
                  const key = member(node)
                  return key == null ? null : `${path(node.object)}.${key}`
                }
                return variable(node) === state.value ? '' : null
              }
              if (
                new Set(editable.map((field) => path(field.value)).filter((key) => key !== null))
                  .size < 2
              )
                return false
              return constantSeed(state.initial)
            }
            const unavailable = (field, target, settled) => {
              if (target && guarded(field.node, field.state.owner, target, settled)) return true
              for (
                let element = field.node.parent;
                element && element !== field.state.owner;
                element = element.parent
              ) {
                if (element.type !== 'JSXElement') continue
                const opening = element.openingElement
                const nativeFieldset =
                  opening.name.type === 'JSXIdentifier' && opening.name.name === 'fieldset'
                if (opening !== field.node && !nativeFieldset) continue
                for (const name of ['disabled', ...(opening === field.node ? ['readOnly'] : [])]) {
                  const attribute = attr(opening, name)
                  if (!attribute) continue
                  if (attribute.value === null || expression(attribute)?.value === true) return true
                  // The field is editable only when this disabled/readOnly expression is false.
                  if (target && flow.implies(expression(attribute), false, target, settled))
                    return true
                }
              }
              return false
            }
            // A route key is already stable before its loaded record arrives. Follow the
            // JSX prop into the local child's editable initializers to prove that the
            // first render can capture an unloaded record.
            const sameRead = (left, right) => {
              left = unwrap(left)
              right = unwrap(right)
              const binding = variable(left)
              if (binding) return variable(right) === binding
              return (
                member(left) != null &&
                member(left) === member(right) &&
                sameRead(left.object, right.object)
              )
            }
            const readsProp = (state, name) => {
              const param = state.owner.params[0]
              const props = variable(param)
              const part =
                param?.type === 'ObjectPattern'
                  ? param.properties.find((part) => (part.key?.name ?? part.key?.value) === name)
                  : null
              const local = variable(
                part?.value.type === 'AssignmentPattern' ? part.value.left : part?.value,
              )
              let reads = false
              walk(state.initial, (node) => {
                if (local && variable(node) === local) reads = true
                if (props && member(node) === name && variable(node.object) === props) reads = true
              })
              return reads
            }
            // A route-keyed form can also receive a truthy object from local state before
            // its effect replaces that object with the loaded record. A truthiness guard
            // over that state admits the placeholder. Keep other readiness guards opaque.
            const earlyRecord = (value, identity, conditions) => {
              const branches =
                value?.type === 'ConditionalExpression'
                  ? [value.consequent, value.alternate]
                  : [value]
              const read = branches.find((branch) => stateFor(branch))
              const state = stateFor(read)
              if (!state || !branches.every((branch) => branch === read || constantSeed(branch)))
                return false
              const seed = state.initial
              if (seed?.type !== 'ConditionalExpression' || !sameRead(seed.test, identity))
                return false
              const placeholder = flow.init(seed.consequent) ?? unwrap(seed.consequent)
              if (placeholder?.type !== 'ObjectExpression' || !constantSeed(placeholder))
                return false
              const replaces = effects.some(({ writes }) =>
                writes.some(
                  ({ state: target, async, argument }) =>
                    target === state &&
                    async &&
                    !flow.isFunction(argument) &&
                    !constantSeed(argument),
                ),
              )
              if (!replaces) return false
              const session = (node) => {
                const binding = variable(member(node) == null ? node : node.object)?.defs[0]
                const call = binding?.node?.init
                const imported = variable(call?.callee)?.defs[0]
                return (
                  imported?.type === 'ImportBinding' &&
                  imported.parent.source.value === '@molecule/app-react' &&
                  imported.node.imported?.name === 'useAuth'
                )
              }
              const admits = (test, truth) => {
                test = unwrap(test)
                if (sameRead(test, read) || sameRead(test, identity)) return truth
                if (test?.type === 'UnaryExpression' && test.operator === '!')
                  return admits(test.argument, !truth)
                // A session check can coexist with an edit that still needs to load its record.
                return (
                  test?.type === 'BinaryExpression' &&
                  ['===', '!=='].includes(test.operator) &&
                  ((test.right.type === 'Literal' && session(test.left)) ||
                    (test.left.type === 'Literal' && session(test.right)))
                )
              }
              return conditions.every(([test, truth]) => admits(test, truth))
            }
            if (fields.length)
              for (const node of keyedChildren) {
                const definition = variable(node.name)?.defs[0]
                const child =
                  definition?.type === 'FunctionName' ? definition.node : callback(node.name)
                if (!child) continue
                const editable = fields.filter(
                  (field) => field.state.owner === child && !unavailable(field),
                )
                // Only explicit props after the last spread have a known value. A spread
                // can replace either the key or the record passed to the child.
                const attributes = node.attributes.slice(
                  node.attributes.findLastIndex((part) => part.type === 'JSXSpreadAttribute') + 1,
                )
                const keyProp = expression(attributes.findLast((part) => part.name.name === 'key'))
                const keyBinding = variable(keyProp)?.defs[0]
                const key =
                  keyBinding?.node.id?.type === 'Identifier'
                    ? (flow.init(keyProp) ?? keyProp)
                    : keyProp
                const identity =
                  key?.type === 'LogicalExpression' &&
                  ['??', '||'].includes(key.operator) &&
                  key.right.type === 'Literal'
                    ? unwrap(key.left)
                    : key
                if (
                  !editable.length ||
                  !identity ||
                  (!variable(identity) && member(identity) == null)
                )
                  continue
                const conditions = flow.conditions(node, flow.owner(node))
                const seen = new Set(['key'])
                for (const prop of attributes.toReversed()) {
                  const name = prop.name.name
                  if (seen.has(name)) continue
                  seen.add(name)
                  const value = expression(prop)
                  if (earlyRecord(value, identity, conditions)) {
                    if (editable.some(({ state }) => readsProp(state, name)))
                      context.report({ node: prop, messageId: 'earlyMount' })
                    continue
                  }
                  const nullFallback =
                    value?.type === 'LogicalExpression' &&
                    ['??', '||'].includes(value.operator) &&
                    (value.right.value === null || value.right.name === 'undefined')
                  const record = nullFallback ? unwrap(value.left) : value
                  // An optional access can supply the same missing seed as an explicit
                  // fallback. Its receiver is also a valid readiness guard.
                  let access = record
                  while (member(access) != null && !access.optional) access = unwrap(access.object)
                  const receiver =
                    access?.type === 'MemberExpression' && access.optional
                      ? unwrap(access.object)
                      : null
                  if (
                    (!nullFallback && (!receiver || constantSeed(receiver))) ||
                    constantSeed(record)
                  )
                    continue
                  const loaded = (part) => sameRead(part, record) || sameRead(part, receiver)
                  let keyPart = identity
                  while (member(keyPart) != null && !loaded(keyPart))
                    keyPart = unwrap(keyPart.object)
                  if (loaded(keyPart)) continue
                  const ready = conditions.some(([test, truth]) => {
                    if (flow.implies(test, truth, loaded, true)) return true
                    // A create/edit form can mount without a record on the create route.
                    // Its edit guard must cover the same identity used to key the child.
                    if (truth || test.type !== 'LogicalExpression' || test.operator !== '&&')
                      return false
                    return [
                      [test.left, test.right],
                      [test.right, test.left],
                    ].some(
                      ([id, pending]) =>
                        sameRead(id, identity) && flow.implies(pending, true, loaded, false),
                    )
                  })
                  if (!ready && editable.some(({ state }) => readsProp(state, name)))
                    context.report({ node: prop, messageId: 'earlyMount' })
                }
              }
            const livePreference = (write, field) => {
              // These framework contracts publish the selection immediately. Mirroring their
              // notification is not asynchronous draft hydration. Match both ends, not names.
              const contracts = [
                ['useTranslation', 'locale', 'setLocale'],
                ['useTheme', 'mode', 'setTheme'],
              ]
              return contracts.some(([hook, valueName, setterName]) => {
                let matched = false
                walk(write.argument, (part) => {
                  const definition = variable(part)?.defs[0]
                  const declaration = definition?.node
                  if (
                    declaration?.type !== 'VariableDeclarator' ||
                    declaration.id.type !== 'ObjectPattern' ||
                    declaration.init?.type !== 'CallExpression'
                  )
                    return
                  const imported = variable(declaration.init.callee)?.defs[0]
                  if (
                    imported?.type !== 'ImportBinding' ||
                    imported.parent.source.value !== '@molecule/app-react' ||
                    imported.node.imported?.name !== hook
                  )
                    return
                  if (
                    !declaration.id.properties.some(
                      (property) =>
                        property.key?.name === valueName &&
                        variable(property.value) === variable(part),
                    )
                  )
                    return
                  const setter = declaration.id.properties.find(
                    (property) => property.key?.name === setterName,
                  )?.value
                  if (!setter) return
                  const writes = []
                  walk(field.change?.body, (call) => {
                    if (
                      call.type === 'CallExpression' &&
                      variable(call.callee) === field.state.setter
                    )
                      writes.push(call.arguments[0])
                  })
                  walk(field.change?.body, (call) => {
                    if (
                      call.type === 'CallExpression' &&
                      variable(call.callee) === variable(setter) &&
                      writes.some(
                        (value) =>
                          flow.source.getText(value) === flow.source.getText(call.arguments[0]),
                      )
                    )
                      matched = true
                  })
                })
                return matched
              })
            }
            const routeMirror = (write, field) => {
              if (write.async) return false
              const initial = flow.isFunction(field.state.initial)
                ? unwrap(field.state.initial.body)
                : field.state.initial
              if (!initial || flow.source.getText(initial) !== flow.source.getText(write.argument))
                return false
              let route = false
              walk(write.argument, (part) => {
                const declaration = variable(part)?.defs[0]?.node
                if (
                  declaration?.type !== 'VariableDeclarator' ||
                  declaration.init?.type !== 'CallExpression'
                )
                  return
                const imported = variable(declaration.init.callee)?.defs[0]
                if (
                  imported?.type === 'ImportBinding' &&
                  [
                    'react-router',
                    'react-router-dom',
                    '@molecule/app-routing-react-router',
                    '@molecule/app-react',
                  ].includes(imported.parent.source.value) &&
                  ['useSearchParams', 'useParams', 'useLocation', 'useListRoute'].includes(
                    imported.node.imported?.name,
                  )
                )
                  route = true
              })
              return route
            }
            const guardedUpdater = (argument, target) => {
              const fn = callback(argument)
              if (!fn || fn.params[0]?.type !== 'Identifier') return false
              const previous = variable(fn.params[0])
              const safeValue = (value) => {
                value = unwrap(value)
                if (variable(value) === previous || guarded(value, fn, target, false)) return true
                return (
                  value?.type === 'ConditionalExpression' &&
                  safeValue(value.consequent) &&
                  safeValue(value.alternate)
                )
              }
              if (fn.body.type !== 'BlockStatement') return safeValue(fn.body)
              let returns = 0
              let safe = true
              walk(
                fn.body,
                (part) => {
                  if (part.type === 'ReturnStatement') {
                    returns++
                    if (!safeValue(part.argument)) safe = false
                  }
                },
                (part) => !flow.isFunction(part),
              )
              return returns > 0 && safe
            }
            const guardedFill = (write, effect, target) => {
              let boundary = effect.fn
              for (
                let parent = write.node.parent;
                parent && parent !== effect.fn;
                parent = parent.parent
              ) {
                if (
                  flow.isFunction(parent) &&
                  ((parent.async && parent === write.group) ||
                    (parent.parent?.type === 'CallExpression' &&
                      ['then', 'catch', 'finally'].includes(member(parent.parent.callee))))
                ) {
                  boundary = parent
                  break
                }
              }
              let lastAwait = -1
              walk(
                boundary.body,
                (part) => {
                  if (part.type === 'AwaitExpression' && part.range[0] < write.node.range[1])
                    lastAwait = Math.max(lastAwait, part.range[1])
                },
                (part) => !flow.isFunction(part),
              )
              return flow
                .conditions(write.node, boundary)
                .some(
                  ([test, truth]) =>
                    test.range[0] > lastAwait && flow.implies(test, truth, target, false),
                )
            }
            const replacedKeys = (argument) => {
              const fn = callback(argument)
              if (!fn || fn.params[0]?.type !== 'Identifier') return null
              const previous = variable(fn.params[0])
              const keys = (node) => {
                node = unwrap(node)
                if (variable(node) === previous) return new Set()
                if (node?.type === 'ConditionalExpression') {
                  const yes = keys(node.consequent),
                    no = keys(node.alternate)
                  return yes && no ? new Set([...yes, ...no]) : null
                }
                if (
                  node?.type !== 'ObjectExpression' ||
                  node.properties[0]?.type !== 'SpreadElement' ||
                  variable(node.properties[0].argument) !== previous
                )
                  return null
                const result = new Set()
                for (const prop of node.properties.slice(1)) {
                  if (prop.type !== 'Property' || (prop.computed && prop.key.type !== 'Literal'))
                    return null
                  result.add(String(prop.key.name ?? prop.key.value))
                }
                return result
              }
              if (fn.body.type !== 'BlockStatement') return keys(fn.body)
              const returns = []
              walk(
                fn.body,
                (node) => {
                  if (node.type === 'ReturnStatement') returns.push(keys(node.argument))
                },
                (node) => !flow.isFunction(node),
              )
              return returns.length && returns.every(Boolean)
                ? new Set(returns.flatMap((value) => [...value]))
                : null
            }
            const fieldKey = (field) => {
              let value = unwrap(field.value)
              if (value?.type === 'LogicalExpression' && value.operator === '??')
                value = unwrap(value.left)
              let key = null
              while (value?.type === 'MemberExpression') {
                key = member(value)
                value = unwrap(value.object)
              }
              return key == null ? null : String(key)
            }
            for (const effect of effects)
              for (const write of effect.writes) {
                if (!write.argument || ['Literal', 'ArrayExpression'].includes(write.argument.type))
                  continue
                const editable = fields.filter((field) => field.state === write.state)
                if (!editable.length) continue
                const replaced = replacedKeys(write.argument)
                const aggregate = defaultedAggregate(write.state, editable)
                let skippedInitialFill = false
                const safe = editable.every((field) => {
                  if (replaced && fieldKey(field) !== null && !replaced.has(fieldKey(field)))
                    return true
                  if (unavailable(field)) return true
                  // The write that first creates a nullable record also fills every
                  // field mounted/disabled on that same state. There is no earlier draft.
                  if (
                    write.state.initial?.type === 'Literal' &&
                    write.state.initial.value === null &&
                    unavailable(field, (node) => variable(node) === write.state.value, true)
                  )
                    return true
                  if (livePreference(write, field)) return true
                  if (routeMirror(write, field)) return true
                  const dirty = dirtyGuards(field).some(
                    (guard) =>
                      (guard.ref || !write.async) &&
                      (guardedFill(write, effect, guard.target) ||
                        guardedUpdater(write.argument, guard.target)),
                  )
                  if (dirty && !aggregate) return true
                  if (dirty && aggregate) skippedInitialFill = true
                  // An explicit request cycle owns its unavailable UI through completion.
                  // It is distinct from merely observing that query.data has arrived.
                  if (
                    write.async &&
                    effect.writes.some(
                      (mark) =>
                        mark.group === write.group &&
                        mark.argument?.value === false &&
                        mark.state.initial?.value === true &&
                        unavailable(field, (node) => variable(node) === mark.state.value, false),
                    )
                  )
                    return true
                  // Filling once is safe only if that same completion state controls editability
                  // AND prevents later fills. Query readiness alone is before, not after, the fill.
                  return (
                    !write.async &&
                    effect.writes.some(
                      (mark) =>
                        mark.argument?.value === true &&
                        mark.state.initial?.value === false &&
                        guarded(
                          write.node,
                          effect.fn,
                          (node) => variable(node) === mark.state.value,
                          false,
                        ) &&
                        unavailable(field, (node) => variable(node) === mark.state.value, true),
                    )
                  )
                })
                if (!safe)
                  context.report({
                    node: write.node,
                    messageId: skippedInitialFill ? 'unfilled' : 'overwrite',
                  })
              }
          },
        }
      },
    },
    'async-collections-have-status': {
      meta: {
        type: 'problem',
        schema: [],
        docs: {
          description:
            'Keep pending async collections distinct from settled empty results and keep empty placeholders out of actionable item styling.',
        },
        messages: {
          pending:
            '`{{name}}` starts as [] and is filled asynchronously in an effect, so its length === 0 also means the request is still pending. Start it as null and render loading before checking length, or guard this empty branch with a completion flag settled by this collection’s own request. With a query hook, render its status/error separately and check data only after success.',
          item: 'This empty placeholder carries every class of this collection’s actionable mapped items, so anything that finds those items by class finds it as another item. Render the empty status separately with its own class; keep item styling on real records.',
          pendingQuery:
            '`{{name}}` is [] until this query’s request settles, because its `data` is undefined while loading, so this empty branch also shows before the data arrives. Render loading from the query’s status first and show the empty state only once it has succeeded, or render the list through QueryContent.',
          statusItem:
            'This status message ({{status}}) carries every class of the items rendered at line {{line}} (`{{classes}}`{{via}}), so anything that finds those items by class (a test, a script, a :first-child style) finds this message as one of them. Give the message its own class and render it beside the list, not as an item.',
          conditionalItem:
            'This message is shown only while a condition holds, and it carries every class of the clickable items rendered at line {{line}} (`{{classes}}`{{via}}), so anything that finds those items by class (a test, a script, a :first-child style) finds this message as one of them, for example a loading label read as the first item. Give the message its own class and render it beside the list, not as an item.',
        },
      },
      create(context) {
        const resolver = componentResolver(parser, context)
        return {
          'Program:exit'() {
            const flow = reactStateFlow(context)
            const {
              walk,
              unwrap,
              member,
              stateFor,
              effects,
              guarded,
              variable,
              attr,
              expression,
              contains,
            } = flow
            // A hook's query result (`useQuery(...)`, any `use*` hook) holds `data` undefined until
            // its request settles, so `data ?? []`, `data || []` or a `= []` destructuring default
            // reads a pending request as an empty collection. Code that reads anything else of the
            // same result (status, isLoading, error, or the result passed on whole) is taken to
            // tell loading apart itself; only a result read for nothing but its defaulted `data`
            // is reported.
            const hookCall = (node) => {
              node = unwrap(node)
              if (node?.type !== 'CallExpression') return false
              const name =
                node.callee.type === 'Identifier' ? node.callee.name : member(node.callee)
              return typeof name === 'string' && /^use[A-Z]/.test(name)
            }
            const emptyArray = (node) => {
              node = unwrap(node)
              return node?.type === 'ArrayExpression' && node.elements.length === 0
            }
            const keyName = (property) => property.key?.name ?? property.key?.value
            // The single `data` property of `const { data } = useX(...)`, or null.
            const soleDataProperty = (identifier) => {
              const definition = variable(identifier)?.defs[0]
              const pattern =
                definition?.type === 'Variable' &&
                definition.node.id.type === 'ObjectPattern' &&
                hookCall(definition.node.init)
                  ? definition.node.id
                  : null
              if (pattern?.properties.length !== 1) return null
              const [property] = pattern.properties
              const value =
                property.value?.type === 'AssignmentPattern' ? property.value.left : property.value
              return property.type === 'Property' &&
                keyName(property) === 'data' &&
                value === definition.name
                ? property
                : null
            }
            const onlyData = (binding) =>
              binding.references.every((reference) => {
                if (reference.isWrite()) return true
                const parent = reference.identifier.parent
                return (
                  parent?.type === 'MemberExpression' &&
                  parent.object === reference.identifier &&
                  member(parent) === 'data'
                )
              })
            const pendingQueryData = (collection) => {
              let node = unwrap(collection)
              let name = null
              if (node?.type === 'Identifier') {
                name = node.name
                const sole = soleDataProperty(node)
                if (sole)
                  return sole.value.type === 'AssignmentPattern' && emptyArray(sole.value.right)
                    ? { name }
                    : null
                const definition = variable(node)?.defs[0]
                if (definition?.type !== 'Variable' || definition.node.id.type !== 'Identifier')
                  return null
                node = unwrap(definition.node.init)
              }
              if (
                node?.type !== 'LogicalExpression' ||
                !['??', '||'].includes(node.operator) ||
                !emptyArray(node.right)
              )
                return null
              const data = unwrap(node.left)
              name ??= context.sourceCode.getText(data)
              if (data?.type === 'Identifier') return soleDataProperty(data) ? { name } : null
              if (member(data) !== 'data') return null
              const object = unwrap(data.object)
              if (hookCall(object)) return { name }
              if (object?.type !== 'Identifier') return null
              const binding = variable(object)
              const definition = binding?.defs[0]
              return definition?.type === 'Variable' &&
                definition.node.id.type === 'Identifier' &&
                hookCall(definition.node.init) &&
                onlyData(binding)
                ? { name }
                : null
            }
            // An empty placeholder already reported as an item is not reported again below.
            const reportedItems = new Set()
            const emptyBranches = []
            walk(flow.source.ast, (node) => {
              let length
              let emptyWhen = true
              if (
                node.type === 'BinaryExpression' &&
                ['===', '==', '<', '<='].includes(node.operator) &&
                node.right.value === (node.operator === '<' ? 1 : 0)
              )
                length = unwrap(node.left)
              else if (
                node.type === 'BinaryExpression' &&
                ['===', '=='].includes(node.operator) &&
                node.left.value === 0
              )
                length = unwrap(node.right)
              else if (node.type === 'UnaryExpression' && node.operator === '!')
                length = unwrap(node.argument)
              else if (
                node.type === 'MemberExpression' &&
                member(node) === 'length' &&
                node.parent.type === 'ConditionalExpression' &&
                node.parent.test === node
              ) {
                length = node
                emptyWhen = false
              }
              if (member(length) !== 'length') return
              const state = stateFor(length.object)
              const owner = state?.owner ?? flow.owner(node)
              if (!owner) return
              let branch = node
              while (
                branch.parent?.type === 'LogicalExpression' &&
                branch.parent.operator === '&&' &&
                branch.parent.right === branch
              )
                branch = branch.parent
              const parent = branch.parent
              const body =
                parent?.type === 'ConditionalExpression' && parent.test === branch
                  ? emptyWhen
                    ? parent.consequent
                    : parent.alternate
                  : parent?.type === 'LogicalExpression' &&
                      parent.operator === '&&' &&
                      parent.left === branch
                    ? parent.right
                    : parent?.type === 'IfStatement' && parent.test === branch
                      ? parent.consequent
                      : null
              if (!body) return
              let jsx = false
              walk(body, (part) => {
                if (part.type === 'JSXElement') jsx = true
              })
              if (jsx) emptyBranches.push({ node, state, body, owner, collection: length.object })
            })
            for (const { node, state, body, owner, collection } of emptyBranches) {
              const initial = flow.isFunction(state?.initial)
                ? unwrap(state.initial.body)
                : state?.initial
              const loaders = state
                ? effects.filter((effect) =>
                    effect.writes.some((write) => write.state === state && write.async),
                  )
                : []
              const completed =
                loaders.length > 0 &&
                loaders.every((effect) =>
                  effect.writes.some((write) => {
                    const value = write.argument?.value
                    return (
                      write.async &&
                      effect.writes.some(
                        (load) => load.state === state && load.group === write.group,
                      ) &&
                      typeof value === 'boolean' &&
                      write.state.initial?.value === !value &&
                      guarded(
                        node,
                        state.owner,
                        (part) => variable(part) === write.state.value,
                        value,
                      )
                    )
                  }),
                )
              if (
                initial?.type === 'ArrayExpression' &&
                initial.elements.length === 0 &&
                loaders.length &&
                !completed
              )
                context.report({
                  node,
                  messageId: 'pending',
                  // Name it: a note that only says "this collection" sent a fix to the wrong one.
                  data: { name: context.sourceCode.getText(collection) },
                })
              else {
                const pending = pendingQueryData(collection)
                if (pending) context.report({ node, messageId: 'pendingQuery', data: pending })
              }
              // Compare syntax-owned class values only: no selectors or class vocabulary. An
              // ordinary empty card may share layout; the item must actually have an action.
              const placeholders = []
              walk(body, (part) => {
                if (part.type !== 'JSXOpeningElement') return
                const value = expression(attr(part, 'className'))
                if (typeof value?.value === 'string' && value.value.trim())
                  placeholders.push({
                    node: part,
                    classes: value.value.trim().split(/\s+/).sort().join(' '),
                  })
              })
              if (!placeholders.length) continue
              const sameCollection = (left, right) => {
                left = unwrap(left)
                right = unwrap(right)
                if (left?.type === 'Identifier' && right?.type === 'Identifier')
                  return variable(left) !== null && variable(left) === variable(right)
                return (
                  left?.type === 'MemberExpression' &&
                  right?.type === 'MemberExpression' &&
                  member(left) !== null &&
                  member(left) === member(right) &&
                  sameCollection(left.object, right.object)
                )
              }
              const container = (part) => {
                for (let parent = part.parent; parent && parent !== owner; parent = parent.parent)
                  if (parent.type === 'JSXElement') return parent
                return null
              }
              const listContainer = container(node)
              walk(owner, (part) => {
                if (
                  part.type !== 'CallExpression' ||
                  member(part.callee) !== 'map' ||
                  !sameCollection(part.callee.object, collection) ||
                  container(part) !== listContainer
                )
                  return
                walk(part.arguments[0], (item) => {
                  if (item.type !== 'JSXOpeningElement' || !flow.actionable(item)) return
                  const value = expression(attr(item, 'className'))
                  if (typeof value?.value !== 'string') return
                  const classes = value.value.trim().split(/\s+/).sort().join(' ')
                  // Every class of the item, with or without a modifier of its own: whatever finds
                  // the items by one of their classes finds this placeholder too.
                  for (const placeholder of placeholders) {
                    const own = new Set(placeholder.classes.split(' '))
                    if (
                      classes.split(' ').every((name) => own.has(name)) &&
                      !contains(body, item) &&
                      !reportedItems.has(placeholder.node)
                    ) {
                      reportedItems.add(placeholder.node)
                      context.report({ node: placeholder.node, messageId: 'item' })
                    }
                  }
                })
              })
            }
            // A message its author marked as status (role status/alert/progressbar, or aria-busy)
            // that carries every class of an item a .map() in this file renders is found by
            // whatever finds those items by class. So is an unmarked message shown only while a
            // condition holds (a branch of ?: or the right side of &&), with fixed text and no
            // action of its own, that carries every class of a clickable item (X1 l3003, P394:
            // {tags.loading ? <span className="tag-pill tag-default">Loading...</span> : null}
            // beside tags.map(... <Link className="tag-pill tag-default" to=…>); the test read
            // the first .tag-pill and got "Loading..."). An item rendered through a component is
            // read from the className passed to it, else from that component's single root
            // element, declared here or in the relative module it is imported from. Static class
            // strings only; a message inside an item is the item's own and is never compared.
            const staticClasses = (open) => {
              const value = expression(attr(open, 'className'))
              return typeof value?.value === 'string' && value.value.trim()
                ? value.value.trim().split(/\s+/)
                : null
            }
            const statusOf = (open) => {
              const role = expression(attr(open, 'role'))
              if (
                typeof role?.value === 'string' &&
                ['status', 'alert', 'progressbar'].includes(role.value)
              )
                return `role="${role.value}"`
              const busy = attr(open, 'aria-busy')
              if (busy && (busy.value === null || [true, 'true'].includes(expression(busy)?.value)))
                return 'aria-busy'
              return null
            }
            // Shown only while a condition holds: reached from a JSX child through ?: branches
            // and && right sides (fragments between them included), never as a test.
            const conditional = (element) => {
              let through = false
              for (let node = element; node.parent; node = node.parent) {
                const parent = node.parent
                if (parent.type === 'JSXFragment') continue
                if (parent.type === 'ConditionalExpression' && parent.test !== node) through = true
                else if (parent.type === 'LogicalExpression' && parent.right === node)
                  through = true
                else return through && parent.type === 'JSXExpressionContainer'
              }
              return false
            }
            // Fixed text: some text, and nothing read from data. A call whose arguments are all
            // literals (an i18n `t('key', {}, { defaultValue })`) is fixed text too.
            const literal = (node) => {
              node = unwrap(node)
              if (!node) return true
              if (node.type === 'Literal') return true
              if (node.type === 'TemplateLiteral') return node.expressions.length === 0
              if (node.type === 'ObjectExpression')
                return node.properties.every(
                  (p) => p.type === 'Property' && !p.computed && literal(p.value),
                )
              if (node.type === 'ArrayExpression') return node.elements.every(literal)
              return false
            }
            const fixedText = (element) => {
              let text = false
              let fixed = true
              walk(element, (part) => {
                if (part.type === 'JSXText' && part.value.trim()) text = true
                if (part.type !== 'JSXExpressionContainer' || part.parent?.type === 'JSXAttribute')
                  return
                const value = unwrap(part.expression)
                if (value.type === 'JSXEmptyExpression') return
                if (value.type === 'CallExpression' && value.arguments.every(literal)) text = true
                else if (literal(value) && typeof value.value === 'string') text = true
                else if (!literal(value)) fixed = false
              })
              return text && fixed
            }
            // The element whose children hold a node: the list a .map() renders into, or the one
            // a message is shown in.
            const parentElement = (node) => {
              for (let parent = node.parent; parent; parent = parent.parent)
                if (parent.type === 'JSXElement') return parent
              return null
            }
            const tree = flow.source.ast
            const rootElement = (node) => {
              node = unwrap(node)
              return node?.type === 'JSXElement' &&
                node.openingElement.name.type === 'JSXIdentifier'
                ? node.openingElement
                : null
            }
            const items = []
            const callbacks = []
            walk(tree, (part) => {
              if (part.type !== 'CallExpression' || member(part.callee) !== 'map') return
              const callback = part.arguments[0]
              if (!flow.isFunction(callback)) return
              callbacks.push(callback)
              for (const root of resolver.roots(callback)) {
                const open = rootElement(root)
                if (!open) continue
                const name = open.name.name
                let classes = null
                let actionable = flow.actionable(open)
                if (/^[a-z]/.test(name)) classes = staticClasses(open)
                // A className passed to a component (a router <Link>) is the class it renders.
                else if (staticClasses(open)) classes = staticClasses(open)
                else {
                  const binding = variable(open.name)?.defs[0]
                  const target =
                    binding?.type === 'FunctionName'
                      ? { node: binding.node }
                      : binding?.type === 'Variable'
                        ? { node: unwrap(binding.node.init) }
                        : binding?.type === 'ImportBinding'
                          ? resolver.imported(tree, name, context.filename)
                          : null
                  const returns = target ? resolver.roots(target.node) : []
                  const inner = returns.length === 1 ? rootElement(returns[0]) : null
                  if (inner && /^[a-z]/.test(inner.name.name)) {
                    classes = staticClasses(inner)
                    actionable ||= flow.actionable(inner)
                  }
                  if (classes) classes.component = name
                }
                if (classes)
                  items.push({ node: open, classes, actionable, list: parentElement(part) })
              }
            })
            if (!items.length) return
            walk(tree, (part) => {
              if (part.type !== 'JSXOpeningElement') return
              const status = statusOf(part)
              const shown =
                !status &&
                !flow.actionable(part) &&
                conditional(part.parent) &&
                fixedText(part.parent)
              const classes = (status || shown) && staticClasses(part)
              if (!classes || callbacks.some((callback) => contains(callback, part))) return
              if (reportedItems.has(part)) return
              // An empty-list message is the empty check's above (same collection only); an unmarked
              // message counts here only inside the element that holds the items.
              if (!status && emptyBranches.some(({ body }) => contains(body, part))) return
              const list = shown && parentElement(part.parent)
              const item = items.find(
                ({ classes: wanted, actionable, list: holder }) =>
                  (status || (actionable && holder === list)) &&
                  wanted.every((name) => classes.includes(name)),
              )
              if (item)
                context.report({
                  node: part,
                  messageId: status ? 'statusItem' : 'conditionalItem',
                  data: {
                    status,
                    line: item.node.loc.start.line,
                    classes: item.classes.join(' '),
                    via: item.classes.component ? `, the root of <${item.classes.component}>` : '',
                  },
                })
            })
          },
        }
      },
    },
    'no-fixed-navigation-truncation': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Report a fixed prefix that silently hides items from a rendered navigation collection.',
        },
        schema: [],
        messages: {
          truncated:
            'This navigation renders only the first {{limit}} items. Later destinations become unreachable as the collection grows or changes order. Render the complete collection, provide pagination or expansion, or take an explicit limit from the caller. For an intentional fixed leaderboard, use a reasoned ESLint disable at this slice.',
        },
      },
      create(context) {
        const navigates = (opening) => {
          if (opening.name.type !== 'JSXIdentifier') return false
          const name = opening.name.name
          if (name === 'a' || name === 'area')
            return opening.attributes.some(
              (attribute) => attribute.type === 'JSXAttribute' && attribute.name.name === 'href',
            )
          let scope = context.sourceCode.getScope(opening)
          while (scope) {
            const variable = scope.set.get(name)
            if (variable)
              return variable.defs.some(
                (definition) =>
                  definition.type === 'ImportBinding' &&
                  [
                    'react-router',
                    'react-router-dom',
                    '@molecule/app-routing-react-router',
                  ].includes(definition.parent.source.value) &&
                  ['Link', 'NavLink'].includes(definition.node.imported?.name),
              )
            scope = scope.upper
          }
          return false
        }
        return {
          CallExpression(node) {
            const map = node.callee
            if (map.type !== 'MemberExpression' || map.computed || map.property.name !== 'map')
              return
            const slice = map.object
            if (
              slice.type !== 'CallExpression' ||
              slice.callee.type !== 'MemberExpression' ||
              slice.callee.computed ||
              slice.callee.property.name !== 'slice'
            )
              return
            const [start, end] = slice.arguments
            if (
              start?.type !== 'Literal' ||
              start.value !== 0 ||
              end?.type !== 'Literal' ||
              !Number.isInteger(end.value) ||
              end.value <= 0
            )
              return
            let navigation = false
            const visit = (part) => {
              if (!part || typeof part.type !== 'string') return
              if (part.type === 'JSXOpeningElement' && navigates(part)) navigation = true
              for (const key of context.sourceCode.visitorKeys[part.type] ?? []) {
                const value = part[key]
                if (Array.isArray(value)) value.forEach(visit)
                else visit(value)
              }
            }
            visit(node.arguments[0])
            if (navigation)
              context.report({ node: slice, messageId: 'truncated', data: { limit: end.value } })
          },
        }
      },
    },
    // A nullable validator may accept omission (undefined) and reject invalid input (null).
    // A falsy guard combines those outcomes and silently abandons the HTTP request.
    'no-unanswered-optional-guard': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          unanswered:
            '{{helper}} can return undefined without sending a response. This bare return abandons the HTTP request. If null is the invalid-input sentinel, compare {{value}} === null; otherwise send a response or call next before returning.',
        },
      },
      create(context) {
        const source = context.sourceCode
        const binding = (node) => {
          for (let scope = source.getScope(node); scope; scope = scope.upper) {
            const variable = scope.set.get(node.name)
            if (variable) return variable.defs[0]?.node
          }
          return null
        }
        const bare = (node) => node?.type === 'ReturnStatement' && !node.argument
        const unwrap = (node) =>
          node?.type === 'BlockStatement' && node.body.length === 1 ? node.body[0] : node
        const identifierUsed = (node, name) => {
          if (!node) return false
          if (node.type === 'Identifier' && node.name === name) return true
          return (source.visitorKeys[node.type] ?? []).some((key) => {
            const value = node[key]
            return Array.isArray(value)
              ? value.some((part) => identifierUsed(part, name))
              : identifierUsed(value, name)
          })
        }
        return {
          IfStatement(node) {
            if (
              node.test.type !== 'UnaryExpression' ||
              node.test.operator !== '!' ||
              node.test.argument.type !== 'Identifier' ||
              !bare(unwrap(node.consequent))
            )
              return
            const value = node.test.argument
            const declaration = binding(value)
            if (
              declaration?.type !== 'VariableDeclarator' ||
              declaration.parent.kind !== 'const' ||
              declaration.init?.type !== 'CallExpression'
            )
              return
            const call = declaration.init
            if (call.callee.type !== 'Identifier') return
            const definition = binding(call.callee)
            const helper = definition?.type === 'VariableDeclarator' ? definition.init : definition
            if (
              !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
                helper?.type,
              )
            )
              return
            const union = helper.returnType?.typeAnnotation
            if (
              union?.type !== 'TSUnionType' ||
              !union.types.some((type) => type.type === 'TSUndefinedKeyword') ||
              !union.types.some(
                (type) =>
                  type.type === 'TSNullKeyword' ||
                  (type.type === 'TSLiteralType' && type.literal.value === null),
              )
            )
              return
            let handler = node.parent
            while (
              handler &&
              !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
                handler.type,
              )
            )
              handler = handler.parent
            const route = handler?.parent
            if (
              route?.type !== 'CallExpression' ||
              route.callee.type !== 'MemberExpression' ||
              !['get', 'post', 'put', 'patch', 'delete', 'all'].includes(route.callee.property.name)
            )
              return
            const response = handler.params[1]
            if (response?.type !== 'Identifier') return
            // An unconditional earlier send already completed this route's response.
            const guardAt =
              handler.body?.body?.findIndex(
                (statement) =>
                  statement.range[0] <= node.range[0] && node.range[1] <= statement.range[1],
              ) ?? -1
            const answered =
              guardAt >= 0 &&
              handler.body.body.slice(0, guardAt).some((statement) => {
                const expression =
                  statement.type === 'ExpressionStatement' ? statement.expression : null
                if (
                  expression?.type !== 'CallExpression' ||
                  expression.callee.type !== 'MemberExpression' ||
                  !['json', 'send', 'end', 'sendStatus', 'redirect'].includes(
                    expression.callee.property.name,
                  )
                )
                  return false
                let receiver = expression.callee.object
                while (
                  receiver?.type === 'CallExpression' &&
                  receiver.callee.type === 'MemberExpression'
                )
                  receiver = receiver.callee.object
                return receiver?.type === 'Identifier' && receiver.name === response.name
              })
            if (answered) return
            const responseIndex = call.arguments.findIndex(
              (arg) => arg.type === 'Identifier' && arg.name === response.name,
            )
            const helperResponse = helper.params[responseIndex]
            if (helperResponse?.type !== 'Identifier' || helper.body?.type !== 'BlockStatement')
              return
            // Prove an early undefined path does not touch the response. Unknown calls or
            // more complex control flow stay unverified; no fix is applied automatically.
            let omitted = false
            for (const statement of helper.body.body) {
              if (identifierUsed(statement, helperResponse.name)) break
              if (statement.type !== 'IfStatement') continue
              const returned = unwrap(statement.consequent)
              if (
                returned?.type === 'ReturnStatement' &&
                returned.argument?.type === 'Identifier' &&
                returned.argument.name === 'undefined' &&
                !binding(returned.argument)
              )
                omitted = true
            }
            if (omitted)
              context.report({
                node,
                messageId: 'unanswered',
                data: { helper: call.callee.name, value: value.name },
              })
          },
        }
      },
    },
    // HTML paragraphs accept phrasing content. Resolve local component roots too: a markdown
    // renderer returning a div must not be hidden behind a component name inside a p.
    'no-block-in-paragraph': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          block:
            '<p> at line {{line}} contains <{{tag}}> through {{component}}. Paragraphs cannot contain block elements; use a <div> for the outer wrapper because browsers close a paragraph before block content.',
        },
      },
      create(context) {
        const block = new Set([
          'address',
          'article',
          'aside',
          'blockquote',
          'details',
          'div',
          'dl',
          'fieldset',
          'figcaption',
          'figure',
          'footer',
          'form',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'header',
          'hgroup',
          'hr',
          'main',
          'menu',
          'nav',
          'ol',
          'p',
          'pre',
          'search',
          'section',
          'table',
          'ul',
        ])
        const { scopes, unwrap, imported, roots } = componentResolver(parser, context)
        const find = (node, tree, filename, seen = new Set(), rootOnly = false) => {
          node = unwrap(node)
          if (!node || seen.has(node) || seen.size >= 24) return null
          seen = new Set(seen).add(node)
          if (node.type === 'JSXElement' || node.type === 'JSXSelfClosingElement') {
            const open = node.openingElement ?? node
            const name = open.name.type === 'JSXIdentifier' ? open.name.name : ''
            if (block.has(name)) return { tag: name, component: name }
            if (['template', 'svg', 'math'].includes(name)) return null
            if (/^[A-Z]/.test(name)) {
              const containing = (scopes.get(tree) ?? [])
                .filter(
                  (scope) =>
                    scope.block.range &&
                    scope.block.range[0] <= open.range[0] &&
                    scope.block.range[1] >= open.range[1],
                )
                .sort(
                  (a, b) =>
                    a.block.range[1] - a.block.range[0] - (b.block.range[1] - b.block.range[0]),
                )
              let scope = containing[0],
                binding = null
              while (scope && !binding) {
                binding = scope.variables.find((variable) => variable.name === name)
                scope = scope.upper
              }
              const def = binding?.defs[0]
              const local =
                def?.type === 'FunctionName'
                  ? def.node
                  : def?.type === 'Variable'
                    ? unwrap(def.node.init)
                    : null
              const target = local
                ? { node: local, tree, filename }
                : def?.type === 'ImportBinding'
                  ? imported(tree, name, filename)
                  : null
              const returns = target ? roots(target.node) : []
              if (returns.length === 1)
                for (const root of returns) {
                  const found = find(root, target.tree, target.filename, seen, true)
                  if (found) return { ...found, component: name }
                }
              // Opaque components may discard their children. Never infer that they render them.
              return null
            }
            if (rootOnly) return null
            for (const child of node.children ?? []) {
              const found = find(child, tree, filename, seen)
              if (found) return found
            }
          } else if (node.type === 'JSXFragment') {
            for (const child of node.children) {
              const found = find(child, tree, filename, seen, rootOnly)
              if (found) return found
            }
          } else if (node.type === 'JSXExpressionContainer')
            return find(node.expression, tree, filename, seen)
          else if (node.type === 'ConditionalExpression') {
            if (rootOnly) return null
            const test = unwrap(node.test)
            if (test.type === 'Literal')
              return find(test.value ? node.consequent : node.alternate, tree, filename, seen)
            return (
              find(node.consequent, tree, filename, seen) ??
              find(node.alternate, tree, filename, seen)
            )
          } else if (node.type === 'LogicalExpression') {
            if (rootOnly) return null
            const left = unwrap(node.left)
            if (left.type === 'Literal') {
              const right =
                node.operator === '&&'
                  ? Boolean(left.value)
                  : node.operator === '||'
                    ? !left.value
                    : left.value === null
              return find(right ? node.right : node.left, tree, filename, seen)
            }
            return find(node.left, tree, filename, seen) ?? find(node.right, tree, filename, seen)
          }
          return null
        }
        return {
          JSXElement(node) {
            if (
              node.openingElement.name.type !== 'JSXIdentifier' ||
              node.openingElement.name.name !== 'p'
            )
              return
            for (const child of node.children) {
              const found = find(child, context.sourceCode.ast, context.filename)
              if (found) {
                context.report({
                  node: node.openingElement,
                  messageId: 'block',
                  data: { ...found, line: node.loc.start.line },
                })
                break
              }
            }
          },
        }
      },
    },
    // A datastore lookup has no update context. Use ESLint's AST and bindings to
    // catch an existence-only duplicate check before a same-table update. The
    // compiler cannot know that the query also matches the unchanged row.
    'unique-update-excludes-self': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          selfConflict:
            "This '{{fields}}' existence check can reject an unchanged value before the update at line {{line}}. Exclude { field: 'id', operator: '!=', value: {{id}} } in the lookup, or pass {{id}} to the helper and reject only another row.",
        },
      },
      create(context) {
        const source = context.sourceCode
        const functions = new Set([
          'FunctionDeclaration',
          'FunctionExpression',
          'ArrowFunctionExpression',
        ])
        const calls = []
        const checks = []
        const unwrap = (node) => {
          while (
            node &&
            [
              'AwaitExpression',
              'TSAsExpression',
              'TSNonNullExpression',
              'TSTypeAssertion',
              'ChainExpression',
            ].includes(node.type)
          )
            node = node.argument ?? node.expression
          return node
        }
        const variable = (node) => {
          if (node?.type !== 'Identifier') return null
          for (let scope = source.getScope(node); scope; scope = scope.upper) {
            const found = scope.set.get(node.name)
            if (found) return found
          }
          return null
        }
        const value = (node, bindings = new Map(), seen = new Set()) => {
          node = unwrap(node)
          if (node?.type !== 'Identifier') return node
          const binding = variable(node)
          if (!binding || seen.has(binding)) return node
          seen.add(binding)
          if (bindings.has(binding)) return value(bindings.get(binding), bindings, seen)
          const definition = binding.defs[0]
          if (
            binding.defs.length === 1 &&
            definition.type === 'Variable' &&
            definition.node.parent.kind === 'const' &&
            definition.node.id.type === 'Identifier' &&
            !binding.references.some((ref) => ref.isWrite() && !ref.init)
          )
            return value(definition.node.init, bindings, seen)
          return node
        }
        const key = (node) => (node?.computed ? node.property?.value : node?.property?.name)
        const imported = (node, name) => {
          node = unwrap(node)
          const identifier = node?.type === 'MemberExpression' ? node.object : node
          const definition = variable(identifier)?.defs[0]
          if (
            definition?.type !== 'ImportBinding' ||
            definition.parent.source.value !== '@molecule/api-database' ||
            definition.parent.importKind === 'type' ||
            definition.node.importKind === 'type'
          )
            return false
          return node.type === 'MemberExpression'
            ? definition.node.type === 'ImportNamespaceSpecifier' && key(node) === name
            : definition.node.imported?.name === name
        }
        const enclosingFunction = (node) => {
          for (let parent = node.parent; parent; parent = parent.parent)
            if (functions.has(parent.type)) return parent
          return null
        }
        const same = (left, right, bindings) => {
          left = value(left, bindings)
          right = value(right)
          if (!left || !right) return false
          if (left === right) return true
          if (left.type === 'Literal' && right.type === 'Literal') return left.value === right.value
          if (left.type === 'MemberExpression' && right.type === 'MemberExpression')
            return (
              key(left) !== undefined &&
              key(left) === key(right) &&
              same(left.object, right.object, bindings)
            )
          return (
            left.type === 'Identifier' &&
            right.type === 'Identifier' &&
            variable(left) !== null &&
            variable(left) === variable(right)
          )
        }
        const property = (node, name) =>
          node?.properties?.find(
            (prop) =>
              prop.type === 'Property' &&
              !prop.computed &&
              (prop.key.name ?? prop.key.value) === name,
          )?.value
        // Deliberately bounded to local helpers returning only existence, not
        // arbitrary application logic or a guessed name such as *Taken().
        const lookup = (node, bindings = new Map(), seen = new Set()) => {
          node = value(node, bindings)
          if (!node || seen.has(node)) return null
          seen = new Set([...seen, node])
          if (
            node.type === 'UnaryExpression' &&
            node.operator === '!' &&
            node.argument.type === 'UnaryExpression' &&
            node.argument.operator === '!'
          )
            return lookup(node.argument.argument, bindings, seen)
          if (node.type !== 'CallExpression') return null
          if (
            node.callee.type === 'Identifier' &&
            node.callee.name === 'Boolean' &&
            !variable(node.callee)?.defs.length &&
            node.arguments.length === 1
          )
            return lookup(node.arguments[0], bindings, seen)
          if (imported(node.callee, 'findOne')) {
            const array = value(node.arguments[1], bindings)
            if (array?.type !== 'ArrayExpression' || !array.elements.length) return null
            if (
              array.elements.every(
                (entry) => value(property(entry, 'value'), bindings)?.type === 'Literal',
              )
            )
              return null
            const conditions = array.elements.map((entry) => {
              const field = value(property(entry, 'field'), bindings)
              const operator = value(property(entry, 'operator'), bindings)
              if (
                field?.type !== 'Literal' ||
                typeof field.value !== 'string' ||
                operator?.type !== 'Literal' ||
                !['=', '!='].includes(operator.value)
              )
                return null
              return {
                field: field.value,
                operator: operator.value,
                value: property(entry, 'value'),
              }
            })
            if (
              conditions.some((entry) => !entry) ||
              !conditions.some((entry) => entry.operator === '=')
            )
              return null
            return { table: node.arguments[0], conditions, bindings }
          }
          let fn = value(node.callee, bindings)
          if (fn?.type === 'Identifier') {
            const binding = variable(fn)
            const definition = binding?.defs[0]
            if (
              binding?.defs.length !== 1 ||
              definition.type !== 'FunctionName' ||
              binding.references.some((ref) => ref.isWrite() && !ref.init)
            )
              return null
            fn = definition.node
          }
          if (!functions.has(fn?.type)) return null
          let returned = fn.body
          if (returned.type === 'BlockStatement') {
            const statements = returned.body
            if (
              !statements.length ||
              statements.at(-1).type !== 'ReturnStatement' ||
              statements
                .slice(0, -1)
                .some(
                  (statement) =>
                    statement.type !== 'VariableDeclaration' || statement.kind !== 'const',
                )
            )
              return null
            returned = statements.at(-1).argument
          }
          const args = new Map(bindings)
          for (const [i, param] of fn.params.entries()) {
            if (param.type !== 'Identifier') return null
            // Resolve caller arguments before binding parameters (including a
            // recursive invocation of the same helper).
            args.set(variable(param), value(node.arguments[i], bindings))
          }
          return lookup(returned, args, seen)
        }
        const endsWithReturn = (block) => {
          const last = block.type === 'BlockStatement' ? block.body.at(-1) : block
          return last?.type === 'ReturnStatement'
        }
        const duplicateBranch = (block) => {
          if (!endsWithReturn(block)) return false
          const duplicateText = (node) => {
            if (!node || functions.has(node.type)) return false
            if (node.type === 'Literal' && typeof node.value === 'string')
              return /\b(?:already (?:been )?(?:taken|used|registered|exists|in use)|duplicate|uniqueness)\b/i.test(
                node.value,
              )
            return (source.visitorKeys[node.type] ?? []).some((key) => {
              const next = node[key]
              return Array.isArray(next) ? next.some(duplicateText) : duplicateText(next)
            })
          }
          const clientError = (node) =>
            node?.type === 'Literal' &&
            typeof node.value === 'number' &&
            node.value >= 400 &&
            node.value < 500
          const stack = [block]
          while (stack.length) {
            const node = stack.pop()
            if (!node || functions.has(node.type)) continue
            if (
              node.type === 'CallExpression' &&
              node.callee.type === 'Identifier' &&
              clientError(node.arguments[1]) &&
              node.arguments.some(duplicateText)
            )
              return true
            if (
              node.type === 'CallExpression' &&
              node.callee.type === 'MemberExpression' &&
              ['json', 'send', 'end'].includes(key(node.callee))
            ) {
              const status = node.callee.object
              if (
                status.type === 'CallExpression' &&
                status.callee.type === 'MemberExpression' &&
                key(status.callee) === 'status' &&
                clientError(status.arguments[0]) &&
                node.arguments.some(duplicateText)
              )
                return true
            }
            if (
              node.type === 'ObjectExpression' &&
              clientError(property(node, 'statusCode')) &&
              duplicateText(property(node, 'body'))
            )
              return true
            for (const child of source.visitorKeys[node.type] ?? []) {
              const next = node[child]
              if (Array.isArray(next)) stack.push(...next)
              else if (next) stack.push(next)
            }
          }
          return false
        }
        const comparesCurrent = (test, query, operators, conjunction = '&&') => {
          test = unwrap(test)
          if (test?.type === 'LogicalExpression' && test.operator === conjunction)
            return (
              comparesCurrent(test.left, query, operators, conjunction) ||
              comparesCurrent(test.right, query, operators, conjunction)
            )
          if (test?.type !== 'BinaryExpression' || !operators.includes(test.operator)) return false
          return [
            [test.left, test.right],
            [test.right, test.left],
          ].some(
            ([next, current]) =>
              current.type === 'MemberExpression' &&
              query.conditions.some(
                (condition) =>
                  condition.field === key(current) && same(condition.value, next, query.bindings),
              ),
          )
        }
        const changedValueGuard = (node, query) => {
          let child = node
          for (
            let parent = node.parent;
            parent && !functions.has(parent.type);
            child = parent, parent = parent.parent
          ) {
            if (parent.type === 'BlockStatement') {
              const prior = parent.body[parent.body.indexOf(child) - 1]
              if (
                prior?.type === 'IfStatement' &&
                !prior.alternate &&
                endsWithReturn(prior.consequent) &&
                comparesCurrent(prior.test, query, ['==', '==='])
              )
                return true
            }
            if (parent.type !== 'IfStatement') continue
            const differs = parent.consequent === child ? ['!=', '!=='] : ['==', '===']
            if (
              comparesCurrent(
                parent.test,
                query,
                differs,
                parent.consequent === child ? '&&' : '||',
              )
            )
              return true
          }
          return false
        }
        const childOf = (node, ancestor) => {
          for (let child = node; child?.parent; child = child.parent)
            if (child.parent === ancestor) return child
          return null
        }
        const canReachWrite = (check, write) => {
          if (enclosingFunction(write) !== enclosingFunction(check)) return false
          for (
            let parent = check.parent;
            parent && !functions.has(parent.type);
            parent = parent.parent
          ) {
            const writeChild = childOf(write, parent)
            if (
              parent.type === 'IfStatement' &&
              writeChild &&
              childOf(check, parent) !== writeChild
            )
              return false
            if (
              parent.type === 'SwitchStatement' &&
              writeChild &&
              childOf(check, parent) !== writeChild
            )
              return false
            if (parent.type === 'BlockStatement' && !writeChild && endsWithReturn(parent))
              return false
          }
          return true
        }
        return {
          CallExpression(node) {
            if (imported(node.callee, 'updateById')) calls.push(node)
          },
          IfStatement(node) {
            checks.push(node)
          },
          'Program:exit'() {
            for (const check of checks) {
              if (!duplicateBranch(check.consequent)) continue
              const query = lookup(check.test)
              if (!query || changedValueGuard(check, query)) continue
              const write = calls.find(
                (call) =>
                  call.range[0] > check.range[1] &&
                  canReachWrite(check, call) &&
                  same(query.table, call.arguments[0], query.bindings) &&
                  query.conditions.some(
                    (condition) =>
                      condition.operator === '=' &&
                      value(condition.value, query.bindings)?.type !== 'Literal' &&
                      same(
                        condition.value,
                        property(value(call.arguments[2]), condition.field),
                        query.bindings,
                      ),
                  ),
              )
              if (
                !write ||
                query.conditions.some(
                  (condition) =>
                    condition.field === 'id' &&
                    condition.operator === '!=' &&
                    same(condition.value, write.arguments[1], query.bindings),
                )
              )
                continue
              context.report({
                node: check.test,
                messageId: 'selfConflict',
                data: {
                  fields: query.conditions
                    .filter((condition) => condition.operator === '=')
                    .map((condition) => condition.field)
                    .join(', '),
                  line: write.loc.start.line,
                  id: source.getText(write.arguments[1]),
                },
              })
            }
          },
        }
      },
    },
    // The bond's router components give the app its molecule router (which
    // @molecule/app-react's routing hooks, Link, RoutedView and the molecule layouts
    // and guards read; React Router's own leave them without one), and the client
    // ones own the transition setting, so this rule only moves router imports.
    // Type-only imports cannot render a router and are deliberately left alone.
    // `HydratedRouter` and the DOM `RouterProvider` (`react-router/dom`, re-exported by
    // `react-router-dom`) move to the bond's `/dom` entry, which keeps `react-dom` out
    // of its main entry.
    'router-commits-with-url': {
      meta: {
        type: 'problem',
        fixable: 'code',
        schema: [],
        messages: {
          synchronous:
            "Import this router from '{{module}}'. Its wrapper gives the app the molecule router that @molecule/app-react's routing hooks, Link and RoutedView read, and in the browser sets useTransitions={false} so the URL and rendered page change together.",
          namespace:
            'This namespace renders a router component outside the declared routing provider wrapper. Import that router component from @molecule/app-routing-react-router, which gives the app the molecule router and its documented transition setting. Hook-only namespace imports remain supported.',
          dynamic:
            "Import router components directly from '@molecule/app-routing-react-router' instead of a dynamic React Router import (dynamic module uses are not tracked), because its wrappers give the app the molecule router and, in the browser, set useTransitions={false} so the URL and rendered page change together.",
        },
      },
      create(context) {
        const source = context.sourceCode
        const packages = new Set(['react-router', 'react-router-dom', 'react-router/dom'])
        const routers = new Set([
          'BrowserRouter',
          'HashRouter',
          'MemoryRouter',
          'Router',
          'RouterProvider',
          'HydratedRouter',
          'unstable_HistoryRouter',
          'StaticRouter',
          'StaticRouterProvider',
        ])
        const bond = '@molecule/app-routing-react-router'
        const domEntries = new Set(['react-router/dom', 'react-router-dom'])
        const target = (module, name) =>
          name === 'HydratedRouter' || (name === 'RouterProvider' && domEntries.has(module))
            ? `${bond}/dom`
            : bond
        // Moved specifiers grouped by the bond entry each one moves to, in source order.
        const byTarget = (specifiers, module, nameOf) => {
          const groups = new Map()
          for (const specifier of specifiers) {
            const destination = target(module, nameOf(specifier))
            groups.set(destination, [...(groups.get(destination) ?? []), specifier])
          }
          return [...groups]
        }
        const importedName = (specifier) => specifier.imported.name ?? specifier.imported.value
        const exportedLocal = (specifier) => specifier.local.name ?? specifier.local.value
        const declaration = (specifiers, module, semicolon) => {
          const parts = specifiers
            .filter((specifier) => specifier.type !== 'ImportSpecifier')
            .map((specifier) => source.getText(specifier))
          const named = specifiers.filter((specifier) => specifier.type === 'ImportSpecifier')
          if (named.length > 0)
            parts.push(`{ ${named.map((specifier) => source.getText(specifier)).join(', ')} }`)
          return `import ${parts.join(', ')} from '${module}'${semicolon}`
        }
        const exportDeclaration = (specifiers, module, semicolon) =>
          `export { ${specifiers.map((specifier) => source.getText(specifier)).join(', ')} } from '${module}'${semicolon}`
        const moduleName = (node) => {
          if (node.type === 'Literal') return node.value
          if (node.type === 'TemplateLiteral' && node.expressions.length === 0)
            return node.quasis[0].value.cooked ?? node.quasis[0].value.raw
          return null
        }
        return {
          ImportDeclaration(node) {
            if (!packages.has(moduleName(node.source)) || node.importKind === 'type') return
            const namespace = node.specifiers.find(
              (entry) => entry.type === 'ImportNamespaceSpecifier',
            )
            if (namespace) {
              const variable = context.sourceCode
                .getDeclaredVariables(node)
                .find((entry) => entry.name === namespace.local.name)
              const used = variable?.references.some(({ identifier }) => {
                const member = identifier.parent
                return (
                  (member?.type === 'MemberExpression' &&
                    member.object === identifier &&
                    !member.computed &&
                    routers.has(member.property.name)) ||
                  (member?.type === 'JSXMemberExpression' &&
                    member.object === identifier &&
                    routers.has(member.property.name))
                )
              })
              if (used) context.report({ node, messageId: 'namespace' })
              return
            }
            const module = moduleName(node.source)
            const moved = node.specifiers.filter(
              (specifier) =>
                specifier.type === 'ImportSpecifier' &&
                specifier.importKind !== 'type' &&
                routers.has(importedName(specifier)),
            )
            if (moved.length === 0) return
            context.report({
              node: moved[0],
              messageId: 'synchronous',
              data: { module: target(module, importedName(moved[0])) },
              fix(fixer) {
                const semicolon = source.getText(node).trimEnd().endsWith(';') ? ';' : ''
                const bondImports = byTarget(moved, module, importedName).map(
                  ([destination, specifiers]) => declaration(specifiers, destination, semicolon),
                )
                const remaining = node.specifiers.filter((specifier) => !moved.includes(specifier))
                if (remaining.length > 0)
                  bondImports.unshift(declaration(remaining, module, semicolon))
                return fixer.replaceText(node, bondImports.join('\n'))
              },
            })
          },
          ExportNamedDeclaration(node) {
            if (
              !node.source ||
              !packages.has(moduleName(node.source)) ||
              node.exportKind === 'type'
            )
              return
            const module = moduleName(node.source)
            const moved = node.specifiers.filter(
              (specifier) =>
                specifier.type === 'ExportSpecifier' &&
                specifier.exportKind !== 'type' &&
                routers.has(exportedLocal(specifier)),
            )
            if (moved.length === 0) return
            context.report({
              node: moved[0],
              messageId: 'synchronous',
              data: { module: target(module, exportedLocal(moved[0])) },
              fix(fixer) {
                const semicolon = source.getText(node).trimEnd().endsWith(';') ? ';' : ''
                const bondExports = byTarget(moved, module, exportedLocal).map(
                  ([destination, specifiers]) =>
                    exportDeclaration(specifiers, destination, semicolon),
                )
                const remaining = node.specifiers.filter((specifier) => !moved.includes(specifier))
                if (remaining.length > 0)
                  bondExports.push(exportDeclaration(remaining, module, semicolon))
                return fixer.replaceText(node, bondExports.join('\n'))
              },
            })
          },
        }
      },
    },
    'url-lists-use-list-route': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            "Warn when a component's local state controls a list component or list-fetching hook, including array callbacks, derived values and request options. Reactive URL reads, inline JSX iterations and opaque cross-file prop chains are outside this rule.",
        },
        schema: [],
        messages: {
          useListRoute:
            'This local state snapshots a URL value once. If this is URL-owned list state, derive it on every render with useSearchParams/useListRoute so navigation stays synchronized; keep intentional editable drafts local.',
        },
      },
      create(context) {
        const source = context.sourceCode
        const states = []
        const collections = []
        const variableFor = (node, name) => {
          let scope = source.getScope(node)
          while (scope) {
            const variable = scope.set.get(name)
            if (variable) return variable
            scope = scope.upper
          }
          return null
        }
        const isFunction = (node) =>
          node?.type === 'FunctionDeclaration' ||
          node?.type === 'FunctionExpression' ||
          node?.type === 'ArrowFunctionExpression'
        const functionName = (node) => {
          if (node.id?.type === 'Identifier') return node.id.name
          if (node.parent?.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier')
            return node.parent.id.name
          return ''
        }
        const componentFor = (node) => {
          for (let current = node.parent; current; current = current.parent) {
            if (isFunction(current) && /^[A-Z]/.test(functionName(current))) return current
          }
          return null
        }
        const within = (node, ancestor) => {
          for (let current = node; current; current = current.parent) {
            if (current === ancestor) return true
          }
          return false
        }
        const isScalarState = (call, hook) => {
          const initial = call.arguments[hook === 'useReducer' ? 1 : 0]
          return (
            !initial ||
            (!['ArrayExpression', 'ObjectExpression'].includes(initial.type) &&
              !(initial.type === 'Literal' && initial.value === null))
          )
        }
        const method = (node) =>
          node?.type === 'MemberExpression' && !node.computed ? node.property.name : null
        const transforms = new Set(['filter', 'sort', 'toSorted', 'slice', 'map', 'flatMap'])
        const controls = new Set(['filter', 'sort', 'toSorted', 'slice'])
        const listAttribute = (attribute) =>
          attribute?.type === 'JSXAttribute' &&
          attribute.parent.name.type === 'JSXIdentifier' &&
          /(?:List|Results|Table|Grid|Catalog)$/.test(attribute.parent.name.name)
        const reads = (variable, owner) =>
          variable.references
            .filter((reference) => reference.isRead() && within(reference.identifier, owner))
            .map((reference) => reference.identifier)

        // Follow the result, not the mere presence of .filter/useQuery. Counts,
        // form validation and chart calculations do not prove a rendered list.
        const rendered = (value, owner, seen = new Set()) => {
          if (seen.has(value)) return false
          seen.add(value)
          const parent = value.parent
          if (!parent || value === owner) return false
          if (parent.type === 'VariableDeclarator' && parent.init === value) {
            const variable =
              parent.id.type === 'Identifier' && variableFor(parent.id, parent.id.name)
            return variable && reads(variable, owner).some((read) => rendered(read, owner, seen))
          }
          if (parent.type === 'JSXExpressionContainer') {
            const attribute = parent.parent
            return (
              listAttribute(attribute) && /^(?:items|rows|data|children)$/.test(attribute.name.name)
            )
          }
          if (parent.type === 'MemberExpression' && parent.object === value) {
            const call = parent.parent
            if (call?.type !== 'CallExpression' || call.callee !== parent)
              return (
                ['data', 'items', 'rows', 'results'].includes(method(parent)) &&
                rendered(parent, owner, seen)
              )
            if (transforms.has(method(parent))) return rendered(call, owner, seen)
            if (method(parent) === 'then') {
              const callback = call.arguments[0]
              if (!callback) return false
              if (
                collections.some(
                  (collection) =>
                    collection.owner === owner &&
                    collection.setter.references.some((ref) => within(ref.identifier, callback)) &&
                    reads(collection.variable, owner).some((read) => rendered(read, owner, seen)),
                )
              )
                return true
              return rendered(call, owner, seen)
            }
            return false
          }
          if (
            parent.type === 'CallExpression' &&
            parent.arguments.includes(value) &&
            parent.callee.type === 'Identifier'
          ) {
            const setter = variableFor(parent.callee, parent.callee.name)
            return collections.some(
              (collection) =>
                collection.owner === owner &&
                collection.setter === setter &&
                reads(collection.variable, owner).some((read) => rendered(read, owner, seen)),
            )
          }
          if (parent.type === 'ReturnStatement' || (isFunction(parent) && parent.body === value)) {
            let callback = parent
            while (callback && !isFunction(callback)) callback = callback.parent
            const call = callback?.parent
            return (
              call?.type === 'CallExpression' &&
              call.callee.type === 'Identifier' &&
              call.callee.name === 'useMemo' &&
              call.arguments[0] === callback &&
              rendered(call, owner, seen)
            )
          }
          if (
            [
              'ChainExpression',
              'AwaitExpression',
              'TSAsExpression',
              'TSNonNullExpression',
              'ConditionalExpression',
              'LogicalExpression',
              'SpreadElement',
              'ArrayExpression',
            ].includes(parent.type)
          )
            return rendered(parent, owner, seen)
          return false
        }
        const hasListConsumer = (reference, owner, seen = new Set()) => {
          if (seen.has(reference)) return false
          seen.add(reference)
          let optionKey = null
          for (let node = reference; node && node !== owner; node = node.parent) {
            const parent = node.parent
            if (!parent) return false
            if (isFunction(parent)) {
              const call = parent.parent
              if (
                call?.type !== 'CallExpression' ||
                !controls.has(method(call.callee)) ||
                !call.arguments.includes(parent)
              )
                return false
            }
            if (parent.type === 'VariableDeclarator' && parent.init === node) {
              const variable =
                parent.id.type === 'Identifier' && variableFor(parent.id, parent.id.name)
              if (
                variable &&
                reads(variable, owner).some((read) => hasListConsumer(read, owner, seen))
              )
                return true
              return false
            }
            if (parent.type === 'Property' && parent.value === node && optionKey === null) {
              optionKey = parent.key.type === 'Identifier' ? parent.key.name : parent.key.value
            }
            if (
              parent.type === 'CallExpression' &&
              node === parent.arguments[0] &&
              parent.callee.type === 'Identifier' &&
              rendered(parent, owner) &&
              typeof optionKey === 'string'
            )
              return true
            if (
              parent.type === 'CallExpression' &&
              parent.arguments.includes(node) &&
              (controls.has(method(parent.callee)) ||
                ((method(parent.callee) === 'get' || parent.callee.name === 'fetch') &&
                  typeof optionKey === 'string')) &&
              rendered(parent, owner)
            )
              return true
            if (parent.type === 'JSXExpressionContainer') {
              const attribute = parent.parent
              const opening = attribute?.type === 'JSXAttribute' ? attribute.parent : null
              if (
                opening?.type === 'JSXOpeningElement' &&
                opening.name.type === 'JSXIdentifier' &&
                /(?:List|Results|Table|Grid|Catalog)$/.test(opening.name.name) &&
                attribute.name.type === 'JSXIdentifier'
              )
                return true
            }
          }
          return false
        }
        // Resolve the actual React export through immutable aliases. A local object or
        // callback sharing a hook's name is not evidence that React runs the assignment.
        const importedExport = (expression, seen = new Set()) => {
          if (
            [
              'TSAsExpression',
              'TSTypeAssertion',
              'TSNonNullExpression',
              'TSSatisfiesExpression',
              'ChainExpression',
            ].includes(expression?.type)
          )
            return importedExport(expression.expression, seen)
          if (expression?.type === 'MemberExpression') {
            const origin = importedExport(expression.object, seen)
            if (origin?.name !== '*') return null
            const name = expression.computed ? expression.property.value : expression.property.name
            return typeof name === 'string'
              ? { module: origin.module, name: name === 'default' ? '*' : name }
              : null
          }
          if (expression?.type !== 'Identifier') return null
          const variable = variableFor(expression, expression.name)
          if (!variable || seen.has(variable)) return null
          seen.add(variable)
          const definition = variable.defs[0]
          if (definition?.type === 'ImportBinding') {
            const declaration = definition.parent || definition.node.parent
            if (declaration?.importKind === 'type' || definition.node.importKind === 'type')
              return null
            const name =
              definition.node.type === 'ImportSpecifier'
                ? definition.node.imported.name || definition.node.imported.value
                : '*'
            return { module: declaration?.source?.value, name: name === 'default' ? '*' : name }
          }
          if (definition?.parent?.kind !== 'const') return null
          const origin = importedExport(definition.node.init, seen)
          if (definition.node.id.type !== 'ObjectPattern') return origin
          if (origin?.name !== '*') return null
          const property = definition.node.id.properties.find((property) => {
            if (property.type !== 'Property') return false
            const value =
              property.value.type === 'AssignmentPattern' ? property.value.left : property.value
            return value.type === 'Identifier' && value.name === expression.name
          })
          if (!property) return null
          const name = property.computed
            ? property.key.value
            : property.key.name || property.key.value
          return typeof name === 'string'
            ? { module: origin.module, name: name === 'default' ? '*' : name }
            : null
        }
        const synchronized = (state) => {
          if (!state.setter) return false
          let found = false
          const urlVariables = (expression, result = new Set()) => {
            if (!expression || typeof expression.type !== 'string') return result
            if (expression.type === 'Identifier' && state.readsUrl(expression)) {
              const variable = variableFor(expression, expression.name)
              if (variable) result.add(variable)
            }
            for (const [key, value] of Object.entries(expression)) {
              if (key === 'parent') continue
              if (Array.isArray(value)) value.forEach((child) => urlVariables(child, result))
              else if (value && typeof value.type === 'string') urlVariables(value, result)
            }
            return result
          }
          const visit = (node) => {
            if (found || !node || typeof node.type !== 'string') return
            if (isFunction(node) && node !== state.owner) return
            if (
              node.type === 'CallExpression' &&
              importedExport(node.callee)?.module === 'react' &&
              ['useEffect', 'useLayoutEffect'].includes(importedExport(node.callee)?.name)
            ) {
              const callback = node.arguments[0],
                dependencies = node.arguments[1]
              const expression =
                callback?.body?.type === 'BlockStatement'
                  ? callback.body.body.length === 1 &&
                    ['ExpressionStatement', 'ReturnStatement'].includes(callback.body.body[0].type)
                    ? callback.body.body[0].expression || callback.body.body[0].argument
                    : null
                  : callback?.body
              if (
                expression?.type === 'CallExpression' &&
                expression.callee.type === 'Identifier' &&
                variableFor(expression.callee, expression.callee.name) === state.setter &&
                dependencies?.type === 'ArrayExpression'
              ) {
                const assigned = urlVariables(expression.arguments[0])
                const reactive = urlVariables(dependencies)
                if (assigned.size && [...assigned].every((variable) => reactive.has(variable)))
                  found = true
              }
            }
            for (const [key, value] of Object.entries(node)) {
              if (key === 'parent') continue
              if (Array.isArray(value)) value.forEach(visit)
              else if (value && typeof value.type === 'string') visit(value)
            }
          }
          visit(state.owner)
          return found
        }
        return {
          VariableDeclarator(node) {
            if (node.id.type !== 'ArrayPattern' || node.init?.type !== 'CallExpression') return
            const hook = importedExport(node.init.callee)
            if (hook?.module !== 'react' || !['useState', 'useReducer'].includes(hook.name)) return
            const first = node.id.elements[0]
            const owner = componentFor(node)
            if (first?.type !== 'Identifier' || !owner) return
            const variable = variableFor(first, first.name)
            if (!variable) return
            if (node.init.arguments[0]?.type === 'ArrayExpression') {
              const second = node.id.elements[1]
              const setter = second?.type === 'Identifier' && variableFor(second, second.name)
              if (setter) collections.push({ variable, setter, owner })
            }
            // Local filters are valid. Only warn about a snapshot of a URL-owned value.
            const initializer = node.init.arguments[hook.name === 'useReducer' ? 1 : 0]
            const readsUrl = (expression, seen = new Set()) => {
              if (!expression || seen.has(expression)) return false
              seen.add(expression)
              if (expression.type === 'Identifier') {
                const definition = variableFor(expression, expression.name)?.defs[0]?.node
                if (
                  definition?.init?.type === 'CallExpression' &&
                  [
                    'react-router',
                    'react-router-dom',
                    '@molecule/app-routing-react-router',
                  ].includes(importedExport(definition.init.callee)?.module) &&
                  ['useSearchParams', 'useListRoute'].includes(
                    importedExport(definition.init.callee)?.name,
                  )
                )
                  return true
                if (definition?.init && definition.init !== expression)
                  return readsUrl(definition.init, seen)
              }
              return Object.entries(expression).some(
                ([key, child]) =>
                  key !== 'parent' &&
                  (Array.isArray(child)
                    ? child.some(
                        (entry) => entry && typeof entry.type === 'string' && readsUrl(entry, seen),
                      )
                    : child && typeof child.type === 'string' && readsUrl(child, seen)),
              )
            }
            const snapshotsUrl =
              readsUrl(initializer) ||
              (hook.name === 'useReducer' && readsUrl(node.init.arguments[2]))
            if (snapshotsUrl && isScalarState(node.init, hook.name))
              states.push({
                node: first,
                variable,
                owner,
                readsUrl,
                setter:
                  hook.name === 'useState' && node.id.elements[1]?.type === 'Identifier'
                    ? variableFor(node.id.elements[1], node.id.elements[1].name)
                    : null,
              })
          },
          'Program:exit'() {
            const reported = new Set()
            for (const state of states) {
              if (reported.has(state.variable) || synchronized(state)) continue
              const consumed = state.variable.references.some(
                (reference) =>
                  within(reference.identifier, state.owner) &&
                  hasListConsumer(reference.identifier, state.owner),
              )
              if (consumed) {
                reported.add(state.variable)
                context.report({ node: state.node, messageId: 'useListRoute' })
              }
            }
          },
        }
      },
    },
    // A favorite/follow/like/bookmark button or a setting switch that shows the toggled value at
    // once and saves each click with its own request: a second click races the first, so a slower
    // response (or a refetch of older data) flips the button back. `useOptimisticValue` sends the
    // saves in order and keeps the newest choice. Structural only: a `useState` setter writes the
    // toggled value (`!current` or a variable holding it) before a request that receives it, is
    // chosen by it, or chooses its HTTP method between DELETE and a write.
    'server-toggles-use-optimistic-value': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Warn when a React module saves a toggled value with its own request instead of useOptimisticValue.',
        },
        schema: [
          {
            type: 'object',
            properties: {
              persistenceFunctions: { type: 'array', items: { type: 'string' } },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          useOptimisticValue:
            'This toggle saves clicks independently. Use the generated toggle hook or `useOptimisticValue` from `@molecule/app-react` to queue clicks during saves. Keep the control enabled and wait for the save before navigating to read the result. {{rewrite}}',
          awaitRefetch:
            'This toggle waits for a save and refetch. Prefer the generated toggle hook or use `useOptimisticValue` from `@molecule/app-react` with the loaded value and saved result. Preserve authentication checks. Keep the loaded control mounted and enabled during saves and refreshes.',
          awaitSave:
            'This toggle waits for its own save. Prefer the generated toggle hook or use `useOptimisticValue` from `@molecule/app-react` with the loaded value and saved result. Preserve authentication checks. Keep the loaded control mounted and enabled so later clicks queue.',
        },
      },
      create(context) {
        const helpers = new Set(['useOptimisticValue', 'createOptimisticValue'])
        let reactModule = false
        const candidates = []
        const submitHandlers = new Set()
        const helperCommits = new Set()
        const siblingBindings = new WeakMap()
        let resolver
        const isFunction = (node) =>
          node?.type === 'FunctionDeclaration' ||
          node?.type === 'FunctionExpression' ||
          node?.type === 'ArrowFunctionExpression'
        const enclosingFunction = (node) => {
          let current = node.parent
          while (current && !isFunction(current)) current = current.parent
          return current ?? null
        }
        const unwrap = (node) => {
          let current = node
          while (
            current &&
            (current.type === 'AwaitExpression' ||
              current.type === 'TSAsExpression' ||
              current.type === 'TSSatisfiesExpression' ||
              current.type === 'TSTypeAssertion' ||
              current.type === 'TSNonNullExpression' ||
              current.type === 'ChainExpression')
          )
            current = current.type === 'AwaitExpression' ? current.argument : current.expression
          return current
        }
        const variableFor = (node) => {
          if (node?.type !== 'Identifier') return null
          let scope = context.sourceCode.getScope(node)
          while (scope) {
            if (scope.set.has(node.name)) return scope.set.get(node.name)
            scope = scope.upper
          }
          return null
        }
        const functionFor = (node, findBinding = variableFor) => {
          const expression = unwrap(node)
          if (isFunction(expression)) return expression
          const definition = findBinding(expression)?.defs[0]
          const value =
            definition?.type === 'FunctionName' ? definition.node : definition?.node.init
          if (value?.type === 'CallExpression' && isFunction(value.arguments[0])) {
            const callee = unwrap(value.callee)
            const namespace = callee?.type === 'MemberExpression'
            const binding = findBinding(namespace ? callee.object : callee)?.defs[0]
            const hook = namespace
              ? callee.computed
                ? callee.property.value
                : callee.property.name
              : binding?.node.imported?.name
            if (
              binding?.type === 'ImportBinding' &&
              binding.parent.source.value === 'react' &&
              hook === 'useCallback' &&
              (!namespace ||
                ['ImportNamespaceSpecifier', 'ImportDefaultSpecifier'].includes(binding.node.type))
            )
              return value.arguments[0]
          }
          return isFunction(value) ? value : null
        }
        const callName = (node) => {
          const callee = unwrap(node?.callee)
          return callee?.type === 'Identifier'
            ? callee.name
            : callee?.type === 'MemberExpression'
              ? callee.computed
                ? callee.property.value
                : callee.property.name
              : null
        }
        // Look through a directly imported, named function. Reuse the scaffold's source
        // resolver and that file's lexical bindings. One import hop is enough for the common
        // component/transport split, and keeps unrelated imports and opaque adapters out.
        const importedWriter = (call, callee) => {
          const binding = variableFor(callee)?.defs[0]
          if (
            !parser ||
            !isAbsolute(context.filename) ||
            binding?.type !== 'ImportBinding' ||
            binding.node.type !== 'ImportSpecifier' ||
            !binding.parent.source.value.startsWith('.')
          )
            return null
          const owner = enclosingFunction(call)
          if (!owner) return null
          const names = toggledNames(owner)
          const desired = call.arguments.flatMap((argument, index) =>
            toggled(argument, names) ? [index] : [],
          )
          if (!desired.length) return null
          resolver ??= componentResolver(parser, context)
          const target = resolver.imported(context.sourceCode.ast, callee.name, context.filename)
          if (!isFunction(target?.node)) return null
          const exported = target.tree.body.some(
            ({ type, declaration }) =>
              type === 'ExportNamedDeclaration' &&
              declaration?.range[0] <= target.node.range[0] &&
              target.node.range[1] <= declaration.range[1],
          )
          if (!exported) return null
          let bindings = siblingBindings.get(target.tree)
          if (!bindings) {
            bindings = new WeakMap()
            for (const scope of resolver.scopes.get(target.tree) ?? [])
              for (const variable of scope.variables)
                for (const reference of variable.references)
                  bindings.set(reference.identifier, variable)
            siblingBindings.set(target.tree, bindings)
          }
          const params = new Set(desired.map((index) => target.node.params[index]))
          const readsDesired = (expression) => {
            let reads = false
            walk(expression, (node) => {
              if (
                bindings
                  .get(node)
                  ?.defs.some((def) => def.type === 'Parameter' && params.has(def.name))
              )
                reads = true
            })
            return reads
          }
          const branches = []
          walk(target.node.body, (node) => {
            if (
              ['IfStatement', 'ConditionalExpression'].includes(node.type) &&
              readsDesired(node.test)
            )
              branches.push(node.consequent, node.alternate)
          })
          const writesDesired = (node) =>
            node.arguments.some(readsDesired) ||
            branches.some(
              (branch) =>
                branch && branch.range[0] <= node.range[0] && node.range[1] <= branch.range[1],
            )
          return {
            fn: target.node,
            filename: target.filename,
            findBinding: (node) => bindings.get(node),
            writesDesired,
            selectsDesired: (test) => unwrap(test)?.type === 'Identifier' && readsDesired(test),
          }
        }
        // An async callback can update local state or read data. Prove a write from the
        // actual HTTP binding before treating it as a server mutation.
        const persistenceCall = (node, seen = new Set(), findBinding = variableFor) => {
          if (node?.type !== 'CallExpression' || seen.has(node)) return false
          seen.add(node)
          const callee = unwrap(node.callee)
          if (setters.has(findBinding(callee))) return false
          if (
            findBinding === variableFor &&
            (context.options[0]?.persistenceFunctions ?? []).includes(
              context.sourceCode.getText(node.callee),
            )
          )
            return true
          const verbs = new Set(['post', 'put', 'patch', 'delete', 'del'])
          const modules = new Set([
            '@molecule/app-http',
            '@molecule/app-http-fetch',
            '@molecule/app-http-axios',
            'axios',
            'ky',
            'superagent',
          ])
          const origin = (id) => {
            const def = findBinding(id)?.defs[0]
            return def?.type === 'ImportBinding' &&
              def.parent.importKind !== 'type' &&
              def.node.importKind !== 'type'
              ? def.parent.source.value
              : null
          }
          const client = (expression, visited = new Set()) => {
            expression = unwrap(expression)
            if (!expression || visited.has(expression)) return false
            visited.add(expression)
            if (expression.type === 'Identifier') {
              if (modules.has(origin(expression))) return true
              const def = findBinding(expression)?.defs[0]
              return def?.type === 'Variable' && client(def.node.init, visited)
            }
            if (expression.type === 'CallExpression') {
              const factory = unwrap(expression.callee)
              if (factory.type === 'Identifier') {
                const def = findBinding(factory)?.defs[0]
                if (
                  origin(factory) &&
                  ['getClient', 'useHttpClient'].includes(def.node.imported?.name) &&
                  (modules.has(def.parent.source.value) ||
                    [
                      '@molecule/app-react',
                      '@molecule/app-vue',
                      '@molecule/app-react-native',
                    ].includes(def.parent.source.value))
                )
                  return true
                const wrapper = functionFor(factory, findBinding)
                if (!wrapper || wrapper.params.length || expression.arguments.length) return false
                const body = wrapper.body
                const returned =
                  body.type === 'BlockStatement' &&
                  body.body.length === 1 &&
                  body.body[0].type === 'ReturnStatement'
                    ? body.body[0].argument
                    : body
                return client(returned, visited)
              }
              return (
                factory.type === 'MemberExpression' &&
                factory.property.name === 'getClient' &&
                client(factory.object, visited)
              )
            }
            return false
          }
          const writeMethod = (value) =>
            (value?.type === 'Literal' &&
              typeof value.value === 'string' &&
              ['POST', 'PUT', 'PATCH', 'DELETE'].includes(value.value.toUpperCase())) ||
            (value?.type === 'ConditionalExpression' &&
              writeMethod(value.consequent) &&
              writeMethod(value.alternate))
          if (
            callee.type === 'Identifier' &&
            callee.name === 'fetch' &&
            !findBinding(callee)?.defs.length
          ) {
            const options = unwrap(node.arguments[1])
            return (
              options?.type === 'ObjectExpression' &&
              options.properties.some(
                (property) =>
                  property.type === 'Property' &&
                  (property.key.name ?? property.key.value) === 'method' &&
                  writeMethod(unwrap(property.value)),
              )
            )
          }
          if (
            callee.type === 'MemberExpression' &&
            verbs.has(String(callName(node)).toLowerCase()) &&
            client(callee.object)
          )
            return true
          if (
            callee.type === 'Identifier' &&
            verbs.has(callee.name.toLowerCase()) &&
            modules.has(origin(callee))
          )
            return true
          const local = functionFor(callee, findBinding)
          const writer = local
            ? { fn: local, findBinding }
            : findBinding === variableFor
              ? importedWriter(node, callee)
              : null
          if (!writer) return false
          let persists = false
          walk(writer.fn.body, (child) => {
            if (
              !persists &&
              child.type === 'CallExpression' &&
              (!writer.writesDesired || writer.writesDesired(child)) &&
              persistenceCall(child, seen, writer.findBinding)
            )
              persists = true
          })
          return persists
        }
        // `!value` or `!record.field`: the opposite of a value read now. A call's negation
        // (`!confirm()`) is a question, not a toggled value.
        const negatedRead = (node) =>
          unwrap(node)?.type === 'UnaryExpression' &&
          unwrap(node).operator === '!' &&
          ['Identifier', 'MemberExpression'].includes(unwrap(unwrap(node).argument)?.type)
        // `const next = !favorited` inside the function: names that hold a toggled value.
        const toggledNames = (fn) => {
          const names = new Set()
          const visit = (node) => {
            if (!node || typeof node.type !== 'string') return
            if (node !== fn && isFunction(node)) return
            if (
              node.type === 'VariableDeclarator' &&
              node.id.type === 'Identifier' &&
              negatedRead(node.init)
            )
              names.add(variableFor(node.id))
            for (const key of Object.keys(node)) {
              if (key === 'parent') continue
              const value = node[key]
              if (Array.isArray(value)) value.forEach(visit)
              else if (value && typeof value.type === 'string') visit(value)
            }
          }
          visit(fn.body)
          return names
        }
        const toggled = (node, names, seen = new Set()) => {
          const expression = unwrap(node)
          if (!expression || seen.has(expression) || seen.size > 24) return false
          const next = new Set(seen).add(expression)
          if (negatedRead(expression)) return true
          if (expression.type === 'ObjectExpression')
            return expression.properties.some(
              (property) => property.type === 'Property' && toggled(property.value, names, next),
            )
          if (expression.type !== 'Identifier') return false
          const variable = variableFor(expression)
          if (names.has(variable)) return true
          const definition = variable?.defs[0]
          // A previous immutable alias can hold an object containing the flipped field.
          // Mutable values and destructuring stay unknown.
          return (
            definition?.node.type === 'VariableDeclarator' &&
            definition.node.id.type === 'Identifier' &&
            definition.parent?.kind === 'const' &&
            definition.node.range[1] <= expression.range[0] &&
            toggled(definition.node.init, names, next)
          )
        }
        // `{ notifications: !settings.notifications }`: a field set to the opposite of itself.
        const selfToggle = (property) => {
          if (property.type !== 'Property' || !negatedRead(property.value)) return false
          const read = unwrap(unwrap(property.value).argument)
          const key = property.key.type === 'Identifier' ? property.key.name : property.key.value
          const field = read.type === 'MemberExpression' ? read.property.name : read.name
          return key === field
        }
        // Awaited, or chained with then/catch/finally, directly or through the variable it is stored in.
        const promiseUsed = (node, fn, seen = new Set()) => {
          if (seen.has(node)) return false
          seen.add(node)
          let current = node
          while (
            current.parent &&
            [
              'TSAsExpression',
              'TSSatisfiesExpression',
              'TSTypeAssertion',
              'TSNonNullExpression',
              'ChainExpression',
            ].includes(current.parent.type)
          )
            current = current.parent
          const parent = current.parent
          if (parent?.type === 'AwaitExpression') return true
          if (
            parent?.type === 'MemberExpression' &&
            parent.object === current &&
            ['then', 'catch', 'finally'].includes(parent.property.name) &&
            parent.parent?.type === 'CallExpression'
          )
            return true
          if (parent?.type === 'ReturnStatement' || (parent === fn && fn.expression)) return true
          if (parent?.type === 'ConditionalExpression' && parent.test !== current)
            return promiseUsed(parent, fn, seen)
          if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
            const variable = context.sourceCode
              .getDeclaredVariables(parent)
              .find((entry) => entry.name === parent.id.name)
            return (variable?.references ?? []).some(
              (reference) =>
                reference.identifier !== parent.id && promiseUsed(reference.identifier, fn, seen),
            )
          }
          return false
        }
        const methodLiteral = (node) =>
          node?.type === 'Literal' && typeof node.value === 'string'
            ? node.value.toUpperCase()
            : null
        // The `useState` setters of this module: `const [value, setValue] = useState(…)`.
        const setters = new Set()
        const states = new Map()
        const effects = []
        const walk = (node, visit, nested = false) => {
          if (!node || typeof node.type !== 'string') return
          if (!nested && isFunction(node)) return
          visit(node)
          for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
            const value = node[key]
            if (Array.isArray(value)) value.forEach((child) => walk(child, visit, nested))
            else walk(value, visit, nested)
          }
        }
        const writesBefore = (fn, save) => {
          const writes = []
          walk(fn.body, (node) => {
            const state = node.type === 'CallExpression' && states.get(variableFor(node.callee))
            const argument = node.arguments?.[0]
            if (!state || !argument || node.range[0] >= save.range[0]) return
            let awaited = false
            walk(
              argument,
              (part) => {
                if (part.type === 'AwaitExpression') awaited = true
              },
              true,
            )
            // Busy flags and feedback resets are not the value being saved.
            if (awaited || ['Literal', 'ArrayExpression'].includes(unwrap(argument)?.type)) return
            writes.push({ state, argument, node })
          })
          return writes
        }
        const droppedOrRefetched = (fn, save) => {
          const writes = writesBefore(fn, save)
          const refetched = writes.some(({ state }) =>
            effects.some((effect) => {
              let replaces = false
              // Direct prop hydration can repeat while the control is active. An async
              // initial load alone does not prove that: readiness, dependencies and
              // cancellation belong to the separate action-ready analysis.
              walk(effect.body, (node) => {
                if (
                  node.type === 'CallExpression' &&
                  variableFor(node.callee) === state.setter &&
                  !isFunction(unwrap(node.arguments[0]))
                )
                  replaces = true
              })
              return replaces
            }),
          )
          return refetched
        }
        const serialized = (fn) => {
          const call = fn.parent
          if (
            call?.type !== 'CallExpression' ||
            callName(call) !== 'then' ||
            call.callee.type !== 'MemberExpression'
          )
            return false
          let result = call
          while (
            result.parent?.type === 'MemberExpression' &&
            ['catch', 'finally'].includes(result.parent.property.name) &&
            result.parent.parent?.type === 'CallExpression'
          )
            result = result.parent.parent
          const assignment = result.parent
          return (
            assignment?.type === 'AssignmentExpression' &&
            assignment.operator === '=' &&
            assignment.right === result &&
            context.sourceCode.getText(assignment.left) ===
              context.sourceCode.getText(call.callee.object)
          )
        }
        // A revision setter after the save invalidates a query whose hook reads that revision.
        // Do not infer a refetch from a setter name, an arbitrary callback or a form reset.
        const queryRead = (node, query, seen = new Set()) => {
          const value = unwrap(node)
          if (!value || seen.has(value) || seen.size > 16) return false
          const next = new Set(seen).add(value)
          if (value.type === 'MemberExpression') {
            const field = value.computed ? value.property.value : value.property.name
            const definition = variableFor(unwrap(value.object))?.defs[0]
            if (field === 'data' && unwrap(definition?.node.init) === query) return true
            return queryRead(value.object, query, next)
          }
          const definition = variableFor(value)?.defs[0]
          return (
            definition?.parent?.kind === 'const' && queryRead(definition.node.init, query, next)
          )
        }
        const saveReadsQuery = (fn, save, query) => {
          let reads = false
          const inspect = (node) =>
            walk(node, (part) => {
              reads ||= queryRead(part, query)
            })
          inspect(save)
          for (let at = save.parent; at && at !== fn; at = at.parent)
            if (['IfStatement', 'ConditionalExpression'].includes(at.type)) inspect(at.test)
          return reads
        }
        const refreshAfter = (fn, save) => {
          let refresh = false
          walk(fn.body, (node) => {
            if (node.type !== 'CallExpression' || node.range[0] <= save.range[1]) return
            const state = states.get(variableFor(node.callee))
            if (!state) return
            refresh ||= state.variable.references.some((reference) => {
              let at = reference.identifier.parent
              while (at && !isFunction(at)) {
                if (
                  at.type === 'CallExpression' &&
                  /^use[A-Z]/.test(callName(at) ?? '') &&
                  !['useState', 'useRef', 'useMemo', 'useCallback', 'useEffect'].includes(
                    callName(at),
                  ) &&
                  saveReadsQuery(fn, save, at)
                )
                  return true
                at = at.parent
              }
              return false
            })
          })
          return refresh
        }
        const oppositeRequests = (branch) => {
          if (branch.type !== 'IfStatement' || !branch.alternate) return false
          const methods = (body) => {
            const result = new Set()
            walk(body, (part) => {
              if (persistenceCall(part)) result.add(callName(part)?.toUpperCase())
            })
            return result
          }
          const yes = methods(branch.consequent)
          const no = methods(branch.alternate)
          return ['POST', 'PUT', 'PATCH'].some(
            (write) => (yes.has('DELETE') && no.has(write)) || (no.has('DELETE') && yes.has(write)),
          )
        }
        // A controller orders saves, but cannot fix a transport that uses the desired value
        // backwards. For an imported two-verb action, show the actual choice before offering
        // any rewrite. Some flags explicitly mean removal, so the direction is advisory.
        const deletionFirstAdvice = (save) => {
          if (save.type !== 'CallExpression') return null
          const writer = importedWriter(save, unwrap(save.callee))
          if (!writer) return null
          const samePath = (left, right) => {
            if (left?.type === 'Literal')
              return typeof left.value === 'string' && right?.value === left.value
            if (left?.type !== 'Identifier' || right?.type !== 'Identifier') return false
            const binding = writer.findBinding(left)
            return binding && binding === writer.findBinding(right)
          }
          let branch
          walk(writer.fn.body, (node) => {
            if (
              branch ||
              node.type !== 'ConditionalExpression' ||
              !writer.selectsDesired(node.test)
            )
              return
            const remove = unwrap(node.consequent)
            const add = unwrap(node.alternate)
            if (
              callName(remove) === 'delete' &&
              callName(add) === 'post' &&
              remove.arguments?.length === 1 &&
              add.arguments?.length === 1 &&
              samePath(remove.arguments[0], add.arguments[0]) &&
              persistenceCall(remove, new Set(), writer.findBinding) &&
              persistenceCall(add, new Set(), writer.findBinding)
            )
              branch = node
          })
          if (!branch) return null
          const location = `${relative(context.cwd, writer.filename)}:${branch.loc.start.line}`
          return `${location} sends DELETE for true and POST for false at the same path. Check the API's direction before moving this call into commit. If POST sets the flag and DELETE clears it, use the generated resource setter or createQueryResource().toggle(viewer, id, action, desired) with the desired boolean. If true means removal in this API, keep that mapping and test both directions.`
        }
        // The rewrite uses the component's own state, updater, request and response reads.
        // It is advice, never an automatic edit: auth guards and app-specific callbacks stay.
        const rewriteFor = (fn, save) => {
          const actionAdvice = deletionFirstAdvice(save)
          if (actionAdvice) return actionAdvice
          let unverifiedResource = null
          const fromSave = (expression, seen = new Set()) => {
            const node = unwrap(expression)
            if (!node) return false
            if (node.range[0] <= save.range[0] && node.range[1] >= save.range[1]) return true
            const variable = variableFor(node)
            if (!variable || seen.has(variable) || seen.size >= 8) return false
            seen.add(variable)
            const definition = variable.defs[0]
            if (definition?.type === 'Variable' && definition.parent?.kind === 'const')
              return fromSave(definition.node.init, seen)
            const callback = definition?.type === 'Parameter' ? variable.scope.block : null
            const then = callback?.parent
            return !!(
              then?.type === 'CallExpression' &&
              then.arguments[0] === callback &&
              callback.params[0] === definition.name &&
              callName(then) === 'then' &&
              fromSave(then.callee.object, seen)
            )
          }
          walk(
            fn.body,
            (node) => {
              if (node.type !== 'CallExpression' || node.parent?.type !== 'VariableDeclarator')
                return
              if (!fromSave(node.arguments[0])) return
              const definition = variableFor(node.callee)?.defs[0]
              if (
                definition?.type === 'ImportBinding' &&
                definition.parent?.source?.value === '@molecule/app-http' &&
                (definition.node.imported?.name ?? definition.node.imported?.value) ===
                  'unwrapSingle'
              )
                unverifiedResource = context.sourceCode.getText(node)
            },
            true,
          )
          if (unverifiedResource)
            return `First verify the saved resource read by ${unverifiedResource}. unwrapSingle unwraps data, not named resource keys: a response body { record: value } remains { record: value }. If the API uses a named envelope, select its actual field before notifying the parent or returning confirmed values. For a bare resource body, keep that resource directly. This single-file scan cannot prove that field, so it cannot supply a runnable migration for this save. Then move the verified save into useOptimisticValue, keep the control mounted, and key it by record identity.`
          if (writesBefore(fn, save).some(({ state }) => state.seed?.type === 'ObjectExpression'))
            return 'Queue clicks with the generated toggle hook or useOptimisticValue. Its commit chooses the request from the desired field value and returns the saved result. Preserve auth checks and the response shape. Verify both directions with a delayed first response.'
          const writes = writesBefore(fn, save)
          const selected = [...new Map(writes.map((write) => [write.state.setter, write])).values()]
          if (!selected.length)
            return 'Move the optimistic state and this save into the hook; keep auth/loading guards, but remove pending guards.'
          // A row parameter cannot be lifted into a component hook. A UI event used only
          // for propagation/default handling stays in the click handler, though: it is
          // neither a save dependency nor a record identity (and needs no extracted row).
          const parameterReads = context.sourceCode.getDeclaredVariables(fn).filter(
            (variable) =>
              variable.defs.some((definition) => definition.type === 'Parameter') &&
              variable.references.some((reference) => {
                if (!reference.isRead()) return false
                const member = reference.identifier.parent
                const call = member?.parent
                const statement = call?.parent
                return !(
                  member?.type === 'MemberExpression' &&
                  member.object === reference.identifier &&
                  !member.computed &&
                  ['preventDefault', 'stopPropagation'].includes(member.property.name) &&
                  call?.type === 'CallExpression' &&
                  call.callee === member &&
                  statement?.type === 'ExpressionStatement' &&
                  statement.range[1] < save.range[0]
                )
              }),
          )
          if (parameterReads.length)
            return `In this component, move ${selected.map(({ state }) => state.name).join(', ')} out of the per-click setters (${selected.map(({ state }) => state.setter.name).join(', ')}). The handler reads ${parameterReads.map((variable) => variable.name).join(', ')}, which is not available at the hook call site: keep event handling in the click handler, pass the desired data to update, or extract a control keyed by record identity. Put its server-backed fields in useOptimisticValue and move this request into commit: ${context.sourceCode.getText(save)}. Render the hook's value and use a functional update so each click starts from the latest intent. Keep auth/initial-loading guards, remove pending guards, and return the saved flag and count from commit.`
          const allNames = new Set(
            context.sourceCode.getScope(fn).variables.map((variable) => variable.name),
          )
          for (const scope of context.sourceCode.scopeManager.scopes)
            for (const variable of scope.variables) allNames.add(variable.name)
          const fresh = (base) => {
            let name = base
            while (allNames.has(name)) name += 'Value'
            allNames.add(name)
            return name
          }
          const controller = fresh('optimisticValue')
          const desired = fresh('desiredValue')
          const current = fresh('currentValue')
          const confirmed = fresh('confirmedValue')
          const held = toggledNames(fn)
          const aliases = new Map()
          for (const { state, argument } of selected) {
            if (unwrap(argument)?.type === 'Identifier' && held.has(variableFor(unwrap(argument))))
              aliases.set(variableFor(unwrap(argument)), state.name)
            if (unwrap(argument)?.type === 'ObjectExpression')
              for (const property of unwrap(argument).properties) {
                if (
                  property.type === 'Property' &&
                  unwrap(property.value)?.type === 'Identifier' &&
                  held.has(variableFor(unwrap(property.value)))
                )
                  aliases.set(
                    variableFor(unwrap(property.value)),
                    `${state.name}.${property.key.name ?? property.key.value}`,
                  )
              }
          }
          const stateReads = new Map(selected.map(({ state }) => [state.variable, state.name]))
          const scalarFlips = new Set(
            selected
              .filter(({ argument }) => {
                const value = unwrap(argument)
                if (negatedRead(value) || aliases.has(variableFor(value))) return true
                if (!isFunction(value)) return false
                const result =
                  value.body.type === 'BlockStatement'
                    ? value.body.body.find((statement) => statement.type === 'ReturnStatement')
                        ?.argument
                    : value.body
                return (
                  negatedRead(result) &&
                  variableFor(unwrap(unwrap(result).argument)) === variableFor(value.params[0])
                )
              })
              .map(({ state }) => state.variable),
          )
          const render = (node, mode, parameter, field) => {
            const replacements = []
            const visit = (part) => {
              if (!part || typeof part.type !== 'string') return
              if (mode === 'commit' && part.type === 'CallExpression') {
                const state = selected.find(
                  ({ state }) => state.setter === variableFor(part.callee),
                )?.state
                if (state && part.arguments[0]) {
                  const argument = unwrap(part.arguments[0])
                  const value = isFunction(argument)
                    ? `(${render(argument, mode)})(${confirmed}.${state.name})`
                    : render(argument, mode)
                  replacements.push([
                    part.range[0],
                    part.range[1],
                    `${confirmed} = { ...${confirmed}, ${state.name}: ${value} }`,
                  ])
                  return
                }
                if (
                  part.callee.type === 'MemberExpression' &&
                  ['catch', 'finally'].includes(callName(part))
                ) {
                  replacements.push([
                    part.range[0],
                    part.range[1],
                    render(part.callee.object, mode),
                  ])
                  return
                }
              }
              if (mode === 'commit' && negatedRead(part)) {
                const read = unwrap(unwrap(part).argument)
                const variable =
                  read.type === 'Identifier' ? variableFor(read) : variableFor(read.object)
                if (stateReads.has(variable)) {
                  const suffix = read.type === 'MemberExpression' ? `.${read.property.name}` : ''
                  replacements.push([
                    part.range[0],
                    part.range[1],
                    `${desired}.${stateReads.get(variable)}${suffix}`,
                  ])
                  return
                }
              }
              if (part.type === 'Identifier') {
                const variable = variableFor(part)
                // Only reads: object keys, declarations and member names are not variable reads.
                if (
                  variable?.references.some(
                    (reference) => reference.identifier === part && reference.isRead(),
                  )
                ) {
                  let value
                  if (parameter && variable === parameter) value = `${current}.${field}`
                  else if (mode === 'commit' && aliases.has(variable))
                    value = `${desired}.${aliases.get(variable)}`
                  else if (stateReads.has(variable)) {
                    value = `${mode === 'commit' ? desired : current}.${stateReads.get(variable)}`
                    if (mode === 'commit' && scalarFlips.has(variable)) value = `!${value}`
                  }
                  if (value)
                    replacements.push([
                      part.range[0],
                      part.range[1],
                      part.parent?.type === 'Property' && part.parent.shorthand
                        ? `${part.name}: ${value}`
                        : value,
                    ])
                }
              }
              for (const key of context.sourceCode.visitorKeys[part.type] ?? []) {
                const value = part[key]
                if (Array.isArray(value)) value.forEach(visit)
                else visit(value)
              }
            }
            visit(node)
            let text = context.sourceCode.getText(node)
            for (const [start, end, value] of replacements.sort((a, b) => b[0] - a[0]))
              text = text.slice(0, start - node.range[0]) + value + text.slice(end - node.range[0])
            return text
          }
          let statement = save
          while (statement.parent && statement.parent.type !== 'BlockStatement')
            statement = statement.parent
          const block = statement.parent
          const success =
            block?.type === 'BlockStatement' ? block.body.slice(block.body.indexOf(statement)) : []
          const commitLines = success.map((line) => {
            if (line.type === 'ReturnStatement' && line.argument)
              return `await ${render(line.argument, 'commit')};`
            const expression = line.type === 'ExpressionStatement' && unwrap(line.expression)
            const chain = ['then', 'catch', 'finally'].includes(callName(expression))
            return `${chain && line.expression.type !== 'AwaitExpression' ? 'await ' : ''}${render(line, 'commit')}`
          })
          // Carry declarations the request uses (endpoint/path/etc.), but not toggled aliases.
          const declarations = []
          walk(fn.body, (node) => {
            if (
              node.type === 'VariableDeclaration' &&
              node.range[1] < statement.range[0] &&
              node.declarations.every(
                (declaration) =>
                  declaration.id.type === 'Identifier' && !held.has(variableFor(declaration.id)),
              )
            )
              declarations.push(render(node, 'commit'))
          })
          const updates = selected.map(({ state, argument }) => {
            const update = unwrap(argument)
            return `${state.name}: ${isFunction(update) ? `(${render(update, 'update')})(${current}.${state.name})` : render(argument, 'update')}`
          })
          const updateLocals = new Set()
          const collectLocals = (node) =>
            walk(
              node,
              (part) => {
                const variable = variableFor(part)
                const declaration = variable?.defs[0]?.node
                if (
                  declaration?.type !== 'VariableDeclarator' ||
                  !declaration.init ||
                  enclosingFunction(declaration) !== fn ||
                  updateLocals.has(declaration)
                )
                  return
                updateLocals.add(declaration)
                collectLocals(declaration.init)
              },
              true,
            )
          for (const { argument } of selected) collectLocals(argument)
          const aliasesForUpdate = [...updateLocals]
            .sort((a, b) => a.range[0] - b.range[0])
            .map((node) => {
              const field = aliases.get(variableFor(node.id))
              return `const ${node.id.name} = ${field ? `!${current}.${field}` : render(node.init, 'update')};`
            })
          // A null local override can display a loaded server flag via `override ?? record.flag`.
          // Seed the controller from that same view, otherwise it remains null forever.
          const fallbackSeeds = new Map()
          for (const { state } of selected) {
            if (state.seed?.type !== 'Literal' || state.seed.value !== null) continue
            const fallbacks = state.variable.references.flatMap((reference) => {
              const node = reference.identifier.parent
              return node?.type === 'LogicalExpression' &&
                node.operator === '??' &&
                variableFor(unwrap(node.left)) === state.variable &&
                enclosingFunction(node) === enclosingFunction(fn)
                ? [context.sourceCode.getText(node)]
                : []
            })
            if (new Set(fallbacks).size === 1) fallbackSeeds.set(state.variable, fallbacks[0])
          }
          const seeds = selected.map(
            ({ state }) =>
              `${state.name}: ${fallbackSeeds.get(state.variable) ?? (state.seed && state.seed.type !== 'Literal' ? (isFunction(state.seed) ? `(${context.sourceCode.getText(state.seed)})()` : context.sourceCode.getText(state.seed)) : state.name)}`,
          )
          const kept = selected.filter(({ state }) => !state.seed || state.seed.type === 'Literal')
          const nullable = kept.filter(({ state }) => state.seed?.value === null)
          const guard = nullable.map(
            ({ state }) => `if (${desired}.${state.name} == null) return ${desired};`,
          )
          return `Rewrite the state in this component (keep auth/initial-loading checks):\n\`\`\`tsx\nconst ${controller} = useOptimisticValue({\n  value: { ${seeds.join(', ')} },\n  commit: async (${desired}) => {\n    ${guard.join('\n    ')}\n    let ${confirmed} = ${desired};\n    ${[...declarations, ...commitLines].join('\n    ')}\n    return ${confirmed};\n  },\n});\n${selected.map(({ state }) => `const ${kept.some((entry) => entry.state === state) ? `optimistic${state.name[0].toUpperCase()}${state.name.slice(1)}` : state.name} = ${controller}.value.${state.name};`).join('\n')}\n// In the click handler, replace its local setters/save/rollback with:\n${controller}.update((${current}) => {\n  ${nullable.map(({ state }) => `if (${current}.${state.name} == null) return ${current};`).join('\n  ')}\n  ${aliasesForUpdate.join('\n  ')}\n  return { ${updates.join(', ')} };\n});\n\`\`\`\nRemove the pending guard/disabled-on-pending flag and effects that copy props into the replaced display setters (${selected.map(({ state }) => state.setter.name).join(', ')}). ${kept.length ? 'Keep the original query state/setter for loading server data. Use the optimistic alias above for rendering AND loading guards; do not clear an already-loaded record before a same-record refetch, and keep its control mounted. ' : ''}Let commit reject on failure. Key the mounted control by record identity, and render/enable it only after its initial record loads.`
        }
        // Shown at once: a setter called with the toggled value before the save starts
        // (`setFavorited(next)`, `setItems((prev) => … !item.checked …)`). An awaited response
        // applied by the setter is the save itself, so the walk stops at `await`. A toggle that
        // waits for the server before it changes what is shown cannot flip back.
        const shownBefore = (fn, held, save) => {
          let found = false
          const mentionsToggle = (node) => {
            if (found || !node || typeof node.type !== 'string') return
            if (node.type === 'AwaitExpression') return
            if (toggled(node, held)) {
              found = true
              return
            }
            for (const key of Object.keys(node)) {
              if (key === 'parent') continue
              const value = node[key]
              if (Array.isArray(value)) value.forEach(mentionsToggle)
              else if (value && typeof value.type === 'string') mentionsToggle(value)
            }
          }
          const visit = (node) => {
            if (found || !node || typeof node.type !== 'string') return
            if (isFunction(node)) return
            if (
              node.type === 'CallExpression' &&
              node.callee.type === 'Identifier' &&
              setters.has(variableFor(node.callee)) &&
              node.range[0] < save.range[0]
            )
              node.arguments.forEach(mentionsToggle)
            for (const key of Object.keys(node)) {
              if (key === 'parent') continue
              const value = node[key]
              if (Array.isArray(value)) value.forEach(visit)
              else if (value && typeof value.type === 'string') visit(value)
            }
          }
          visit(fn.body)
          return found
        }
        return {
          VariableDeclarator(node) {
            const callee = node.init?.type === 'CallExpression' ? node.init.callee : null
            const hook =
              callee?.type === 'Identifier'
                ? callee.name
                : callee?.type === 'MemberExpression'
                  ? callee.property.name
                  : null
            if (hook !== 'useState' || node.id.type !== 'ArrayPattern') return
            const setter = node.id.elements[1]
            if (setter?.type === 'Identifier') {
              const variable = variableFor(setter)
              setters.add(variable)
              const value = node.id.elements[0]
              if (value?.type === 'Identifier')
                states.set(variable, {
                  setter: variable,
                  variable: variableFor(value),
                  name: value.name,
                  seed: node.init.arguments[0],
                })
            }
          },
          ImportDeclaration(node) {
            if (node.source.value === 'react') reactModule = true
            for (const specifier of node.specifiers) {
              const name = specifier.imported?.name ?? specifier.local?.name
              if (helpers.has(name)) helpers.add(specifier.local.name)
            }
          },
          JSXAttribute(node) {
            if (node.name.name !== 'onSubmit') return
            const fn = functionFor(node.value?.expression)
            const collect = (handler) => {
              if (!handler || submitHandlers.has(handler)) return
              submitHandlers.add(handler)
              const visit = (node) => {
                if (!node || typeof node.type !== 'string' || isFunction(node)) return
                if (node.type === 'CallExpression') collect(functionFor(node.callee))
                for (const key of Object.keys(node)) {
                  if (key === 'parent') continue
                  const value = node[key]
                  if (Array.isArray(value)) value.forEach(visit)
                  else if (value && typeof value.type === 'string') visit(value)
                }
              }
              visit(handler.body)
            }
            collect(fn)
          },
          JSXElement() {
            reactModule = true
          },
          JSXFragment() {
            reactModule = true
          },
          CallExpression(node) {
            candidates.push({ kind: 'call', node })
            if (callName(node) === 'useEffect') {
              const effect = functionFor(node.arguments[0])
              if (effect) effects.push(effect)
            }
            if (helpers.has(callName(node))) {
              const options = unwrap(node.arguments[0])
              if (options?.type === 'ObjectExpression') {
                for (const property of options.properties) {
                  if (property.type !== 'Property') continue
                  const key = property.key.name ?? property.key.value
                  if (key !== 'commit') continue
                  const fn = functionFor(property.value)
                  if (fn) helperCommits.add(fn)
                }
              }
            }
          },
          ConditionalExpression(node) {
            candidates.push({ kind: 'choice', node })
          },
          Property(node) {
            const key = node.key.type === 'Identifier' ? node.key.name : node.key.value
            if (key !== 'method' || node.value.type !== 'ConditionalExpression') return
            const methods = [node.value.consequent, node.value.alternate].map(methodLiteral)
            if (
              methods.includes('DELETE') &&
              methods.some((method) => ['POST', 'PUT', 'PATCH'].includes(method))
            )
              candidates.push({ kind: 'method', node })
          },
          'Program:exit'() {
            if (!reactModule) return
            const reported = new Set()
            const names = new Map()
            const namesFor = (fn) => {
              if (!names.has(fn)) names.set(fn, toggledNames(fn))
              return names.get(fn)
            }
            for (const { kind, node } of candidates) {
              const fn = enclosingFunction(node)
              if (
                !fn ||
                reported.has(fn) ||
                submitHandlers.has(fn) ||
                helperCommits.has(fn) ||
                serialized(fn)
              )
                continue
              if (!shownBefore(fn, namesFor(fn), node)) continue
              let hit = false
              const refetch = kind === 'call' && refreshAfter(fn, node)
              if (kind === 'method') {
                const object = node.parent
                const usedAsRequestOptions = (expression) => {
                  const request = expression.parent
                  return (
                    persistenceCall(request) &&
                    request.arguments.includes(expression) &&
                    promiseUsed(request, fn)
                  )
                }
                if (object?.type === 'ObjectExpression') {
                  hit = usedAsRequestOptions(object)
                  if (!hit && object.parent?.type === 'VariableDeclarator') {
                    const variable = variableFor(object.parent.id)
                    hit = (variable?.references ?? []).some((reference) =>
                      usedAsRequestOptions(reference.identifier),
                    )
                  }
                }
              }
              if (kind === 'call') {
                const held = namesFor(fn)
                hit =
                  persistenceCall(node) &&
                  (node.arguments.some(
                    (argument) =>
                      toggled(argument, held) ||
                      (argument.type === 'ObjectExpression' &&
                        argument.properties.some(
                          (property) =>
                            selfToggle(property) ||
                            (property.type === 'Property' && toggled(property.value, held)),
                        )),
                  ) ||
                    droppedOrRefetched(fn, node) ||
                    (() => {
                      let branch = node.parent
                      while (branch && branch !== fn) {
                        if (
                          ['IfStatement', 'ConditionalExpression'].includes(branch.type) &&
                          ((refetch && oppositeRequests(branch)) ||
                            [...states.values()].some((state) =>
                              state.variable.references.some(
                                (reference) =>
                                  reference.identifier.range[0] >= branch.test.range[0] &&
                                  reference.identifier.range[1] <= branch.test.range[1],
                              ),
                            ))
                        )
                          return true
                        branch = branch.parent
                      }
                      return false
                    })()) &&
                  promiseUsed(node, fn)
              }
              if (kind === 'choice') {
                const branches = [node.consequent, node.alternate].map(unwrap)
                const methods = branches.map((branch) => callName(branch)?.toUpperCase())
                const deleteAndWrite =
                  methods.includes('DELETE') &&
                  methods.some((method) => ['POST', 'PUT', 'PATCH'].includes(method))
                hit =
                  (toggled(unwrap(node.test), namesFor(fn)) || deleteAndWrite) &&
                  branches.every((branch) => persistenceCall(branch)) &&
                  (promiseUsed(node, fn) ||
                    [node.consequent, node.alternate].every(
                      (branch) => branch.type === 'AwaitExpression',
                    ))
              }
              if (!hit) continue
              reported.add(fn)
              context.report({
                node,
                messageId: 'useOptimisticValue',
                data: { rewrite: rewriteFor(fn, node) },
              })
            }
          },
        }
      },
    },
    // A `<button type="button">` with no handler does nothing when pressed: `type="button"`
    // switches off the one thing a button does by itself (submit its form). It is usually a
    // placeholder drawn for the layout while the component that owns the action was written
    // elsewhere and never rendered here. Structural only: the element's own attributes and its
    // JSX ancestors in this file. Anything that can give the button behaviour from outside this
    // element keeps the rule quiet: spread props, a ref, a native invoker attribute, a `data-*`
    // attribute (a script may bind by it), a permanently unavailable control, or an ancestor
    // with its own event handler (delegation).
    'buttons-have-an-action': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Report a `<button type="button">` that has no way to do anything.',
        },
        schema: [],
        messages: {
          inert:
            'No action or external binding hook is declared on this type=button element or its local JSX ancestors. Add its handler, props/ref, or an explicit external binding hook. If a containing component owns delegation, document that at this element.',
        },
      },
      create(context) {
        const nameOf = (attribute) =>
          attribute.type === 'JSXAttribute'
            ? attribute.name.type === 'JSXNamespacedName'
              ? `${attribute.name.namespace.name}:${attribute.name.name.name}`
              : attribute.name.name
            : null
        const handles = (name) => /^on[A-Z]/.test(name)
        // Native ways a button acts with no script, and hooks a script outside React binds by.
        const external = (name) =>
          name === 'id' ||
          name === 'ref' ||
          name === 'disabled' ||
          name === 'aria-disabled' ||
          name === 'form' ||
          name === 'formAction' ||
          /^popovertarget/i.test(name) ||
          /^command(for)?$/i.test(name) ||
          name.startsWith('data-')
        return {
          JSXOpeningElement(node) {
            if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'button') return
            let explicitButton = false
            for (const attribute of node.attributes) {
              const name = nameOf(attribute)
              // Spread props can carry a handler this file cannot see.
              if (name === null || handles(name) || external(name)) return
              if (
                name === 'type' &&
                attribute.value?.type === 'Literal' &&
                attribute.value.value === 'button'
              )
                explicitButton = true
            }
            // Without an explicit type the button may submit a form rendered by a parent.
            if (!explicitButton) return
            for (let parent = node.parent.parent; parent; parent = parent.parent) {
              if (parent.type !== 'JSXElement') continue
              if (
                parent.openingElement.attributes.some((attribute) => {
                  const name = nameOf(attribute)
                  return name === null || handles(name)
                })
              )
                return
              const tag = parent.openingElement.name
              // A label forwards its click, and a summary toggles its details.
              if (tag.type === 'JSXIdentifier' && (tag.name === 'label' || tag.name === 'summary'))
                return
            }
            context.report({
              node,
              messageId: 'inert',
            })
          },
        }
      },
    },
    // A hand-written copy of the query hook. X1 P317: all 8 projects shipped a typed resource
    // module on the shared query cache and 7 of 8 runs wrote `useAsync(loader, deps)` /
    // `useFetch(load, deps)` instead — a hook that calls a loader it is handed inside an effect
    // and keeps the answer in component state. That is `useQuery` without the cache: two
    // components showing one record fetch it twice, and a write elsewhere leaves this copy stale.
    // Structural: a function named use*, one of whose PARAMETERS is called inside its
    // `useEffect` (directly, or through a ref it was stored in), with a `useState` setter called
    // in that effect. A hook that fetches a fixed thing, debounces, or measures the window never
    // calls a parameter there. Enabled only where @molecule/app-query-react is declared.
    'fetch-hooks-use-the-query-cache': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Report a hook that runs a loader it is handed in an effect and keeps the result in state, where the shared query cache is declared.',
        },
        schema: [],
        messages: {
          useQuery:
            '`{{name}}` awaits a loader in an effect and stores its result in component state. This workspace declares @molecule/app-query-react. If the loader reads shared server data, use useQuery for shared requests and invalidation; keep measurement, subscription and side-effect hooks local.',
        },
      },
      create(context) {
        const source = context.sourceCode
        const isFunction = (node) =>
          node?.type === 'FunctionDeclaration' ||
          node?.type === 'FunctionExpression' ||
          node?.type === 'ArrowFunctionExpression'
        const nameOf = (node) =>
          node.id?.type === 'Identifier'
            ? node.id.name
            : node.parent?.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier'
              ? node.parent.id.name
              : ''
        const walk = (node, visit) => {
          if (!node || typeof node.type !== 'string') return
          visit(node)
          for (const key of Object.keys(node)) {
            if (key === 'parent') continue
            const value = node[key]
            if (Array.isArray(value)) for (const child of value) walk(child, visit)
            else if (value && typeof value.type === 'string') walk(value, visit)
          }
        }
        const check = (node) => {
          const name = nameOf(node)
          if (!/^use[A-Z]/.test(name) || node.body?.type !== 'BlockStatement') return
          const params = new Set(
            node.params.filter((param) => param.type === 'Identifier').map((param) => param.name),
          )
          if (params.size === 0) return
          // Refs that hold a parameter (`const loadRef = useRef(load)`) and state setters.
          const refs = new Set()
          const setters = new Set()
          for (const statement of node.body.body) {
            if (statement.type !== 'VariableDeclaration') continue
            for (const declaration of statement.declarations) {
              const call = declaration.init
              if (call?.type !== 'CallExpression' || call.callee.type !== 'Identifier') continue
              if (
                call.callee.name === 'useRef' &&
                declaration.id.type === 'Identifier' &&
                call.arguments[0]?.type === 'Identifier' &&
                params.has(call.arguments[0].name)
              )
                refs.add(declaration.id.name)
              if (
                call.callee.name === 'useState' &&
                declaration.id.type === 'ArrayPattern' &&
                declaration.id.elements[1]?.type === 'Identifier'
              )
                setters.add(declaration.id.elements[1].name)
            }
          }
          if (setters.size === 0) return
          for (const statement of node.body.body) {
            const call = statement.type === 'ExpressionStatement' ? statement.expression : null
            if (
              call?.type !== 'CallExpression' ||
              call.callee.type !== 'Identifier' ||
              call.callee.name !== 'useEffect' ||
              !isFunction(call.arguments[0])
            )
              continue
            const binding = (id) => {
              if (id?.type !== 'Identifier') return null
              for (let scope = source.getScope(id); scope; scope = scope.upper) {
                const found = scope.set.get(id.name)
                if (found) return found
              }
              return null
            }
            const parameters = new Set(
              node.params.filter((param) => param.type === 'Identifier').map(binding),
            )
            const loaderCall = (expression) =>
              expression?.type === 'CallExpression' &&
              ((expression.callee.type === 'Identifier' &&
                parameters.has(binding(expression.callee))) ||
                (expression.callee.type === 'MemberExpression' &&
                  expression.callee.property.name === 'current' &&
                  refs.has(expression.callee.object.name)))
            const resultFromLoader = (expression, seen = new Set()) => {
              if (!expression || seen.has(expression)) return false
              seen.add(expression)
              if (expression.type === 'AwaitExpression') return loaderCall(expression.argument)
              if (expression.type === 'Identifier') {
                const definition = binding(expression)?.defs[0]
                if (definition?.type === 'Variable')
                  return resultFromLoader(definition.node.init, seen)
                if (definition?.type === 'Parameter') {
                  const fn = definition.node,
                    owner = fn.parent
                  return (
                    owner?.type === 'CallExpression' &&
                    owner.callee.type === 'MemberExpression' &&
                    owner.callee.property.name === 'then' &&
                    loaderCall(owner.callee.object) &&
                    fn.params[0] === definition.name
                  )
                }
                return false
              }
              if (expression.type === 'MemberExpression')
                return resultFromLoader(expression.object, seen)
              if (expression.type === 'ObjectExpression')
                return expression.properties.some((property) =>
                  resultFromLoader(property.value ?? property.argument, seen),
                )
              if (expression.type === 'ArrayExpression')
                return expression.elements.some((element) => resultFromLoader(element, seen))
              if (
                ['TSAsExpression', 'TSNonNullExpression', 'ChainExpression'].includes(
                  expression.type,
                )
              )
                return resultFromLoader(expression.expression, seen)
              return false
            }
            let storesLoaderResult = false
            walk(call.arguments[0].body, (inner) => {
              if (
                inner.type === 'CallExpression' &&
                inner.callee.type === 'Identifier' &&
                setters.has(inner.callee.name) &&
                inner.arguments.some((argument) => resultFromLoader(argument))
              )
                storesLoaderResult = true
            })
            if (!storesLoaderResult) continue
            context.report({
              node: node.id ?? node,
              messageId: 'useQuery',
              data: { name },
            })
            return
          }
        }
        return {
          FunctionDeclaration: check,
          FunctionExpression: check,
          ArrowFunctionExpression: check,
        }
      },
    },
    // A view the page reads from a query parameter that no link sets. X1 P317 l2400 read its
    // profile tab with `searchParams.get('tab') === 'favorites'` while the tab link went to
    // `/profile/:username/favorites`: the click changed the path, the comparison stayed false,
    // and the Favorited tab kept showing the author's own articles (navigation.spec.ts:200).
    // Narrow on purpose: one file, a comparison of a `useSearchParams()` read with a string
    // literal, nothing in the file that writes that parameter, and a link in the same file whose
    // path ends in that same literal. A parameter another file sets, or a view no link names by
    // path, stays quiet.
    'links-reach-the-view-they-select': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Report a view read from a query parameter that nothing in the file sets, while a link in the file goes to a path of the same name.',
        },
        schema: [],
        messages: {
          unreachable:
            'This link’s selected state reads `{{read}}` from `?{{key}}=`, while its target on line {{linkLine}} is `{{target}}`. If the target should select this view, align the expression with its path or set `?{{key}}={{value}}` in the link.',
        },
      },
      create(context) {
        const source = context.sourceCode
        const binding = (id) => {
          if (id?.type !== 'Identifier') return null
          for (let scope = source.getScope(id); scope; scope = scope.upper) {
            const found = scope.set.get(id.name)
            if (found) return found
          }
          return null
        }
        const urlFactory = (callee) => {
          const def = binding(callee)?.defs[0]
          return (
            def?.type === 'ImportBinding' &&
            def.parent.importKind !== 'type' &&
            def.node.importKind !== 'type' &&
            ['react-router', 'react-router-dom', '@molecule/app-routing-react-router'].includes(
              def.parent.source.value,
            ) &&
            def.node.imported?.name === 'useSearchParams'
          )
        }

        const text = source.getText()
        const readers = new Set()
        const reads = []
        const links = []
        const literal = (node) =>
          node?.type === 'Literal' && typeof node.value === 'string'
            ? node.value
            : node?.type === 'TemplateLiteral' && node.expressions.length === 0
              ? node.quasis[0].value.cooked
              : null
        // The static tail of a link target: the whole literal, or a template's last piece.
        const targetTail = (node) => {
          if (node?.type === 'JSXExpressionContainer') return targetTail(node.expression)
          if (node?.type === 'Literal' && typeof node.value === 'string') return node.value
          if (node?.type === 'TemplateLiteral')
            return node.quasis[node.quasis.length - 1].value.cooked
          return null
        }
        return {
          VariableDeclarator(node) {
            if (
              node.id.type === 'ArrayPattern' &&
              node.id.elements[0]?.type === 'Identifier' &&
              node.init?.type === 'CallExpression' &&
              node.init.callee.type === 'Identifier' &&
              urlFactory(node.init.callee)
            )
              readers.add(binding(node.id.elements[0]))
          },
          BinaryExpression(node) {
            if (!['===', '==', '!==', '!='].includes(node.operator)) return
            for (const [call, other] of [
              [node.left, node.right],
              [node.right, node.left],
            ]) {
              const value = literal(other)
              if (
                value === null ||
                value === '' ||
                call.type !== 'CallExpression' ||
                call.callee.type !== 'MemberExpression' ||
                call.callee.object.type !== 'Identifier' ||
                call.callee.property.type !== 'Identifier' ||
                call.callee.property.name !== 'get'
              )
                continue
              const key = literal(call.arguments[0])
              if (key === null || !/^[A-Za-z_][\w-]*$/.test(key) || !/^[\w-]+$/.test(value))
                continue
              reads.push({ node, reader: binding(call.callee.object), key, value })
            }
          },
          JSXAttribute(node) {
            if (node.name.type !== 'JSXIdentifier' || !['to', 'href'].includes(node.name.name))
              return
            const tail = targetTail(node.value)
            if (typeof tail === 'string') links.push({ node, tail })
          },
          'Program:exit'() {
            for (const read of reads) {
              if (!readers.has(read.reader)) continue
              // Anything that could write the parameter: `?tab=`, `.set('tab'`, `{ tab: … }`.
              const key = read.key.replace(/[-]/g, '\\$&')
              if (
                new RegExp(
                  '[?&`\'"]' +
                    key +
                    '=|\\.set\\(\\s*[\'"`]' +
                    key +
                    '[\'"`]|[{,]\\s*[\'"]?' +
                    key +
                    '[\'"]?\\s*:',
                ).test(text)
              )
                continue
              const owner =
                read.node.parent?.type === 'VariableDeclarator'
                  ? binding(read.node.parent.id)
                  : null
              const selected = (candidate) => {
                for (const attribute of candidate.node.parent?.attributes ?? []) {
                  if (
                    attribute.type !== 'JSXAttribute' ||
                    !['className', 'aria-current', 'aria-selected'].includes(attribute.name.name)
                  )
                    continue
                  const expression = attribute.value?.expression
                  let found = false
                  const visit = (node) => {
                    if (!node) return
                    if (
                      node === read.node ||
                      (owner && node.type === 'Identifier' && binding(node) === owner)
                    ) {
                      found = true
                      return
                    }
                    for (const key of source.visitorKeys[node.type] ?? []) {
                      const child = node[key]
                      if (Array.isArray(child)) child.forEach(visit)
                      else visit(child)
                    }
                  }
                  visit(expression)
                  if (found) return true
                }
                return false
              }
              const link = links.find(
                (candidate) =>
                  new RegExp('/' + read.value + '/?$').test(candidate.tail.split(/[?#]/)[0]) &&
                  selected(candidate),
              )
              if (!link) continue
              context.report({
                node: read.node,
                messageId: 'unreachable',
                data: {
                  read: source.getText(read.node),
                  key: read.key,
                  value: read.value,
                  linkLine: link.node.loc.start.line,
                  target: link.tail,
                },
              })
            }
          },
        }
      },
    },
    // A branch rendered while a loaded record is missing may not sit in the same parent
    // element as markup that shows a field of that record. Both anchors are local AST facts:
    // data the page waits for (a hook result or state set in an effect), and a displayed field.
    // Inspect chained ternaries and sibling guards, including query.data and query.status tests. A
    // component or live-region placeholder has the same placement defect as host text.
    'placeholders-stay-out-of-record-fields': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Report a waiting or error message rendered in the same element as a field of the record it waits for.',
        },
        schema: [],
        messages: {
          sameElement:
            'While `{{record}}` is missing this branch renders inside the same parent element as `{{field}}` (line {{fieldLine}}), so a reader can get the placeholder as the field value. Render the waiting or error message outside the region that shows `{{record}}` (return it before this markup, or put it beside the whole region), and render nothing here until `{{record}}` exists.',
          sameRegion:
            'This waiting text and `{{field}}` (line {{fieldLine}}) share <{{tag}}> {{region}} (line {{regionLine}}) while `{{record}}` is missing. A reader of that region can get the placeholder as the field value. Render the waiting or error message outside the region that shows `{{record}}`.',
        },
      },
      create(context) {
        const tagOf = (node) =>
          node?.type === 'JSXElement' &&
          node.openingElement.name.type === 'JSXIdentifier' &&
          /^[a-z]/.test(node.openingElement.name.name)
            ? node.openingElement.name.name
            : null
        const unwrap = (node) =>
          ['ChainExpression', 'TSNonNullExpression', 'TSAsExpression'].includes(node?.type)
            ? unwrap(node.expression)
            : node
        const pathOf = (node) => {
          node = unwrap(node)
          if (node?.type === 'Identifier') return { identifier: node, path: [] }
          if (node?.type !== 'MemberExpression' || node.computed) return null
          const object = pathOf(node.object)
          return object ? { ...object, path: [...object.path, node.property.name] } : null
        }
        // A field's own truthiness is not record availability (`q.data.draft` stays quiet).
        const recordOf = (node) => {
          const record = pathOf(node)
          return record &&
            (record.path.length === 0 || (record.path.length === 1 && record.path[0] === 'data'))
            ? record
            : null
        }
        const presence = (test) => {
          test = unwrap(test)
          const record = recordOf(test)
          if (record) return { ...record, present: true, other: false }
          if (test.type === 'UnaryExpression' && test.operator === '!') {
            const inner = presence(test.argument)
            return inner ? { ...inner, present: inner.other, other: inner.present } : null
          }
          if (test.type === 'LogicalExpression' && test.operator === '&&')
            return presence(test.left) ?? presence(test.right)
          if (test.type === 'BinaryExpression' && /^[!=]==?$/.test(test.operator)) {
            const empty = (side) =>
              (side.type === 'Literal' && side.value === null) ||
              (side.type === 'Identifier' && side.name === 'undefined')
            const subject = empty(test.right) ? test.left : empty(test.left) ? test.right : null
            const compared = recordOf(subject)
            if (compared)
              return {
                ...compared,
                present: test.operator[0] === '!',
                other: test.operator[0] === '=',
              }
            const status = pathOf(test.left) ?? pathOf(test.right)
            const value = test.left.type === 'Literal' ? test.left.value : test.right.value
            if (
              status?.path.length === 1 &&
              status.path[0] === 'status' &&
              ['idle', 'pending', 'loading', 'error', 'success'].includes(value)
            )
              return {
                ...status,
                path: ['data'],
                // A non-error status can still be pending. Preserve an enclosing data test's
                // absence on that arm instead of treating "not error" as "record loaded".
                present:
                  test.operator[0] === '='
                    ? value === 'success'
                    : value === 'success'
                      ? false
                      : null,
                other:
                  test.operator[0] === '!'
                    ? value === 'success'
                    : value === 'success'
                      ? false
                      : null,
              }
          }
          return null
        }
        // Every reference to the record inside a node, as the AST has it: a word inside a string
        // ("This profile does not exist") is not a read.
        const sameRecord = (node, record) => {
          const candidate = pathOf(node)
          return (
            candidate &&
            variableOf(candidate.identifier) === record.variable &&
            candidate.path.join('.') === record.path.join('.')
          )
        }
        const references = (node, record, found = []) => {
          if (!node || typeof node.type !== 'string') return found
          if (sameRecord(node, record)) found.push(node)
          for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
            // `other.profile` names a property, not the record.
            if (key === 'property' && node.type === 'MemberExpression' && !node.computed) continue
            const child = node[key]
            if (Array.isArray(child)) for (const item of child) references(item, record, found)
            else references(child, record, found)
          }
          return found
        }
        const reads = (node, record) => references(node, record).length > 0
        const rendersMarkup = (node) => {
          if (!node || typeof node.type !== 'string') return false
          if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true
          return (context.sourceCode.visitorKeys[node.type] ?? []).some((key) => {
            const child = node[key]
            return Array.isArray(child) ? child.some(rendersMarkup) : rendersMarkup(child)
          })
        }
        // The member of the record a text element shows, e.g. `profile.bio`.
        const fieldShown = (element, record) => {
          for (const child of element.children) {
            // A collection mapped to JSX renders rows, not this record's text field.
            if (child.type !== 'JSXExpressionContainer' || rendersMarkup(child.expression)) continue
            for (const reference of references(child.expression, record)) {
              const member = reference.parent
              let control = false
              for (
                let current = reference;
                current !== child.expression;
                current = current.parent
              ) {
                if (
                  current.parent?.type === 'ConditionalExpression' &&
                  current.parent.test === current
                ) {
                  control = true
                  break
                }
              }
              if (
                !control &&
                member.type === 'MemberExpression' &&
                member.object === reference &&
                !member.computed &&
                !(member.parent.type === 'CallExpression' && member.parent.callee === member)
              )
                return `${record.name}.${member.property.name}`
            }
          }
          return null
        }
        const BUILT_IN = new Set([
          'useState',
          'useReducer',
          'useRef',
          'useMemo',
          'useCallback',
          'useId',
          'useTransition',
          'useDeferredValue',
          'useAuth',
        ])
        const variableOf = (identifier) => {
          for (let scope = context.sourceCode.getScope(identifier); scope; scope = scope.upper) {
            const variable = scope.set.get(identifier.name)
            if (variable) return variable
          }
          return null
        }
        const calls = (node, test) =>
          node?.type === 'CallExpression' &&
          node.callee.type === 'Identifier' &&
          test(node.callee.name)
        const hookCall = (node) =>
          calls(node, (name) => /^use[A-Z]/.test(name) && !BUILT_IN.has(name))
        const insideEffect = (node) => {
          for (let parent = node.parent; parent; parent = parent.parent)
            if (calls(parent, (name) => name === 'useEffect' || name === 'useLayoutEffect'))
              return true
          return false
        }
        // Whether the value comes from a hook's result, through member reads and fallbacks only.
        const fromHook = (node, depth = 0) => {
          if (!node || depth > 4) return false
          if (node.type === 'TSNonNullExpression' || node.type === 'TSAsExpression')
            return fromHook(node.expression, depth)
          if (node.type === 'ChainExpression') return fromHook(node.expression, depth)
          if (node.type === 'LogicalExpression') {
            // A complete empty object/list is a settled default, not a record to wait on.
            if (['ObjectExpression', 'ArrayExpression'].includes(unwrap(node.right)?.type))
              return false
            return fromHook(node.left, depth) || fromHook(node.right, depth)
          }
          if (node.type === 'ConditionalExpression')
            return fromHook(node.consequent, depth) || fromHook(node.alternate, depth)
          if (node.type === 'MemberExpression')
            return !node.computed && fromHook(node.object, depth)
          if (node.type === 'Identifier') {
            const variable = variableOf(node)
            return !!variable && awaited(variable, depth + 1)
          }
          return hookCall(node)
        }
        // Whether this component waits for the variable's value.
        const awaited = (variable, depth = 0) => {
          const definition = variable.defs[0]
          if (variable.defs.length !== 1 || definition?.type !== 'Variable') return false
          const declarator = definition.node
          if (declarator.id.type === 'ArrayPattern') {
            if (!calls(declarator.init, (name) => name === 'useState')) return false
            const setter = declarator.id.elements[1]
            if (declarator.id.elements[0] !== definition.name || setter?.type !== 'Identifier')
              return false
            const setterVariable = variableOf(setter)
            return !!setterVariable?.references.some(
              (reference) =>
                reference.identifier.parent.type === 'CallExpression' &&
                reference.identifier.parent.callee === reference.identifier &&
                insideEffect(reference.identifier),
            )
          }
          if (declarator.id.type === 'ObjectPattern') return hookCall(declarator.init)
          return (
            declarator.id.type === 'Identifier' &&
            (hookCall(declarator.init) || fromHook(declarator.init, depth))
          )
        }
        const placeholder = (node) => {
          if (node.type === 'Literal') return typeof node.value === 'string' && !!node.value.trim()
          if (node.type === 'JSXText') return !!node.value.trim()
          if (node.type === 'JSXExpressionContainer')
            return node.expression.type !== 'JSXEmptyExpression'
          if (node.type !== 'JSXElement' && node.type !== 'JSXFragment') return false
          if (
            node.type === 'JSXElement' &&
            (node.openingElement.name.type !== 'JSXIdentifier' ||
              /^[A-Z]/.test(node.openingElement.name.name))
          )
            return true
          return node.children.some(placeholder)
        }
        // Early returns can mount the same data region as a later loaded return.
        // Compare actual JSX ancestry (tags and literal region attributes), never route names
        // or a project's selectors. A waiting panel outside that region has a different path.
        const regionPart = (element) => {
          const tag = tagOf(element)
          if (!tag) return null
          const attributes = []
          for (const attribute of element.openingElement.attributes) {
            if (attribute.type === 'JSXSpreadAttribute') return null
            if (!['className', 'id', 'role'].includes(attribute.name?.name)) continue
            if (attribute.value?.type !== 'Literal') return null
            attributes.push([attribute.name.name, attribute.value.value])
          }
          return JSON.stringify([tag, attributes.sort(([a], [b]) => a.localeCompare(b))])
        }
        const textElements = (root, includeWaitingLeaves = false) => {
          const found = []
          const visit = (node, ancestors) => {
            if (!node || typeof node.type !== 'string') return
            if (node.type === 'JSXElement') {
              const part = regionPart(node)
              if (part !== null || includeWaitingLeaves)
                found.push({ element: node, parents: ancestors.join('/'), stable: part !== null })
              if (part === null) return
              ancestors = [...ancestors, part]
            }
            for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
              const child = node[key]
              if (Array.isArray(child)) for (const item of child) visit(item, ancestors)
              else visit(child, ancestors)
            }
          }
          visit(root, [])
          return found
        }
        let resolver
        const waitingTag = (element) => {
          const tag = tagOf(element)
          if (tag) return tag
          const name = element.openingElement.name
          if (name.type !== 'JSXIdentifier') return null
          const binding = variableOf(name)
          const definition = binding?.defs[0]
          if (
            !definition ||
            binding.references.some((reference) => reference.isWrite() && !reference.init)
          )
            return null
          resolver ??= componentResolver(parser, context)
          const component =
            definition.type === 'ImportBinding'
              ? resolver.imported(context.sourceCode.ast, name.name, context.filename)?.node
              : definition.type === 'FunctionName'
                ? definition.node
                : definition.type === 'Variable' && definition.parent.kind === 'const'
                  ? definition.node.init
                  : null
          const roots = resolver.roots(component)
          // A single host root is observable across a local component boundary. A
          // component whose root depends on runtime choices remains opaque here.
          if (roots.length !== 1) return null
          const root = unwrap(roots[0])
          return tagOf(root) && root.children.some(placeholder) ? tagOf(root) : null
        }
        const returned = (node) =>
          node?.type === 'ReturnStatement'
            ? node.argument
            : node?.type === 'BlockStatement' && node.body.length === 1
              ? returned(node.body[0])
              : null
        const earlyReturns = (fn) => {
          if (fn.body?.type !== 'BlockStatement') return
          const statements = fn.body.body
          for (let index = 0; index < statements.length; index++) {
            const statement = statements[index]
            if (statement.type !== 'IfStatement' || statement.alternate) continue
            const subject = presence(statement.test)
            const variable = subject && variableOf(subject.identifier)
            if (!variable || !awaited(variable) || subject.present !== false) continue
            const waiting = returned(statement.consequent)
            const loaded = statements
              .slice(index + 1)
              .find((node) => node.type === 'ReturnStatement')?.argument
            if (!waiting || !loaded) continue
            const record = {
              ...subject,
              variable,
              name: [subject.identifier.name, ...subject.path].join('.'),
            }
            const fields = textElements(loaded).flatMap(({ element, parents }) => {
              const field = fieldShown(element, record)
              return field
                ? [
                    {
                      field,
                      parents,
                      tag: tagOf(element),
                      fieldLine: String(element.loc.start.line),
                    },
                  ]
                : []
            })
            for (const { element, parents, stable } of textElements(waiting, true)) {
              const neighboring = fields.filter((candidate) => candidate.parents === parents)
              if (!neighboring.length) continue
              const host = tagOf(element)
              if (
                host &&
                !element.children.some(
                  (child) =>
                    child.type !== 'JSXElement' &&
                    child.type !== 'JSXFragment' &&
                    placeholder(child),
                )
              )
                continue
              if (reads(element, record)) continue
              const tag = waitingTag(element)
              const field =
                neighboring.find((candidate) => candidate.tag === tag) ??
                (stable ? neighboring[0] : null)
              if (!field) continue
              context.report({
                node: element,
                messageId: 'sameElement',
                data: {
                  record: record.name,
                  field: field.field,
                  fieldLine: field.fieldLine,
                },
              })
            }
          }
        }
        const rendered = (node, seen = new Set()) => {
          const parent = node.parent
          if (parent?.type === 'JSXExpressionContainer') return true
          if (parent?.type !== 'VariableDeclarator' || parent.id.type !== 'Identifier') return false
          const binding = variableOf(parent.id)
          if (
            !binding ||
            seen.has(binding) ||
            parent.parent.kind !== 'const' ||
            binding.references.some((reference) => reference.isWrite() && !reference.init)
          )
            return false
          const next = new Set(seen).add(binding)
          return binding.references.some(
            (reference) => !reference.init && rendered(reference.identifier, next),
          )
        }
        const elements = (node, found = []) => {
          if (!node?.type) return found
          if (node.type === 'JSXElement') found.push(node)
          for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
            const child = node[key]
            if (Array.isArray(child)) for (const item of child) elements(item, found)
            else elements(child, found)
          }
          return found
        }
        // A rendered conditional can replace a whole named region, with different inner wrappers.
        // Compare its two roots only; early returns and page-shell ancestry retain their own rule.
        const sharedRegion = (waiting, loaded) => {
          const tag = tagOf(waiting)
          if (!tag || tag !== tagOf(loaded)) return null
          const named = (node) => {
            if (
              node.openingElement.attributes.some(
                (attribute) => attribute.type === 'JSXSpreadAttribute',
              )
            )
              return []
            return node.openingElement.attributes.flatMap((attribute) =>
              ['className', 'id'].includes(attribute.name?.name) &&
              attribute.value?.type === 'Literal' &&
              typeof attribute.value.value === 'string' &&
              attribute.value.value.trim()
                ? [[attribute.name.name, attribute.value.value]]
                : [],
            )
          }
          const other = named(loaded)
          const match = named(waiting).find(([name, value]) =>
            other.some(([key, text]) => key === name && text === value),
          )
          return match
            ? {
                tag,
                region: `${match[0]}=${JSON.stringify(match[1])}`,
                regionLine: String(waiting.loc.start.line),
              }
            : null
        }
        const regionFields = (waiting, loaded, record, reported) => {
          const region = sharedRegion(waiting, loaded)
          if (!region) return
          const fields = elements(loaded).flatMap((element) => {
            const field = fieldShown(element, record)
            return field
              ? [{ field, tag: tagOf(element), fieldLine: String(element.loc.start.line) }]
              : []
          })
          for (const element of elements(waiting)) {
            if (
              reported.has(element) ||
              reads(element, record) ||
              !element.children.some(
                (child) =>
                  child.type !== 'JSXElement' && child.type !== 'JSXFragment' && placeholder(child),
              )
            )
              continue
            const field = fields.find((candidate) => candidate.tag === tagOf(element))
            if (!field) continue
            reported.add(element)
            context.report({
              node: element,
              messageId: 'sameRegion',
              data: {
                record: record.name,
                ...region,
                field: field.field,
                fieldLine: field.fieldLine,
              },
            })
          }
        }
        // JSX siblings guarded by opposite facts have the same parent as a ternary's arms.
        // Use the record's binding and path, never status prose or a project's selectors.
        const renderedContainer = (node) => {
          const parent = node.parent
          if (
            [
              'JSXElement',
              'JSXFragment',
              'JSXExpressionContainer',
              'LogicalExpression',
              'ConditionalExpression',
            ].includes(parent?.type)
          )
            return renderedContainer(parent)
          return (
            parent?.type === 'ReturnStatement' ||
            (parent?.type === 'ArrowFunctionExpression' && parent.body === node) ||
            rendered(node)
          )
        }
        const siblings = (node) => {
          if (!renderedContainer(node)) return
          const branches = []
          for (const child of node.children) {
            if (child.type !== 'JSXExpressionContainer') continue
            let expression = unwrap(child.expression)
            if (expression?.type !== 'LogicalExpression' || expression.operator !== '&&') continue
            const conditions = []
            const guards = (condition) => {
              condition = unwrap(condition)
              if (condition?.type === 'LogicalExpression' && condition.operator === '&&') {
                guards(condition.left)
                guards(condition.right)
              } else {
                const fact = condition && presence(condition)
                const variable = fact && variableOf(fact.identifier)
                if (variable && awaited(variable) && typeof fact.present === 'boolean')
                  conditions.push({
                    ...fact,
                    variable,
                    name: [fact.identifier.name, ...fact.path].join('.'),
                  })
              }
            }
            while (expression.type === 'LogicalExpression' && expression.operator === '&&') {
              guards(expression.left)
              expression = unwrap(expression.right)
            }
            if (['JSXElement', 'JSXFragment'].includes(expression.type))
              branches.push({ content: expression, conditions })
          }
          const reported = new Set()
          for (const waiting of branches) {
            if (!placeholder(waiting.content)) continue
            for (const record of waiting.conditions.filter((fact) => fact.present === false)) {
              if (reads(waiting.content, record)) continue
              for (const loaded of branches) {
                if (
                  loaded === waiting ||
                  !loaded.conditions.some(
                    (fact) =>
                      fact.present === true &&
                      fact.variable === record.variable &&
                      fact.path.join('.') === record.path.join('.'),
                  )
                )
                  continue
                const candidates = tagOf(loaded.content)
                  ? [loaded.content]
                  : loaded.content.type === 'JSXFragment'
                    ? loaded.content.children
                    : []
                const shown = [...candidates]
                  .reverse()
                  .map(
                    (element) => tagOf(element) && { element, field: fieldShown(element, record) },
                  )
                  .find((entry) => entry?.field)
                if (shown && !reported.has(waiting.content)) {
                  reported.add(waiting.content)
                  context.report({
                    node: waiting.content,
                    messageId: 'sameElement',
                    data: {
                      record: record.name,
                      field: shown.field,
                      fieldLine: String(shown.element.loc.start.line),
                    },
                  })
                } else if (!shown) regionFields(waiting.content, loaded.content, record, reported)
              }
            }
          }
        }
        return {
          'JSXElement:exit': siblings,
          'JSXFragment:exit': siblings,
          'FunctionDeclaration:exit': earlyReturns,
          'FunctionExpression:exit': earlyReturns,
          'ArrowFunctionExpression:exit': earlyReturns,
          ConditionalExpression(node) {
            if (!rendered(node)) return
            const subjects = []
            const collect = (branch) => {
              if (branch.type !== 'ConditionalExpression') return
              const subject = presence(branch.test)
              const variable = subject && variableOf(subject.identifier)
              if (
                variable &&
                awaited(variable) &&
                !subjects.some(
                  (other) =>
                    other.variable === variable && other.path.join('.') === subject.path.join('.'),
                )
              )
                subjects.push({
                  ...subject,
                  variable,
                  name: [subject.identifier.name, ...subject.path].join('.'),
                })
              collect(branch.consequent)
              collect(branch.alternate)
            }
            collect(node)
            const reported = new Set()
            for (const record of subjects) {
              const loaded = [],
                waiting = []
              const branches = (branch, present = null) => {
                if (branch.type === 'ConditionalExpression') {
                  const subject = presence(branch.test)
                  const matches =
                    subject &&
                    sameRecord(subject.identifier, { ...record, path: [] }) &&
                    subject.path.join('.') === record.path.join('.')
                  branches(branch.consequent, matches ? (subject.present ?? present) : present)
                  branches(branch.alternate, matches ? (subject.other ?? present) : present)
                } else if (present === false) waiting.push(branch)
                else loaded.push(branch)
              }
              branches(node)
              let shown = null
              for (const branch of loaded) {
                const candidates = tagOf(branch)
                  ? [branch]
                  : branch.type === 'JSXFragment'
                    ? branch.children
                    : []
                for (const candidate of [...candidates].reverse()) {
                  if (!tagOf(candidate)) continue
                  const field = fieldShown(candidate, record)
                  if (field) {
                    shown = { field, fieldLine: String(candidate.loc.start.line) }
                    break
                  }
                }
                if (shown) break
              }
              if (!shown) {
                for (const missing of waiting)
                  for (const ready of loaded) regionFields(missing, ready, record, reported)
                continue
              }
              for (const branch of waiting) {
                if (reported.has(branch) || !placeholder(branch) || reads(branch, record)) continue
                reported.add(branch)
                context.report({
                  node: branch,
                  messageId: 'sameElement',
                  data: {
                    record: record.name,
                    ...shown,
                  },
                })
              }
            }
          },
        }
      },
    },
    'require-catch-binding': {
      meta: {
        type: 'problem',
        fixable: 'code',
        docs: {
          description:
            'Require a binding in catch clauses (and, with `rejectionHandlers`, in promise rejection handlers) so the error is never silently swallowed',
        },
        schema: [
          {
            type: 'object',
            properties: { rejectionHandlers: { type: 'boolean' } },
            additionalProperties: false,
          },
        ],
        messages: {
          missing:
            'Bind the caught error: `catch (error)` to log/re-throw it, or `catch (_error)` + a comment for an intentional noop.',
          missingRejection:
            'Bind the rejection: `.catch((error) => …)` to log it, or `.catch((_error) => …)` + a comment for an intentional noop.',
        },
      },
      create(context) {
        const rejectionHandlers = context.options[0]?.rejectionHandlers === true
        return {
          // A rejection handler with no parameter cannot log what it caught. No autofix:
          // inserting `_error` would satisfy the rule without anyone deciding the error is
          // safe to drop.
          CallExpression(node) {
            if (!rejectionHandlers) return
            const callee = node.callee
            if (callee.type !== 'MemberExpression' || callee.computed) return
            const method = callee.property.type === 'Identifier' ? callee.property.name : null
            const handler =
              method === 'catch' ? node.arguments[0] : method === 'then' ? node.arguments[1] : null
            if (
              handler &&
              (handler.type === 'ArrowFunctionExpression' ||
                handler.type === 'FunctionExpression') &&
              handler.params.length === 0
            )
              context.report({ node: handler, messageId: 'missingRejection' })
          },
          CatchClause(node) {
            if (node.param) return
            context.report({
              node,
              messageId: 'missing',
              fix(fixer) {
                const source = context.sourceCode
                const names = new Set(
                  source.scopeManager.scopes.flatMap((scope) => [
                    ...scope.variables.map((variable) => variable.name),
                    ...scope.references.map((reference) => reference.identifier.name),
                  ]),
                )
                // Scope names include escaped identifiers and references inside closures.
                // Direct eval can read unknown names, so leave it for manual handling.
                if (
                  source.scopeManager.scopes.some((scope) =>
                    scope.references.some(
                      ({ identifier }) =>
                        identifier.name === 'eval' &&
                        identifier.range[0] >= node.body.range[0] &&
                        identifier.range[1] <= node.body.range[1],
                    ),
                  )
                )
                  return null
                let name = '_error'
                for (let suffix = 1; names.has(name); suffix++) name = `_error${suffix}`
                return fixer.insertTextAfter(source.getFirstToken(node), ` (${name})`)
              },
            })
          },
        }
      },
    },
    'preserve-timestamp-precision': {
      meta: {
        type: 'problem',
        schema: [
          {
            type: 'object',
            properties: { fields: { type: 'array', items: { type: 'string' } } },
            required: ['fields'],
            additionalProperties: false,
          },
        ],
        messages: {
          truncated:
            'This toISOString() value is truncated in the configured precision-sensitive field {{field}}. Keep its full ISO value; use a separate formatted value for display.',
        },
      },
      create(context) {
        const fields = new Set(context.options[0]?.fields ?? [])
        return {
          CallExpression(node) {
            const member = node.callee
            if (
              member.type !== 'MemberExpression' ||
              !['slice', 'substring', 'substr'].includes(member.property.name) ||
              node.arguments[0]?.value !== 0 ||
              typeof node.arguments[1]?.value !== 'number' ||
              node.arguments[1].value < 19 ||
              node.arguments[1]?.value >= 24
            )
              return
            const call = member.object
            if (
              call.type !== 'CallExpression' ||
              call.callee.type !== 'MemberExpression' ||
              call.callee.property.name !== 'toISOString'
            )
              return
            for (let parent = node.parent; parent; parent = parent.parent) {
              if (parent.type === 'Property') {
                if (parent.computed && parent.key.type !== 'Literal') return
                const field = parent.computed
                  ? parent.key.value
                  : (parent.key.name ?? parent.key.value)
                if (fields.has(field))
                  context.report({ node, messageId: 'truncated', data: { field } })
                return
              }
              if (
                ['VariableDeclarator', 'ReturnStatement', 'ExpressionStatement'].includes(
                  parent.type,
                )
              )
                return
            }
          },
        }
      },
    },
  }
  return rules
}
