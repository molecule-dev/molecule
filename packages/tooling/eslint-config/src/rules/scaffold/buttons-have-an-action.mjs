// A `<button type="button">` with no handler does nothing when pressed: `type="button"`
// switches off the one thing a button does by itself (submit its form). It is usually a
// placeholder drawn for the layout while the component that owns the action was written
// elsewhere and never rendered here. Structural only: the element's own attributes and its
// JSX ancestors in this file. Anything that can give the button behaviour from outside this
// element keeps the rule quiet: spread props, a ref, a native invoker attribute, a `data-*`
// attribute (a script may bind by it), a permanently unavailable control, or an ancestor
// with its own event handler (delegation).
export default {
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
}
