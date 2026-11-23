/**
 * `no-vite-import-meta`: the `import.meta` members only Vite defines, in an app Metro bundles.
 *
 * A React Native app's Babel preset turns `import.meta` into an object that has `url` and nothing
 * else (Hermes cannot parse `import.meta` itself), so `import.meta.env.VITE_API_URL` type-checks
 * against `vite/client` (which the app's vitest tests need) and is `undefined` on a device, with
 * no error anywhere. The config enables this rule outside test files, which vitest runs under
 * Vite, in a workspace that depends on `react-native`.
 *
 * @module
 */

/** The members Vite adds to `import.meta`, with what a Metro app uses instead. */
const VITE_MEMBERS = {
  env: 'Read `process.env.EXPO_PUBLIC_<NAME>`, which Expo inlines when it bundles the app.',
  glob: 'Load each file with a literal `import()`, or list them with `require.context(dir, true, /pattern/)`.',
  globEager:
    'Load each file with a literal `import()`, or list them with `require.context(dir, true, /pattern/)`.',
  hot: 'Fast Refresh reloads the app without a hot-module API in its code.',
}

/**
 * Whether a node is `import.meta`.
 *
 * @param {import('estree').Node | null | undefined} node - The node.
 * @returns {boolean} Whether it is.
 */
function isImportMeta(node) {
  return (
    node?.type === 'MetaProperty' && node.meta.name === 'import' && node.property.name === 'meta'
  )
}

/**
 * The name a member or destructured key reads, when it is written out.
 *
 * @param {import('estree').Node} key - The property node.
 * @param {boolean} computed - Whether it is computed (`import.meta['env']`).
 * @returns {string | undefined} The name.
 */
function keyName(key, computed) {
  if (!computed && key.type === 'Identifier') return key.name
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value
  return undefined
}

/**
 * The rule: reports each read of an `import.meta` member only Vite defines.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow the import.meta members only Vite defines (env, glob, hot) in an app Metro bundles',
    },
    schema: [],
    messages: {
      viteOnly:
        '`import.meta.{{name}}` is undefined in a React Native app: Metro bundles it, and its ' +
        '`import.meta` has only `url`. {{instead}}',
    },
  },
  create(context) {
    /**
     * Reports a Vite-only member.
     *
     * @param {import('estree').Node} node - Where it is read.
     * @param {string | undefined} name - The member.
     */
    const report = (node, name) => {
      if (name && Object.hasOwn(VITE_MEMBERS, name))
        context.report({ node, messageId: 'viteOnly', data: { name, instead: VITE_MEMBERS[name] } })
    }
    return {
      MemberExpression(node) {
        if (isImportMeta(node.object)) report(node, keyName(node.property, node.computed))
      },
      VariableDeclarator(node) {
        if (node.id.type !== 'ObjectPattern' || !isImportMeta(node.init)) return
        for (const property of node.id.properties)
          if (property.type === 'Property')
            report(property, keyName(property.key, property.computed))
      },
    }
  },
}
