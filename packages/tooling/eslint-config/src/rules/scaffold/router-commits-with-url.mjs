// The bond's router components give the app its molecule router (which
// @molecule/app-react's routing hooks, Link, RoutedView and the molecule layouts
// and guards read; React Router's own leave them without one), and the client
// ones own the transition setting, so this rule only moves router imports.
// Type-only imports cannot render a router and are deliberately left alone.
// `HydratedRouter` and the DOM `RouterProvider` (`react-router/dom`, re-exported by
// `react-router-dom`) move to the bond's `/dom` entry, which keeps `react-dom` out
// of its main entry.
export default {
  meta: {
    type: 'problem',
    fixable: 'code',
    schema: [],
    messages: {
      synchronous:
        "Import this router from '{{module}}'. Its wrapper gives the app the molecule router that @molecule/app-react's routing hooks, Link and RoutedView read, and in the browser sets useTransitions={false} so the URL and rendered page change together.",
      namespace:
        'This namespace renders a router component outside the declared routing provider wrapper. Import that router component from @molecule/app-routing-react-router, which gives the app the molecule router and its documented transition setting. Hook-only namespace imports remain supported.',
      dynamic:
        "Import router components directly from '@molecule/app-routing-react-router' instead of a dynamic React Router import (dynamic module uses are not tracked), because its wrappers give the app the molecule router and, in the browser, set useTransitions={false} so the URL and rendered page change together.",
    },
  },
  create(context) {
    const source = context.sourceCode
    const packages = new Set(['react-router', 'react-router-dom', 'react-router/dom'])
    const routers = new Set([
      'BrowserRouter',
      'HashRouter',
      'MemoryRouter',
      'Router',
      'RouterProvider',
      'HydratedRouter',
      'unstable_HistoryRouter',
      'StaticRouter',
      'StaticRouterProvider',
    ])
    const bond = '@molecule/app-routing-react-router'
    const domEntries = new Set(['react-router/dom', 'react-router-dom'])
    const target = (module, name) =>
      name === 'HydratedRouter' || (name === 'RouterProvider' && domEntries.has(module))
        ? `${bond}/dom`
        : bond
    // Moved specifiers grouped by the bond entry each one moves to, in source order.
    const byTarget = (specifiers, module, nameOf) => {
      const groups = new Map()
      for (const specifier of specifiers) {
        const destination = target(module, nameOf(specifier))
        groups.set(destination, [...(groups.get(destination) ?? []), specifier])
      }
      return [...groups]
    }
    const importedName = (specifier) => specifier.imported.name ?? specifier.imported.value
    const exportedLocal = (specifier) => specifier.local.name ?? specifier.local.value
    const declaration = (specifiers, module, semicolon) => {
      const parts = specifiers
        .filter((specifier) => specifier.type !== 'ImportSpecifier')
        .map((specifier) => source.getText(specifier))
      const named = specifiers.filter((specifier) => specifier.type === 'ImportSpecifier')
      if (named.length > 0)
        parts.push(`{ ${named.map((specifier) => source.getText(specifier)).join(', ')} }`)
      return `import ${parts.join(', ')} from '${module}'${semicolon}`
    }
    const exportDeclaration = (specifiers, module, semicolon) =>
      `export { ${specifiers.map((specifier) => source.getText(specifier)).join(', ')} } from '${module}'${semicolon}`
    const moduleName = (node) => {
      if (node.type === 'Literal') return node.value
      if (node.type === 'TemplateLiteral' && node.expressions.length === 0)
        return node.quasis[0].value.cooked ?? node.quasis[0].value.raw
      return null
    }
    return {
      ImportDeclaration(node) {
        if (!packages.has(moduleName(node.source)) || node.importKind === 'type') return
        const namespace = node.specifiers.find((entry) => entry.type === 'ImportNamespaceSpecifier')
        if (namespace) {
          const variable = context.sourceCode
            .getDeclaredVariables(node)
            .find((entry) => entry.name === namespace.local.name)
          const used = variable?.references.some(({ identifier }) => {
            const member = identifier.parent
            return (
              (member?.type === 'MemberExpression' &&
                member.object === identifier &&
                !member.computed &&
                routers.has(member.property.name)) ||
              (member?.type === 'JSXMemberExpression' &&
                member.object === identifier &&
                routers.has(member.property.name))
            )
          })
          if (used) context.report({ node, messageId: 'namespace' })
          return
        }
        const module = moduleName(node.source)
        const moved = node.specifiers.filter(
          (specifier) =>
            specifier.type === 'ImportSpecifier' &&
            specifier.importKind !== 'type' &&
            routers.has(importedName(specifier)),
        )
        if (moved.length === 0) return
        context.report({
          node: moved[0],
          messageId: 'synchronous',
          data: { module: target(module, importedName(moved[0])) },
          fix(fixer) {
            const semicolon = source.getText(node).trimEnd().endsWith(';') ? ';' : ''
            const bondImports = byTarget(moved, module, importedName).map(
              ([destination, specifiers]) => declaration(specifiers, destination, semicolon),
            )
            const remaining = node.specifiers.filter((specifier) => !moved.includes(specifier))
            if (remaining.length > 0) bondImports.unshift(declaration(remaining, module, semicolon))
            return fixer.replaceText(node, bondImports.join('\n'))
          },
        })
      },
      ExportNamedDeclaration(node) {
        if (!node.source || !packages.has(moduleName(node.source)) || node.exportKind === 'type')
          return
        const module = moduleName(node.source)
        const moved = node.specifiers.filter(
          (specifier) =>
            specifier.type === 'ExportSpecifier' &&
            specifier.exportKind !== 'type' &&
            routers.has(exportedLocal(specifier)),
        )
        if (moved.length === 0) return
        context.report({
          node: moved[0],
          messageId: 'synchronous',
          data: { module: target(module, exportedLocal(moved[0])) },
          fix(fixer) {
            const semicolon = source.getText(node).trimEnd().endsWith(';') ? ';' : ''
            const bondExports = byTarget(moved, module, exportedLocal).map(
              ([destination, specifiers]) => exportDeclaration(specifiers, destination, semicolon),
            )
            const remaining = node.specifiers.filter((specifier) => !moved.includes(specifier))
            if (remaining.length > 0)
              bondExports.push(exportDeclaration(remaining, module, semicolon))
            return fixer.replaceText(node, bondExports.join('\n'))
          },
        })
      },
    }
  },
}
