import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, it } from 'vitest'

import rule from '../../eslint-rules/angular-test-host-change-detection.mjs'

/**
 * Unit tests for `molecule-local/angular-test-host-change-detection`: a component an Angular test
 * declares with no `changeDetection` reports (Angular 22 checks it as OnPush), as a decorator or
 * as a `Component()` call; one that sets either strategy, or a `Component` that is not Angular's,
 * stays silent. The deprecated `Default` name reports and is fixed to `Eager`.
 *
 * @module
 */

RuleTester.describe = describe
RuleTester.it = it

type RuleModule = Parameters<RuleTester['run']>[1]

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' },
})

const core = "import { ChangeDetectionStrategy, Component } from '@angular/core'\n"

ruleTester.run('angular-test-host-change-detection', rule as RuleModule, {
  valid: [
    {
      name: 'a host that re-renders on every tick',
      code: `${core}@Component({ selector: 'x', changeDetection: ChangeDetectionStrategy.Eager, template: '' }) class X {}`,
    },
    {
      name: 'an OnPush boundary on purpose, as a Component() call',
      code: `${core}const Mid = Component({ selector: 'm', changeDetection: ChangeDetectionStrategy.OnPush, template: '' })(class {})`,
    },
    {
      name: 'options spread from a shared object',
      code: `${core}const base = { changeDetection: ChangeDetectionStrategy.Eager }; @Component({ ...base, selector: 'x' }) class X {}`,
    },
    {
      name: 'a Component that is not Angular’s',
      code: "import { Component } from './fake.js'\nComponent({ selector: 'x' })",
    },
  ],
  invalid: [
    {
      name: 'a decorated host with no strategy',
      code: `${core}@Component({ selector: 'x', template: '{{ p.label }}' }) class X { p = { label: 'a' } }`,
      errors: [{ messageId: 'missing' }],
    },
    {
      name: 'a Component() call under another local name',
      code: "import { Component as C } from '@angular/core'\nconst Host = C({ selector: 'h', template: '' })(class {})",
      errors: [{ messageId: 'missing' }],
    },
    {
      name: 'the deprecated Default name, fixed to Eager',
      code: `${core}@Component({ selector: 'x', changeDetection: ChangeDetectionStrategy.Default }) class X {}`,
      output: `${core}@Component({ selector: 'x', changeDetection: ChangeDetectionStrategy.Eager }) class X {}`,
      errors: [{ messageId: 'deprecated' }],
    },
  ],
})
