/**
 * molecule-only rule (Angular tests and the conformance kit's Angular adapter): every component
 * a test declares states its change detection, by its current name.
 *
 * Angular 22 checks a component that sets no `changeDetection` as `OnPush`. A test host whose
 * props the test changes (`host.p = …; appRef.tick()`) is then never re-rendered, so the test
 * asserts the DOM of the first render: fifteen suites passed that way while their prop changes
 * did nothing (molecule 9154c68b9c). `ChangeDetectionStrategy.Eager` re-renders on every tick,
 * as a React test's re-render does; `OnPush` is for a test that needs a boundary on purpose.
 * `ChangeDetectionStrategy.Default` is Angular 22's deprecated name for `Eager`, fixed in place.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require changeDetection on every component an Angular test declares',
    },
    fixable: 'code',
    schema: [],
    messages: {
      missing:
        'This test component sets no changeDetection, which Angular 22 checks as OnPush: a prop the test changes is never rendered and the test asserts the first render. Set `changeDetection: ChangeDetectionStrategy.Eager` (from @angular/core), or `OnPush` when the test needs that boundary.',
      deprecated:
        '`ChangeDetectionStrategy.Default` is deprecated in Angular 22; write `ChangeDetectionStrategy.Eager` (the same strategy).',
    },
  },
  create(context) {
    /** Local names `Component` and `ChangeDetectionStrategy` are imported under from `@angular/core`. */
    const components = new Set()
    const strategies = new Set()
    return {
      ImportDeclaration(node) {
        if (node.source.value !== '@angular/core') return
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier') continue
          if (specifier.imported.name === 'Component') components.add(specifier.local.name)
          if (specifier.imported.name === 'ChangeDetectionStrategy')
            strategies.add(specifier.local.name)
        }
      },
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          strategies.has(node.object.name) &&
          !node.computed &&
          node.property.type === 'Identifier' &&
          node.property.name === 'Default'
        )
          context.report({
            node: node.property,
            messageId: 'deprecated',
            fix: (fixer) => fixer.replaceText(node.property, 'Eager'),
          })
      },
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || !components.has(node.callee.name)) return
        const options = node.arguments[0]
        if (options?.type !== 'ObjectExpression') return
        const set = options.properties.some(
          (property) =>
            property.type === 'SpreadElement' ||
            (property.type === 'Property' &&
              !property.computed &&
              ((property.key.type === 'Identifier' && property.key.name === 'changeDetection') ||
                (property.key.type === 'Literal' && property.key.value === 'changeDetection'))),
        )
        if (!set) context.report({ node: options, messageId: 'missing' })
      },
    }
  },
}
