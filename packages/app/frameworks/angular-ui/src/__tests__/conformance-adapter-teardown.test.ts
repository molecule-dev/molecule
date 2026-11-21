// @vitest-environment jsdom
/**
 * The conformance kit's Angular adapter destroys a case's application when the component
 * throws while it first renders. The runner gets no mounted case to tear down then, so the
 * adapter used to leave that application (its effects, its listeners) running into the cases
 * after it, which then recorded its work as their own.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import { ApplicationRef, Component, inject } from '@angular/core'
import { describe, expect, it } from 'vitest'

import * as AppAngular from '@molecule/app-angular'
import { createAngularAdapter } from '@molecule/app-framework-conformance/adapters/angular'

/** The applications torn down, by the component that ran in them. */
const destroyed: string[] = []

/** Registers for its application's teardown, as a long-lived subscription does, then throws. */
const Thrower = Component({ selector: 'mol-thrower', template: '' })(
  class {
    constructor() {
      inject(ApplicationRef).onDestroy(() => destroyed.push('Thrower'))
      throw new Error('the first render broke')
    }
  },
)

/** The counterexample: registers for its application's teardown and renders. */
const Renders = Component({ selector: 'mol-renders', template: 'rendered' })(
  class {
    constructor() {
      inject(ApplicationRef).onDestroy(() => destroyed.push('Renders'))
    }
  },
)

const adapter = createAngularAdapter({ exports: { Thrower, Renders }, binding: AppAngular })

describe('the Angular conformance adapter', () => {
  it('destroys the application of a component whose first render throws', async () => {
    destroyed.length = 0
    await expect(adapter.run('Thrower', { name: 'a first render that throws' })).rejects.toThrow(
      'the first render broke',
    )
    expect(destroyed).toEqual(['Thrower'])
  })

  it('counterexample: a component that renders is destroyed once, at the end of its case', async () => {
    destroyed.length = 0
    const result = await adapter.run('Renders', { name: 'a component that renders' })
    expect(result.snapshots[0]).toContain('rendered')
    expect(destroyed).toEqual(['Renders'])
  })
})
