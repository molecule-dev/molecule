/**
 * molecule-only rule (Vue packages): a native element's listener key in `h()` names the event in lower case after
 * `on` (`onMouseenter`, `onKeydown`, `onPointerdown`).
 *
 * Vue binds an `on*` prop on a NATIVE element by hyphenating the rest of the key: `onMouseEnter` listens for a
 * `mouse-enter` event, which no browser fires, so the handler never runs and nothing reports it (`h()` types its
 * props as a record of anything). Templates and JSX compile `@mouseenter` to `onMouseenter`; a hand-written `h()`
 * call has to spell it that way itself, and React's `onDoubleClick` is Vue's `onDblclick`. Seen in `@molecule/app-ide-vue` MessageItem (2026-11-20): the compaction
 * summary's hover tint never applied. A COMPONENT's `onFooBar` prop is an emit or a callback prop and is fine, so
 * the rule looks only at `h('<tag>', { … })` whose tag is a lower-case string (a native element) and at the keys of
 * object literals spread into those props.
 *
 * @module
 */

/** A listener key: `on`, the event, then Vue's `Once`/`Passive`/`Capture` modifiers. */
const LISTENER = /^on([A-Z][a-zA-Z]*?)((?:Once|Passive|Capture)*)$/

/** Vue's vnode lifecycle hooks (`onVnodeMounted`, `onVnodeBeforeUnmount`…), which are not DOM listeners. */
const VNODE_HOOK = /^onVnode[A-Z]/

/**
 * React's DOM-callback names whose native event is not the lowercased name (`onDoubleClick` listens to
 * `dblclick`), keyed by the lowercased name after `on`. The same table as `REACT_EVENT_ALIASES` in
 * `@molecule/app-ui-vue`'s `utilities/attrs.ts`, which rewrites a caller's React-style keys the same way; the
 * rule's test checks the two agree. `onFocus`/`onBlur` are single words, so the rule never reports them.
 */
const REACT_EVENT_ALIASES = { focus: 'focusin', blur: 'focusout', doubleclick: 'dblclick' }

/**
 * The key's name, for an identifier or string key.
 * @param {object} property - An object-literal property.
 * @returns {string | null} The name, or null for a computed key.
 */
const keyName = (property) => {
  if (property.type !== 'Property' || property.computed) return null
  if (property.key.type === 'Identifier') return property.key.name
  if (property.key.type === 'Literal' && typeof property.key.value === 'string')
    return property.key.value
  return null
}

/**
 * The Vue key for the DOM event a React-style listener key names: `onMouseEnter` → `onMouseenter`,
 * `onDoubleClick` → `onDblclick`, `onKeyDownCapture` → `onKeydownCapture`.
 * @param {string} name - The listener key.
 * @returns {string | null} The Vue key, or null when `name` is not a camel-case listener key.
 */
export const vueListenerKey = (name) => {
  const match = LISTENER.exec(name)
  if (!match || VNODE_HOOK.test(name) || !/[A-Z]/.test(match[1].slice(1))) return null
  const lower = match[1].toLowerCase()
  const event = REACT_EVENT_ALIASES[lower] ?? lower
  return `on${event[0].toUpperCase()}${event.slice(1)}${match[2]}`
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Require Vue's lower-case event keys (`onMouseenter`) on native elements in `h()`",
    },
    fixable: 'code',
    schema: [],
    messages: {
      camel:
        '`{{name}}` on a native element listens for a `{{hyphenated}}` event, which never fires: Vue hyphenates an h() listener key. Write `{{fixed}}`.',
    },
  },
  create(context) {
    const report = (property, name) =>
      context.report({
        node: property.key,
        messageId: 'camel',
        data: {
          name,
          fixed: vueListenerKey(name),
          hyphenated: LISTENER.exec(name)[1]
            .replace(/\B([A-Z])/g, '-$1')
            .toLowerCase(),
        },
        fix: (fixer) =>
          property.key.type === 'Identifier' && !property.shorthand
            ? fixer.replaceText(property.key, vueListenerKey(name))
            : null,
      })
    // The object literals that reach a native element's props: the props argument itself and literals spread into it
    // through a local const (`const hover = { onMouseEnter: … }; h('div', { ...hover })`).
    const check = (object, scope) => {
      if (!object) return
      if (object.type === 'Identifier') {
        const variable = scope.references.find((r) => r.identifier === object)?.resolved
        const def = variable?.defs[0]
        if (def?.type === 'Variable' && def.node.init?.type === 'ObjectExpression')
          check(def.node.init, scope)
        return
      }
      if (object.type !== 'ObjectExpression') return
      for (const property of object.properties) {
        if (property.type === 'SpreadElement') {
          check(property.argument, scope)
          continue
        }
        const name = keyName(property)
        if (name && vueListenerKey(name)) report(property, name)
      }
    }
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'h') return
        const [tag, props] = node.arguments
        if (
          !tag ||
          tag.type !== 'Literal' ||
          typeof tag.value !== 'string' ||
          !/^[a-z]/.test(tag.value)
        )
          return
        check(props, context.sourceCode.getScope(node))
      },
    }
  },
}
