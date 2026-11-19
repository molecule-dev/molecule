/**
 * The slow route: kit loads this module before it renders the article, which is where the
 * router's own lazy route loading keeps the previous page mounted (React's `React.lazy`
 * under one shared boundary). The test releases the deferred.
 *
 * @module
 */

import { slowLoad } from '../../../../lib/lazy.js'

/** kit's page load: waits until the test releases it. */
export const load = async (): Promise<Record<string, never>> => {
  await slowLoad()
  return {}
}
