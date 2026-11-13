// @vitest-environment jsdom
/**
 * Angular binding conformance: every `@molecule/app-react` hook, run from the
 * shared framework-neutral cases under the same services, must produce the
 * React reference results (values after every step, service and callback
 * calls, method outcomes, no subscription left after unmount). See
 * `@molecule/app-framework-conformance`.
 *
 * `conformance/known-gaps.json` lists cases that do not match yet; it may only
 * shrink. `CONFORMANCE_HOOKS=useAuth,useForm` narrows a local run.
 *
 * @module
 */

import {
  type BindingKnownGaps,
  runBindingConformance,
} from '@molecule/app-framework-conformance/bindings'

import { angularBindingAdapter } from './conformance/binding-adapter.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }

runBindingConformance(angularBindingAdapter, { knownGaps: knownGaps as BindingKnownGaps })
