/**
 * CANONICAL copy of the `molecule-local/no-raw-class-names` ESLint rule.
 *
 * Vendored into every repo that lints UI code (see `scripts/sync-eslint-rules.mjs`
 * for the target list and the drift gate). Edit THIS file, never a vendored copy.
 *
 * ## What it enforces
 *
 * molecule AGENTS.md Rule 5: CSS class names live only in ClassMap bond packages
 * (`@molecule/app-ui-tailwind`, …). Everything else styles through
 * `getClassMap()` tokens, so swapping the styling library is one bond change and
 * every framework's UI package renders the same classes from the same tokens.
 * A literal class string anywhere else is a class the bond cannot see: it
 * survives a styling swap unstyled, and a framework port that copies it diverges
 * from the bond. Found 2026-11-13: four React UI components carried raw
 * Tailwind strings (`'block truncate text-on-surface-variant'`,
 * `'!right-auto !left-0'`, …) inside `cm.cn(...)`, so nothing caught them.
 *
 * ## What it reports
 *
 * A non-empty string literal (or a template literal's static text) that is:
 * - an argument of `cn(...)` / `cm.cn(...)` (through `?:`, `&&`, `||`, `??` and arrays);
 * - the value of a JSX `className` / `class` attribute;
 * - the value of a `class` / `className` property in an object literal (Vue
 *   `h()` props, Solid props, element attribute maps);
 * - an argument of `classList.add/remove/toggle/replace` or the value of
 *   `setAttribute('class', …)`;
 * - a static `class="…"` attribute inside a string or template literal (an
 *   Angular inline template).
 *
 * Identifiers, member expressions and calls (`cm.button()`, `className` passed
 * through) never report: the rule only flags text that is itself a class list.
 * The `allow` option lists exact strings a package may still use (a test token).
 *
 * @module
 */

const CLASS_KEYS = new Set(['class', 'className'])
const CLASS_LIST_METHODS = new Set(['add', 'remove', 'toggle', 'replace'])
const STATIC_CLASS_ATTRIBUTE = /(?:^|[\s<])class="([^"]*)"/g

/**
 * The `molecule-local/no-raw-class-names` rule.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const noRawClassNames = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid CSS class names outside ClassMap bond packages; style through getClassMap() tokens',
    },
    schema: [
      {
        type: 'object',
        properties: { allow: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      raw: 'CSS class "{{text}}" outside the ClassMap. Use a `cm.*` token from getClassMap() (when none fits, add one to UIClassMap in @molecule/app-ui and to the ClassMap bonds). Only ClassMap bond packages may contain class names (molecule AGENTS.md Rule 5).',
    },
  },
  create(context) {
    const allow = new Set(context.options[0]?.allow ?? [])

    const reportText = (node, text) => {
      const trimmed = text.trim()
      if (!trimmed || allow.has(trimmed)) return
      context.report({ node, messageId: 'raw', data: { text: trimmed } })
    }

    /** Reports the static class text an expression evaluates to. */
    const reportStrings = (node) => {
      if (!node) return
      switch (node.type) {
        case 'Literal':
          if (typeof node.value === 'string') reportText(node, node.value)
          return
        case 'TemplateLiteral':
          for (const quasi of node.quasis) reportText(node, quasi.value.cooked ?? quasi.value.raw)
          return
        case 'ConditionalExpression':
          reportStrings(node.consequent)
          reportStrings(node.alternate)
          return
        case 'LogicalExpression':
          // `cond && 'x'` — the left side is a condition; `a || 'x'` / `a ?? 'x'` may be either.
          if (node.operator !== '&&') reportStrings(node.left)
          reportStrings(node.right)
          return
        case 'ArrayExpression':
          for (const element of node.elements) reportStrings(element)
          return
        case 'TSAsExpression':
        case 'TSSatisfiesExpression':
        case 'TSNonNullExpression':
          reportStrings(node.expression)
          return
        default:
      }
    }

    const keyName = (key) =>
      key.type === 'Identifier' ? key.name : key.type === 'Literal' ? String(key.value) : null

    const calleeName = (callee) => {
      if (callee.type === 'Identifier') return { object: null, name: callee.name }
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property.type === 'Identifier'
      ) {
        const object = callee.object
        const objectName =
          object.type === 'Identifier'
            ? object.name
            : object.type === 'MemberExpression' &&
                !object.computed &&
                object.property.type === 'Identifier'
              ? object.property.name
              : null
        return { object: objectName, name: callee.property.name }
      }
      return null
    }

    const reportTemplateAttributes = (node, text) => {
      if (!text.includes('class="')) return
      for (const match of text.matchAll(STATIC_CLASS_ATTRIBUTE)) {
        // `class="{{ expr }}"` is a binding, not a class list.
        if (!match[1].includes('{{')) reportText(node, match[1])
      }
    }

    return {
      CallExpression(node) {
        const callee = calleeName(node.callee)
        if (!callee) return
        if (callee.name === 'cn') {
          for (const argument of node.arguments) reportStrings(argument)
        } else if (callee.object === 'classList' && CLASS_LIST_METHODS.has(callee.name)) {
          // `toggle(name, force)`: only the first argument is a class.
          const args = callee.name === 'toggle' ? node.arguments.slice(0, 1) : node.arguments
          for (const argument of args) reportStrings(argument)
        } else if (callee.name === 'setAttribute') {
          const [name, value] = node.arguments
          if (name?.type === 'Literal' && name.value === 'class') reportStrings(value)
        }
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || !CLASS_KEYS.has(node.name.name) || !node.value)
          return
        if (node.value.type === 'Literal') reportStrings(node.value)
        else if (node.value.type === 'JSXExpressionContainer') reportStrings(node.value.expression)
      },
      Property(node) {
        if (node.parent?.type !== 'ObjectExpression' || node.computed) return
        const name = keyName(node.key)
        if (name && CLASS_KEYS.has(name)) reportStrings(node.value)
      },
      Literal(node) {
        if (typeof node.value === 'string') reportTemplateAttributes(node, node.value)
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis)
          reportTemplateAttributes(node, quasi.value.cooked ?? quasi.value.raw)
      },
    }
  },
}
