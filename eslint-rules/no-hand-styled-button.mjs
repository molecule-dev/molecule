/**
 * CANONICAL copy of the `molecule-local/no-hand-styled-button` ESLint rule.
 *
 * Vendored into every repo that lints JSX (see `scripts/sync-eslint-rules.mjs`
 * for the target list and the drift gate). Edit THIS file, never a vendored
 * copy — the sibling repos build alone in CI (workspace AGENTS.md, "CI: each
 * sub-repo builds ALONE"), so an `import` across the polyrepo boundary is not
 * available to them and duplication is the only shape that works. What failed
 * on its own, for the secret scanner, is keeping the copies IDENTICAL; hence
 * the sync script.
 *
 * ## What it enforces
 *
 * A labelled action button takes its size, radius, typography, colour, padding
 * and state transitions from the design system — `cm.button()` on the ClassMap
 * bond — and from nowhere else. The bug that earned this rule: in the IDE chat
 * panel the "Tests" button went through `cm.button({ size: 'xs' })`
 * (`rounded-[3px] h-[26px] text-[13px]`) while the "Commit" button one strip
 * below was a hand-rolled `<button>` with inline `fontSize: 12`,
 * `borderRadius: 6`, a hardcoded `#4070e0` and hand-written
 * onMouseEnter/onMouseLeave hover — so two buttons stacked inches apart
 * rendered at different font sizes and different corner radii.
 *
 * ## Why an inline `style` and not a className check
 *
 * Inline styles outrank class selectors, so a hand-rolled `style` is the one
 * way to silently defeat the ClassMap even when the class is present
 * (molecule AGENTS.md anti-pattern 12). Raw CSS class names are already
 * forbidden by Rule 5, which leaves `style` as the remaining hole.
 *
 * ## False positives are the failure mode this rule is tuned against
 *
 * Workspace AGENTS.md Rule 23: a gate that false-positives trains people into
 * reflexive suppression, and then the one report that mattered gets clicked
 * through too. So the trigger is a DENYLIST of design-token properties, not an
 * allowlist of layout ones: anything not explicitly listed — `display`, `flex`,
 * `gap`, `width`, `position`, `zIndex`, `transform`, `opacity`, `overflow`,
 * `whiteSpace`, `textOverflow`, `marginLeft: 'auto'`, a grid placement, an SVG
 * attribute — passes by construction, and a property only joins the list when
 * `cm.button()` demonstrably owns it.
 *
 * @module
 */

/**
 * Inline style properties that `cm.button()` (and the CVA behind it) owns.
 *
 * Deliberately NOT here, because a button legitimately sets them for layout and
 * the ClassMap has no opinion: width/height and their min/max, margin, display,
 * flex/grid placement, position/inset, zIndex, transform, opacity, overflow,
 * whiteSpace, textOverflow, textAlign, pointerEvents, userSelect, visibility,
 * verticalAlign, boxSizing, WebkitLineClamp. `outline` is also left out on
 * purpose: `outline: 'none'` is a common local reset, and reporting it would
 * cost more in noise than the focus ring is worth here.
 */
const DESIGN_TOKEN_PROPERTIES = new Set([
  // Radius — the 3px-vs-6px half of the original bug.
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderStartStartRadius',
  'borderStartEndRadius',
  'borderEndStartRadius',
  'borderEndEndRadius',
  // Typography — the 12px-vs-13px half.
  'fontSize',
  'fontWeight',
  'fontFamily',
  'letterSpacing',
  'textTransform',
  // Fill + ink.
  'background',
  'backgroundColor',
  'backgroundImage',
  'color',
  // Stroke.
  'border',
  'borderColor',
  'borderWidth',
  'borderStyle',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle',
  // Internal spacing — part of the size tier, not layout.
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'paddingInline',
  'paddingInlineStart',
  'paddingInlineEnd',
  'paddingBlock',
  'paddingBlockStart',
  'paddingBlockEnd',
  // Elevation + the hover/active motion the CVA already carries.
  'boxShadow',
  'transition',
  'transitionProperty',
  'transitionDuration',
  'transitionTimingFunction',
  'transitionDelay',
])

/**
 * The opt-out. Explicit, greppable across both repos with
 * `grep -rn 'mol-bespoke-button'`, and useless without a written reason — the
 * point is that a reviewer can enumerate every bespoke button and read why,
 * which `eslint-disable-next-line` (generic, reason-optional, and the thing
 * people paste reflexively) does not give.
 */
const DIRECTIVE = 'mol-bespoke-button'

/** How many lines above the opening tag the directive comment may sit. */
const DIRECTIVE_LOOKBEHIND_LINES = 3

/**
 * Walk an AST subtree, calling `visit` on every node. Used instead of a
 * selector because the className expression can nest arbitrarily
 * (`cm.cn(cm.button({...}), cond && cm.x)`, a template literal, a ternary).
 *
 * @param {object} node Root node.
 * @param {(n: object) => boolean | void} visit Return true to stop the walk.
 * @returns {boolean} True if `visit` stopped the walk.
 */
function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return false
  if (visit(node) === true) return true
  for (const key of Object.keys(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue
    const value = node[key]
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child.type === 'string' && walk(child, visit)) return true
      }
    } else if (value && typeof value.type === 'string') {
      if (walk(value, visit)) return true
    }
  }
  return false
}

/**
 * True when `node` is a call to a `.button(...)` member — `cm.button({...})`,
 * `classMap.button({...})`, `getClassMap().button({...})`.
 *
 * @param {object} node Candidate node.
 * @returns {boolean} Whether it is a ClassMap button call.
 */
function isClassMapButtonCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee?.type === 'MemberExpression' &&
    node.callee.computed !== true &&
    node.callee.property?.type === 'Identifier' &&
    node.callee.property.name === 'button'
  )
}

/**
 * Whether a className expression resolves through `cm.button(...)`.
 *
 * Resolves a bare identifier one level (`const cls = cm.cn(cm.button({...}));
 * <button className={cls}>`) so the common extract-to-a-const shape is not
 * reported. One level is deliberate: deeper chasing buys little and starts
 * guessing.
 *
 * @param {object} valueNode The className attribute value node.
 * @param {object} sourceCode ESLint SourceCode.
 * @returns {boolean} Whether the design system's button classes are applied.
 */
function usesClassMapButton(valueNode, sourceCode) {
  if (!valueNode) return false
  const expression = valueNode.type === 'JSXExpressionContainer' ? valueNode.expression : valueNode
  if (!expression || typeof expression.type !== 'string') return false

  if (walk(expression, isClassMapButtonCall)) return true

  // One level of identifier resolution.
  let resolved = false
  walk(expression, (node) => {
    if (resolved || node.type !== 'Identifier') return
    let scope = sourceCode.getScope(node)
    let variable = null
    while (scope && !variable) {
      variable = scope.variables.find((v) => v.name === node.name) ?? null
      scope = scope.upper
    }
    if (!variable) return
    for (const def of variable.defs) {
      const init = def.node?.type === 'VariableDeclarator' ? def.node.init : null
      if (init && walk(init, isClassMapButtonCall)) {
        resolved = true
        return true
      }
    }
    for (const ref of variable.references) {
      const write = ref.writeExpr
      if (write && walk(write, isClassMapButtonCall)) {
        resolved = true
        return true
      }
    }
  })
  return resolved
}

/**
 * Collect the design-token property names set by a `style` attribute value.
 *
 * Only statically visible object literals are inspected — a spread, or a style
 * passed as an opaque identifier, yields nothing and is not reported. That is
 * the conservative direction on purpose (see the false-positive note above).
 *
 * @param {object} valueNode The style attribute value node.
 * @returns {string[]} Offending property names, in source order, deduped.
 */
function collectTokenProperties(valueNode) {
  const found = []
  if (!valueNode || valueNode.type !== 'JSXExpressionContainer') return found
  walk(valueNode.expression, (node) => {
    if (node.type !== 'ObjectExpression') return
    for (const property of node.properties) {
      if (property.type !== 'Property' || property.computed) continue
      const key =
        property.key.type === 'Identifier'
          ? property.key.name
          : property.key.type === 'Literal'
            ? String(property.key.value)
            : null
      if (key && DESIGN_TOKEN_PROPERTIES.has(key) && !found.includes(key)) found.push(key)
    }
  })
  return found
}

/**
 * Whether a JSX opening element is a `<button>` or carries `role="button"`.
 *
 * @param {object} openingElement JSXOpeningElement node.
 * @returns {boolean} Whether it is a button for this rule's purposes.
 */
function isButtonElement(openingElement) {
  const name = openingElement.name
  if (name?.type === 'JSXIdentifier' && name.name === 'button') return true
  for (const attribute of openingElement.attributes) {
    if (attribute.type !== 'JSXAttribute') continue
    if (attribute.name?.name !== 'role') continue
    const value = attribute.value
    if (value?.type === 'Literal' && value.value === 'button') return true
    if (
      value?.type === 'JSXExpressionContainer' &&
      value.expression?.type === 'Literal' &&
      value.expression.value === 'button'
    ) {
      return true
    }
  }
  return false
}

/**
 * Find a JSX attribute by name on an opening element.
 *
 * @param {object} openingElement JSXOpeningElement node.
 * @param {string} name Attribute name.
 * @returns {object | null} The attribute node, or null.
 */
function getAttribute(openingElement, name) {
  for (const attribute of openingElement.attributes) {
    if (attribute.type === 'JSXAttribute' && attribute.name?.name === name) return attribute
  }
  return null
}

/** @type {import('eslint').Rule.RuleModule} */
export const noHandStyledButton = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require labelled buttons to take size, radius, typography and colour from cm.button() rather than a hand-rolled inline style',
    },
    schema: [],
    messages: {
      handStyled:
        'Hand-styled button: inline style sets {{props}}, which the design system owns — this is how two buttons an inch apart end up at different font sizes and corner radii. ' +
        "Use the ClassMap recipe: className={cm.cn(cm.button({ variant: 'solid', color: '<semantic>', size: 'xs' }), cm.touchTargetCompact)} " +
        "(size 'xs' for an inline strip/bar/card action, 'sm'/'md' for a full-size CTA), then DELETE the inline {{props}} and any onMouseEnter/onMouseLeave hover — the CVA already carries hover/active/focus-visible/disabled, and the real `disabled` attribute replaces cursor:'not-allowed' + opacity. " +
        'Colour is semantic (primary | secondary | success | warning | error | info), never a hex or rgba — see molecule/DESIGN.md "CTA button sizing, radius & typography". ' +
        'Genuine icon-only chrome (a tab ×, a chevron, a carousel arrow) may opt out with an explicit, reasoned directive comment on the element: /* ' +
        DIRECTIVE +
        ': icon-only tab close, 20px hit target, no label */',
      overridesClassMap:
        'Inline style sets {{props}} on an element already styled by cm.button(). Inline styles outrank ClassMap classes (molecule AGENTS.md anti-pattern 12), so this silently overrides the design system it is sitting on top of. ' +
        'Delete it and express the difference through cm.button({ variant, color, size }) options, or a cm.* helper — not a one-off value.',
      directiveNeedsReason:
        '`' +
        DIRECTIVE +
        '` needs a written reason: /* ' +
        DIRECTIVE +
        ': icon-only tab close, 20px hit target, no label */. ' +
        'A bare opt-out is silence-by-default; the reason is the thing a reviewer greps for and judges.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()
    const directiveRegExp = new RegExp(`${DIRECTIVE}\\b:?(.*)`)

    /**
     * Find a `mol-bespoke-button` directive attached to this element: on the
     * opening tag's own lines, or within a few lines above it.
     *
     * @param {object} openingElement JSXOpeningElement node.
     * @returns {{ comment: object, reason: string } | null} The directive.
     */
    function findDirective(openingElement) {
      const first = openingElement.loc.start.line - DIRECTIVE_LOOKBEHIND_LINES
      const last = openingElement.loc.end.line
      for (const comment of sourceCode.getAllComments()) {
        const line = comment.loc.end.line
        if (line < first || line > last) continue
        const match = directiveRegExp.exec(comment.value)
        if (match) return { comment, reason: match[1].replace(/\*+\/?\s*$/, '').trim() }
      }
      return null
    }

    return {
      JSXOpeningElement(node) {
        if (!isButtonElement(node)) return

        const styleAttribute = getAttribute(node, 'style')
        if (!styleAttribute) return

        const props = collectTokenProperties(styleAttribute.value)
        if (props.length === 0) return

        const directive = findDirective(node)
        if (directive) {
          if (directive.reason.length === 0) {
            context.report({ loc: directive.comment.loc, messageId: 'directiveNeedsReason' })
          }
          return
        }

        const classNameAttribute = getAttribute(node, 'className')
        const styled = usesClassMapButton(classNameAttribute?.value, sourceCode)

        context.report({
          node: styleAttribute,
          messageId: styled ? 'overridesClassMap' : 'handStyled',
          data: { props: props.join(', ') },
        })
      },
    }
  },
}

export default noHandStyledButton
