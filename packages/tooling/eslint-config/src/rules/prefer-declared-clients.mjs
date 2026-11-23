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

import { DEFAULT_API_BASE, literalString, TEST } from './shared.mjs'

const AUTH = '@molecule/app-auth'

const HTTP = '@molecule/app-http'

// mlcl/registry.json's app `http` bond category: the core and every provider factory.
const HTTP_FACTORIES = [
  { module: HTTP, name: 'createFetchClient' },
  { module: '@molecule/app-http-axios', name: 'createAxiosClient' },
]

const INDEPENDENT_API_KEY = /api[_-]?key/i

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

// The scaffold rules live in ./scaffold/, one file each; this re-export keeps
// `@molecule/eslint-config/rules/prefer-declared-clients.mjs` importing them as before.
export { scaffoldRules } from './scaffold/index.mjs'
