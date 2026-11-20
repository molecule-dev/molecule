import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, it } from 'vitest'

import rule from '../../eslint-rules/no-dom-events-in-angular-check-hooks.mjs'

/**
 * Unit tests for `molecule-local/no-dom-events-in-angular-check-hooks`: a focus, blur, click or
 * dispatched event while Angular checks the view reports, wherever the hook reaches it through
 * the class's own methods; the same call from an after-render hook, a timer, a promise or an event
 * handler stays silent.
 *
 * @module
 */

RuleTester.describe = describe
RuleTester.it = it

type RuleModule = Parameters<RuleTester['run']>[1]

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' },
})

const cls = (members: string): string => `class C {\n${members}\n}`

ruleTester.run('no-dom-events-in-angular-check-hooks', rule as RuleModule, {
  valid: [
    {
      name: 'focus from afterEveryRender in the constructor',
      code: cls('constructor() { afterEveryRender({ write: () => this.row?.focus() }) }'),
    },
    {
      name: 'focus deferred by afterNextRender inside a hook',
      code: cls(
        'ngAfterViewInit(): void { afterNextRender(() => this.input.focus(), { injector: this.injector }) }',
      ),
    },
    {
      name: 'focus in a timer or a promise from a hook',
      code: cls(
        'ngOnInit(): void { setTimeout(() => this.el.focus()); this.ready.then(() => this.el.blur()) }',
      ),
    },
    {
      name: 'focus in an event handler method no hook calls',
      code: cls(
        'onKeyDown(): void { this.row.focus() }\nngAfterViewChecked(): void { this.measure() }\nmeasure(): void { this.width = 1 }',
      ),
    },
    {
      name: 'a method named focus on another object is not a DOM call when not called',
      code: cls(
        'ngAfterViewChecked(): void { this.syncHeight() }\nsyncHeight(): void { this.el.style.height = "1px" }',
      ),
    },
    {
      name: 'a focus restore from ngOnDestroy deferred past the render',
      code: cls(
        'ngOnDestroy(): void { afterNextRender(() => this.opener.focus(), { injector: this.environmentInjector }) }',
      ),
    },
    {
      name: 'scrollIntoView fires its scroll later',
      code: cls('ngAfterViewChecked(): void { this.el.scrollIntoView() }'),
    },
  ],
  invalid: [
    {
      name: 'focus directly in ngAfterViewChecked',
      code: cls('ngAfterViewChecked(): void { rows[this.i]?.focus() }'),
      errors: [
        {
          messageId: 'event',
          data: { call: 'focus', hook: 'ngAfterViewChecked', path: '', injector: '' },
        },
      ],
    },
    {
      name: 'focus in ngAfterViewInit',
      code: cls('ngAfterViewInit(): void { this.input.nativeElement.focus() }'),
      errors: [{ messageId: 'event' }],
    },
    {
      name: 'blur, click and dispatchEvent in the other check hooks',
      code: cls(
        'ngOnChanges(): void { this.el.blur() }\nngDoCheck(): void { this.el.click() }\nngAfterContentChecked(): void { this.el.dispatchEvent(new Event("x")) }',
      ),
      errors: [{ messageId: 'event' }, { messageId: 'event' }, { messageId: 'event' }],
    },
    {
      name: 'focus in ngOnDestroy, which runs during the check when a parent template removes the view',
      code: cls(
        'ngOnDestroy(): void { this.restoreFocus() }\nrestoreFocus(): void { this.opener.focus() }',
      ),
      errors: [
        {
          messageId: 'event',
          data: {
            call: 'focus',
            hook: 'ngOnDestroy',
            path: ' (through this.restoreFocus())',
            injector:
              ", with `{ injector: inject(EnvironmentInjector) }` (the component's own injector is being destroyed)",
          },
        },
      ],
    },
    {
      name: 'reached through this.method() calls, any depth',
      code: cls(
        'ngAfterViewInit(): void { this.open() }\nopen(): void { this.focusField() }\nfocusField(): void { this.field.focus() }',
      ),
      errors: [
        {
          messageId: 'event',
          data: {
            call: 'focus',
            hook: 'ngAfterViewInit',
            path: ' (through this.open() → this.focusField())',
            injector: '',
          },
        },
      ],
    },
    {
      name: 'a synchronous array callback runs during the hook',
      code: cls('ngAfterViewChecked(): void { this.rows.forEach((row) => row.focus()) }'),
      errors: [{ messageId: 'event' }],
    },
    {
      name: 'one report per call, however many hooks reach it',
      code: cls(
        'ngAfterViewInit(): void { this.sync() }\nngAfterViewChecked(): void { this.sync() }\nsync(): void { this.el.focus() }',
      ),
      errors: [{ messageId: 'event' }],
    },
  ],
})
