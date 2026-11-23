// WCAG technique H2: avoid two adjacent keyboard stops for the same image/name
// destination. Inspect only a direct image link and its next static layout sibling;
// separate rows, conditional layouts and opaque components remain independent.
// The fix hides the image link from assistive technology and the tab order, so the
// markup, classes and click target stay as written; the deploy applies it like every
// other ESLint fix, and the rule is a warning like the scaffold's other fixable rules.
export default {
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
      if (node?.type === 'Literal' && typeof node.value === 'string') return `text:${node.value}`
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
      if (others.length || tag(image)?.name !== 'img' || attr(image, 'aria-hidden')) return false
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
        opening.attributes.at(-1) ?? opening.typeArguments ?? opening.typeParameters ?? opening.name
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
}
