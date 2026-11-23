import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, it } from 'vitest'

import rule from '../../eslint-rules/no-hand-placed-nodes.mjs'

/**
 * Unit tests for `molecule-local/no-hand-placed-nodes`: a port that moves or removes a DOM node
 * by hand reports, with the framework's own placement tool in the message; a node the code
 * created in the same scope, and a FormData / URLSearchParams call, stay silent.
 *
 * @module
 */

RuleTester.describe = describe
RuleTester.it = it

type RuleModule = Parameters<RuleTester['run']>[1]

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' },
})

const angular = [{ framework: 'angular' }]
const svelte = [{ framework: 'svelte' }]

ruleTester.run('no-hand-placed-nodes', rule as RuleModule, {
  valid: [
    {
      name: 'a <style> the code created, put in the head',
      code: "const style = document.createElement('style'); document.head.appendChild(style)",
      options: angular,
    },
    {
      name: 'a created node inserted, then removed',
      code: "function f(host: HTMLElement) { const badge = document.createElement('div'); document.body.appendChild(badge); badge.remove() }",
      options: svelte,
    },
    {
      name: 'a clone placed before a sibling',
      code: 'function f(a: Element, ref: Node) { const copy = a.cloneNode(true) as Element; ref.parentNode?.insertBefore(copy, ref) }',
      options: angular,
    },
    {
      name: 'a node created inline',
      code: "host.appendChild(document.createTextNode('x'))",
      options: angular,
    },
    {
      name: 'FormData and URLSearchParams append',
      code: "const body = new FormData(); body.append('file', blob); const q = new URLSearchParams(); q.append('a', '1'); url.searchParams.append('b', '2')",
      options: angular,
    },
    {
      name: 'a placement function from the binding',
      code: 'usePlacement(() => { placeElementBefore(root, host); setElementPresent(host, false) })',
      options: angular,
    },
    {
      name: 'classList.remove with a class',
      code: "el.classList.remove('open')",
      options: angular,
    },
  ],
  invalid: [
    {
      name: 'a rendered element moved in front of the host (Angular)',
      code: 'this.host.parentNode.insertBefore(this.root.nativeElement, this.host)',
      options: angular,
      errors: [
        {
          messageId: 'moved',
          data: {
            call: 'insertBefore',
            fix: 'place a node Angular rendered with placeElement / placeElementBefore / placeContent / placeContentBefore / setElementPresent from @molecule/app-angular, inside usePlacement',
          },
        },
      ],
    },
    {
      name: 'a rendered trigger adopted into another parent (Svelte)',
      code: 'wrapper.appendChild(trigger)',
      options: svelte,
      errors: [
        {
          messageId: 'moved',
          data: {
            call: 'appendChild',
            fix: 'render the node in the markup where React renders it, inside <BodyPortal> from @molecule/app-svelte where React portals it',
          },
        },
      ],
    },
    {
      name: 'a rendered node removed by hand',
      code: 'this.capture.nativeElement.remove()',
      options: angular,
      errors: [{ messageId: 'moved' }],
    },
    {
      name: 'a rendered node removed through its parent',
      code: 'node.parentNode?.removeChild(node)',
      options: [{ framework: 'vue' }],
      errors: [{ messageId: 'moved' }],
    },
    {
      name: 'a rendered node placed beside a created one',
      code: "const style = document.createElement('style'); style.after(this.root)",
      options: [{ framework: 'solid' }],
      errors: [{ messageId: 'moved' }],
    },
    {
      name: 'HTML written into a rendered element',
      code: "host.insertAdjacentHTML('beforeend', '<b>x</b>')",
      options: angular,
      errors: [{ messageId: 'moved' }],
    },
  ],
})
