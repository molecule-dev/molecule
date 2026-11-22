/**
 * The `molecule-local/no-literal-ui-text` ESLint rule.
 *
 * ## What it enforces
 *
 * molecule AGENTS.md Rule 8: user-visible text goes through
 * `t('key', values, { defaultValue })`, so its companion locale bond translates it.
 * A JSX attribute that a screen reader announces or a user reads — an accessible
 * name, a tooltip, an image's alt text, a field's placeholder, a control's label —
 * written as an English string literal reaches every user in English, and every
 * framework port copies the same English. Found 2026-11-15: 35 such attributes in
 * React feature packages (`aria-label="Pinned"`, `aria-label="Previous month"`,
 * `placeholder="Header"`) that the 2026-11-13 i18n sweep could not see, because
 * it checks the keys of `t()` calls and these never call it.
 *
 * ## What it reports
 *
 * In JSX, the attributes `aria-label`, `aria-description`, `aria-roledescription`,
 * `aria-placeholder`, `aria-valuetext`, `alt`, `title`, `placeholder` and `label`
 * (on any element or component) whose value is a string literal — bare, in
 * `{'…'}`, or a template literal without expressions, including either branch of
 * `?:` and either side of `&&` / `||` / `??` — that contains a letter.
 *
 * Text without a letter (`'·'`, `'—'`, `'0'`, an emoji glyph) is left alone: it
 * reads the same in every language. So is anything computed (`{t(…)}`, a prop,
 * a variable), and the empty string (`alt=""` marks a decorative image).
 *
 * So is an element marked `translate="no"`, and everything inside it: HTML's own
 * marker for text that stays as written in every language (a brand name such as
 * `aria-label="GitHub"`, a protocol token such as `POST`, an example URL). It covers
 * the element's text and its translatable attributes, and browser translators honour
 * it too. The conformance kit's pseudo-locale check skips the same subtrees.
 * The marker may also come through a spread of an object that sets it, written inline or
 * as a `const` in scope (`{...NOT_TRANSLATED}`): a component whose props do not declare
 * `translate` receives it that way.
 *
 * @module
 */

const ATTRIBUTES = new Set([
  'aria-label',
  'aria-description',
  'aria-roledescription',
  'aria-placeholder',
  'aria-valuetext',
  'alt',
  'title',
  'placeholder',
  'label',
])

const LETTER = /\p{L}/u

/**
 * The object literal a spread attribute spreads: written inline (`{...{ translate: 'no' }}`) or
 * a `const` in scope initialized with one (`as const` and `satisfies` included). A UI component
 * whose props do not declare `translate` takes it this way, since a spread is not checked for
 * excess properties.
 *
 * @param {import('estree-jsx').JSXSpreadAttribute} spread - The spread attribute.
 * @param {import('eslint').SourceCode} sourceCode - The file's source code.
 * @returns {import('estree-jsx').ObjectExpression | null} The object literal, or null when it is anything else.
 */
function spreadObject(spread, sourceCode) {
  const unwrap = (node) =>
    node?.type === 'TSAsExpression' || node?.type === 'TSSatisfiesExpression'
      ? unwrap(node.expression)
      : node
  const argument = unwrap(spread.argument)
  if (argument?.type === 'ObjectExpression') return argument
  if (argument?.type !== 'Identifier') return null
  for (let scope = sourceCode.getScope(spread); scope; scope = scope.upper) {
    const variable = scope.set.get(argument.name)
    if (!variable) continue
    const definition = variable.defs[0]?.node
    const init =
      definition?.type === 'VariableDeclarator' && definition.parent.kind === 'const'
        ? unwrap(definition.init)
        : null
    return init?.type === 'ObjectExpression' ? init : null
  }
  return null
}

/**
 * Whether a JSX element carries `translate="no"` (also `{'no'}`, or through a spread of an
 * object that sets it).
 *
 * @param {import('estree-jsx').JSXElement} element - The element.
 * @param {import('eslint').SourceCode} sourceCode - The file's source code.
 * @returns {boolean} Whether it opts out of translation.
 */
function translateNo(element, sourceCode) {
  const no = (value) => literalsOf(value).some(({ text }) => text === 'no')
  return element.openingElement.attributes.some((attribute) => {
    if (attribute.type === 'JSXSpreadAttribute')
      return Boolean(
        spreadObject(attribute, sourceCode)?.properties.some(
          (property) =>
            property.type === 'Property' &&
            !property.computed &&
            (property.key.name ?? property.key.value) === 'translate' &&
            no(property.value),
        ),
      )
    return (
      attribute.name.type === 'JSXIdentifier' &&
      attribute.name.name === 'translate' &&
      no(attribute.value)
    )
  })
}

/**
 * Whether a node sits in, or is, an element marked `translate="no"`.
 *
 * @param {import('eslint').Rule.Node} node - Any node.
 * @param {import('eslint').SourceCode} sourceCode - The file's source code.
 * @returns {boolean} Whether translation is switched off there.
 */
function insideTranslateNo(node, sourceCode) {
  for (let current = node; current; current = current.parent)
    if (current.type === 'JSXElement' && translateNo(current, sourceCode)) return true
  return false
}

/**
 * The string literals an attribute value can evaluate to, through `?:` and
 * the logical operators.
 *
 * @param {import('estree-jsx').Node | null | undefined} node - The value expression.
 * @returns {{ node: import('estree-jsx').Node, text: string }[]} Each literal and its text.
 */
function literalsOf(node) {
  if (!node) return []
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' ? [{ node, text: node.value }] : []
    case 'TemplateLiteral':
      return node.expressions.length === 0
        ? [{ node, text: node.quasis.map((q) => q.value.cooked ?? '').join('') }]
        : []
    case 'ConditionalExpression':
      return [...literalsOf(node.consequent), ...literalsOf(node.alternate)]
    case 'LogicalExpression':
      return [...literalsOf(node.left), ...literalsOf(node.right)]
    case 'JSXExpressionContainer':
      return literalsOf(node.expression)
    default:
      return []
  }
}

/**
 * The `molecule-local/no-literal-ui-text` rule.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const noLiteralUiText = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid English string literals in user-visible JSX attributes; pass them through t()',
    },
    schema: [],
    messages: {
      literal:
        "User-visible text in `{{attribute}}` must go through i18n: `{{attribute}}={t('<namespace>.<key>', {}, { defaultValue: {{text}} })}`, with the key added to the package's locale bond (molecule AGENTS.md Rule 8).",
    },
  },
  create(context) {
    return {
      /**
       * Report each literal an i18n-owned attribute can render.
       *
       * @param {import('estree-jsx').JSXAttribute} attribute - The attribute.
       */
      JSXAttribute(attribute) {
        if (attribute.name.type !== 'JSXIdentifier') return
        const name = attribute.name.name
        if (!ATTRIBUTES.has(name)) return
        if (insideTranslateNo(attribute, context.sourceCode)) return
        for (const { node, text } of literalsOf(attribute.value)) {
          if (!LETTER.test(text)) continue
          context.report({
            node,
            messageId: 'literal',
            data: { attribute: name, text: JSON.stringify(text) },
          })
        }
      },
    }
  },
}

export default noLiteralUiText
