// @vitest-environment jsdom
/**
 * The conformance kit's Angular adapter runs change detection after each timer callback of the
 * mount flush, as it does for every later step and as the app's scheduler does after each task
 * in a browser. A component that restores its state in a timer when it mounts (a chat session
 * re-sending a queued message from its history, say) writes a signal outside change detection;
 * without the tick, zoneless Angular's scheduled render waits on a fake timer nothing advances,
 * `whenStable()` never resolves and the case hangs until its deadline.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { describe, expect, it } from 'vitest'

import * as AppAngular from '@molecule/app-angular'
import { createAngularAdapter } from '@molecule/app-framework-conformance/adapters/angular'

/** Restores its label in a timer as it mounts. */
const RestoresInTimer = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-restores',
  template: '{{ label() }}',
})(
  class {
    label = signal('empty')
    constructor() {
      setTimeout(() => this.label.set('restored'), 0)
    }
  },
)

/** The counterexample: sets its label while it is created. */
const RestoresAtOnce = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-at-once',
  template: '{{ label() }}',
})(
  class {
    label = signal('restored')
  },
)

const adapter = createAngularAdapter({
  exports: { RestoresInTimer, RestoresAtOnce },
  binding: AppAngular,
})

describe('the Angular conformance adapter', () => {
  it('renders a signal a mount-time timer writes before the first snapshot', async () => {
    const result = await adapter.run('RestoresInTimer', {
      name: 'a mount-time timer writes a signal',
      fakeTimers: true,
    })
    expect(result.snapshots[0]).toContain('restored')
  }, 10_000)

  it('counterexample: a component that renders its state at once', async () => {
    const result = await adapter.run('RestoresAtOnce', {
      name: 'a component with its state at once',
      fakeTimers: true,
    })
    expect(result.snapshots[0]).toContain('restored')
  }, 10_000)
})
