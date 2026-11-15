/**
 * Test setup: give the global scope a real Web Storage implementation.
 *
 * Vitest's happy-dom environment copies the window's globals onto the global
 * object only for names the runtime does not already define. Node 22+ ships an
 * experimental `localStorage`/`sessionStorage` global that is unusable without
 * `--localstorage-file`, and from Node 25 both are defined by default — so on
 * this machine's Node 26 they shadow happy-dom's, and the window and the global
 * scope are the same object: `localStorage.clear()` throws and the auth tests
 * read `undefined`. Installing happy-dom's own `Storage` keeps the suite
 * exercising the browser path on every supported Node (CI pins 22.23.4, where
 * these globals already come from happy-dom and this is a no-op change of
 * implementation).
 *
 * @module
 */

import { Storage } from 'happy-dom'

Object.defineProperty(globalThis, 'localStorage', {
  value: new Storage(),
  configurable: true,
  writable: true,
})
Object.defineProperty(globalThis, 'sessionStorage', {
  value: new Storage(),
  configurable: true,
  writable: true,
})
