/**
 * molecule-only rule (Svelte ports): a snippet's render tag calls it optionally (`x?.()`).
 *
 * A Svelte port renders the node props of a React component, typed `ReactNode` there, a type
 * that includes `undefined`: React renders `children` as nothing when the consumer leaves it out
 * (`cond && …`, a list that became empty, a prop not passed). A Svelte render tag that calls
 * `children()` throws `invalid_snippet` instead, so a page that stops passing the snippet crashes
 * where React's renders nothing. Calling `children?.()` is React's behavior in every case,
 * including inside an `#if children` block that already tests it, so the rule asks for it
 * everywhere and fixes it.
 *
 * A snippet the same component declares (an `#snippet row(item)` block) always exists, so its
 * render tag keeps calling `row(item)`.
 */

/**
 * The rule.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Render a snippet with `{@render x?.()}`: React renders a node prop the consumer left out as nothing, and `{@render x()}` throws then',
    },
    messages: {
      required:
        '`{@render {{callee}}()}` throws `invalid_snippet` when the consumer leaves `{{callee}}` out, where React renders nothing. Write `{@render {{callee}}?.()}`.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode
    /** Snippets this file declares, which always exist. */
    const declared = new Set()
    /** Required render calls, checked once every snippet declaration is known. */
    const calls = []
    return {
      SvelteSnippetBlock(node) {
        if (node.id?.type === 'Identifier') declared.add(node.id.name)
      },
      SvelteRenderTag(node) {
        const call = node.expression
        if (call?.type === 'CallExpression' && !call.optional) calls.push(call)
      },
      'Program:exit'() {
        for (const call of calls) report(call)
      },
    }

    /**
     * Reports a required render of a snippet the file does not declare.
     *
     * @param {import('estree').CallExpression} call - The render call.
     */
    function report(call) {
      if (call.callee.type === 'Identifier' && declared.has(call.callee.name)) return
      const open = sourceCode.getTokenAfter(call.callee, {
        filter: (token) => token.value === '(' && token.range[0] >= call.callee.range[1],
      })
      if (!open) return
      context.report({
        node: call,
        messageId: 'required',
        data: { callee: sourceCode.getText(call.callee) },
        fix: (fixer) => fixer.insertTextBefore(open, '?.'),
      })
    }
  },
}

export default rule
