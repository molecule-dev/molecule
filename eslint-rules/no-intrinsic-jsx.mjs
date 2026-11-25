/**
 * molecule-only rule (React features and the React UI kit): no intrinsic JSX element.
 *
 * A React feature package (`packages/app/features/*-react`) and the React UI kit's components are
 * the one implementation for React DOM and React Native. A lowercase JSX element (`<div>`,
 * `<span>`, `<button>`) is a web tag, which React Native cannot render. The code uses the elements
 * of `@molecule/app-ui-react/elements` instead: each renders exactly its web tag (the tag itself,
 * or the one its `as` prop names) and the matching native view on a device. The message names the
 * element for the tag.
 *
 * An element whose name is a member (`<motion.div>`) or namespaced (`<svg:path>`) is not an
 * intrinsic and passes. A package not converted yet is exempted by `intrinsic-jsx-config.mjs`
 * through `intrinsic-jsx-pending.json`, a list that may only shrink.
 */

/** The element of `@molecule/app-ui-react/elements` that replaces each intrinsic tag. */
const ELEMENTS = [
  ['Box', 'div span section header footer main aside nav article address ul ol li dl dd figure'],
  ['Text', 'p h1 h2 h3 h4 h5 h6 strong em small code pre kbd mark dt figcaption label time'],
  ['Pressable', 'button'],
  ['Link', 'a'],
  ['TextField', 'input textarea'],
  ['SelectField', 'select'],
  ['Image', 'img'],
  ['Svg', 'svg'],
  ['Path', 'path'],
  ['Rect', 'rect'],
  ['Circle', 'circle'],
  ['Ellipse', 'ellipse'],
  ['Line', 'line'],
  ['Polyline', 'polyline'],
  ['Polygon', 'polygon'],
  ['G', 'g'],
  ['SvgText', 'text'],
  ['FormArea', 'form'],
  ['Fieldset', 'fieldset'],
  ['TableBox', 'table thead tbody tfoot tr'],
  ['TableCell', 'td th'],
  ['Disclosure', 'details'],
  ['Rule', 'hr'],
]

/** Each intrinsic tag and its element. A tag listed for two elements is refused, not resolved to one. */
export const ELEMENT_FOR_TAG = new Map()
for (const [element, tags] of ELEMENTS) {
  for (const tag of tags.split(' ')) {
    const listed = ELEMENT_FOR_TAG.get(tag)
    if (listed)
      throw new Error(`no-intrinsic-jsx: <${tag}> is listed for both ${listed} and ${element}`)
    ELEMENT_FOR_TAG.set(tag, element)
  }
}

/** The elements with an `as` prop, which names the web tag they render; each other element has one tag. */
export const TAKES_AS = new Set([
  'Box',
  'Text',
  'Pressable',
  'TextField',
  'SelectField',
  'FormArea',
  'Fieldset',
  'TableBox',
  'TableCell',
  'Disclosure',
  'Rule',
])

/** What else a container may be: its text goes to `Text`, something the user activates to `Pressable`. */
const ALTERNATIVES = {
  Box: ' (or `Text` when its children are text, `Pressable` when it is clickable)',
  TextField: ' (or `CheckField as="input"` for a checkbox or radio)',
}

/** An intrinsic tag: the JSX transform tells a web tag from a component by its lowercase first letter. */
const INTRINSIC = /^[a-z]/

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid lowercase JSX elements in React features and the React UI kit, which React Native cannot render',
    },
    schema: [],
    messages: {
      intrinsic:
        "`<{{tag}}>` cannot render on React Native: use `<{{element}}{{as}}>` from '@molecule/app-ui-react/elements'{{alternatives}}.",
      unlisted:
        '`<{{tag}}>` cannot render on React Native: use an element from @molecule/app-ui-react/elements (add one if none fits).',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const { name } = node
        // A self-closing element is a JSXOpeningElement too. `<motion.div>` is a
        // JSXMemberExpression and `<svg:path>` a JSXNamespacedName: neither is an intrinsic.
        if (name.type !== 'JSXIdentifier' || !INTRINSIC.test(name.name)) return
        const tag = name.name
        const element = ELEMENT_FOR_TAG.get(tag)
        if (!element) {
          context.report({ node, messageId: 'unlisted', data: { tag } })
          return
        }
        context.report({
          node,
          messageId: 'intrinsic',
          data: {
            tag,
            element,
            as: TAKES_AS.has(element) ? ` as="${tag}"` : '',
            alternatives: ALTERNATIVES[element] ?? '',
          },
        })
      },
    }
  },
}
