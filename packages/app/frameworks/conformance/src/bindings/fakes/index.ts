/**
 * Every area's fakes factory, in the order their services are merged.
 *
 * @module
 */

import type { AreaFakesFactory } from '../spec.js'
import { createAsyncFakes } from './async.js'
import { createAuthFlowsFakes } from './auth-flows.js'
import { createChatFakes } from './chat.js'
import { createChatCardsFakes } from './chat-cards.js'
import { createCoreFakes } from './core.js'
import { createNativeFakes } from './native.js'
import { createQueryFakes } from './query.js'
import { createVoiceFakes } from './voice.js'

/** The area fakes factories every binding case runs. */
export const areaFakesFactories: readonly AreaFakesFactory[] = [
  createAuthFlowsFakes,
  createCoreFakes,
  createAsyncFakes,
  createNativeFakes,
  createChatFakes,
  createChatCardsFakes,
  createQueryFakes,
  createVoiceFakes,
]
