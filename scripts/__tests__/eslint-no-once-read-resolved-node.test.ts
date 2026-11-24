import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, it } from 'vitest'

import rule from '../../eslint-rules/no-once-read-resolved-node.mjs'

/**
 * Unit tests for `molecule-local/no-once-read-resolved-node`: a `ResolveNode` or
 * `PresentWhileNode` callback runs once, so one that returns something other than JSX (or its own
 * accessor) reports and an expression body is fixed to return a fragment, and an accessor read in a
 * statement of a block body reports; reads inside JSX or inside a function the callback creates,
 * and callbacks of other components, stay silent.
 *
 * @module
 */

RuleTester.describe = describe
RuleTester.it = it

type RuleModule = Parameters<RuleTester['run']>[1]

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

const component = (jsx: string): string => `export const Row = (props) => (\n  ${jsx}\n)\n`

ruleTester.run('no-once-read-resolved-node', rule as RuleModule, {
  valid: [
    {
      name: 'the node read inside a fragment',
      code: component('<ResolveNode node={props.item}>{(node) => <>{node()}</>}</ResolveNode>'),
    },
    {
      name: 'present() read inside JSX, in an attribute and a Show',
      code: component(
        '<ResolveNode node={props.left}>{(left, hasLeft) => <><Show when={hasLeft()}><div>{left()}</div></Show><input class={hasLeft() ? "a" : "b"} /></>}</ResolveNode>',
      ),
    },
    {
      name: 'a read inside a function the callback creates',
      code: component(
        '<PresentWhileNode node={props.footer}>{(node) => <footer onClick={() => node()}>{node()}</footer>}</PresentWhileNode>',
      ),
    },
    {
      name: 'a block body that defines its reads as functions and returns JSX',
      code: component(
        '<ResolveNode node={props.name}>{(name) => { const label = () => (typeof name() === "string" ? name() : "Player"); return <b aria-label={label()}>{name()}</b> }}</ResolveNode>',
      ),
    },
    {
      name: 'a block body that hands the accessor on before returning JSX',
      code: component(
        '<ResolveNode node={props.title}>{(node, present) => { title.report(present); return <h2>{node()}</h2> }}</ResolveNode>',
      ),
    },
    {
      name: 'the accessor itself returned, which the parent inserts and reads',
      code: component('<ResolveNode node={props.item}>{(node) => node}</ResolveNode>'),
    },
    {
      name: 'a callback of another component',
      code: component('<Show when={props.user}>{(user) => user()}</Show>'),
    },
  ],
  invalid: [
    {
      name: 'the node returned read once',
      code: component('<ResolveNode node={props.item}>{(node) => node()}</ResolveNode>'),
      output: component('<ResolveNode node={props.item}>{(node) => <>{node()}</>}</ResolveNode>'),
      errors: [{ messageId: 'notJsx', data: { component: 'ResolveNode' } }],
    },
    {
      name: 'present() in a ternary the callback returns',
      code: component(
        '<ResolveNode node={props.icon}>{(icon, hasIcon) => (hasIcon() ? <i>{icon()}</i> : <b />)}</ResolveNode>',
      ),
      output: component(
        '<ResolveNode node={props.icon}>{(icon, hasIcon) => (<>{hasIcon() ? <i>{icon()}</i> : <b />}</>)}</ResolveNode>',
      ),
      errors: [{ messageId: 'notJsx', data: { component: 'ResolveNode' } }],
    },
    {
      name: 'a ternary on a prop, which the fix makes follow the prop too',
      code: component(
        '<PresentWhileNode node={props.actions}>{(actions) => props.onClick ? <div>{actions()}</div> : actions()}</PresentWhileNode>',
      ),
      output: component(
        '<PresentWhileNode node={props.actions}>{(actions) => <>{props.onClick ? <div>{actions()}</div> : actions()}</>}</PresentWhileNode>',
      ),
      errors: [{ messageId: 'notJsx', data: { component: 'PresentWhileNode' } }],
    },
    {
      name: "an inner callback returning a condition on the enclosing callback's accessor",
      code: component(
        '<ResolveNode node={props.title}>{(title, hasTitle) => <ResolveNode node={props.actions}>{(actions) => hasTitle() && <header>{title()}{actions()}</header>}</ResolveNode>}</ResolveNode>',
      ),
      output: component(
        '<ResolveNode node={props.title}>{(title, hasTitle) => <ResolveNode node={props.actions}>{(actions) => <>{hasTitle() && <header>{title()}{actions()}</header>}</>}</ResolveNode>}</ResolveNode>',
      ),
      errors: [{ messageId: 'notJsx', data: { component: 'ResolveNode' } }],
    },
    {
      name: 'a block body returning the node read once',
      code: component('<ResolveNode node={props.item}>{(node) => { return node() }}</ResolveNode>'),
      output: component(
        '<ResolveNode node={props.item}>{(node) => { return <>{node()}</> }}</ResolveNode>',
      ),
      errors: [{ messageId: 'notJsx', data: { component: 'ResolveNode' } }],
    },
    {
      name: 'an accessor read in a statement, through the children attribute',
      code: component(
        '<PresentWhileNode node={props.footer} children={(node) => { const value = node(); return <footer>{value}</footer> }} />',
      ),
      errors: [{ messageId: 'once', data: { call: 'node()', component: 'PresentWhileNode' } }],
    },
  ],
})
