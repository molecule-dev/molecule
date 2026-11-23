import { URL } from 'node:url'

import { DEFAULT_API_BASE, literalString } from '../shared.mjs'

export default {
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
