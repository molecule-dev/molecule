// @vitest-environment jsdom
/**
 * The router conformance cases, run over a REAL Vue Router in jsdom: the molecule router
 * `createVueRouter` builds from it, driven alongside the Vue Router's own navigations
 * (`router.push` as a link would, `router.back()` as the browser's back button does).
 */
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import { runRouterConformance } from '@molecule/app-framework-conformance/routing'

import { createVueRouter } from '../index.js'

/** A component the harness routes render (nothing — only the history is under test). */
const Empty = { render: (): null => null }

/** The routes every harness declares: `/users/:id` plus a catch-all for every other path. */
const routes = [
  { path: '/users/:id', component: Empty },
  { path: '/:rest(.*)*', component: Empty },
]

runRouterConformance('vue-router', async (initialPath) => {
  window.history.replaceState(null, '', initialPath)
  const vueRouter = createRouter({ history: createWebHistory(), routes })
  await vueRouter.push(initialPath)
  await vueRouter.isReady()
  // Vue Router's popstate handling starts with the plugin installed in an app.
  const app = createApp({ render: (): null => null })
  app.use(vueRouter)
  app.mount(document.createElement('div'))

  const router = createVueRouter({ router: vueRouter })
  return {
    router,
    nativePush: async (path) => {
      await vueRouter.push(path)
    },
    nativeBack: () => vueRouter.back(),
    nativePath: () => vueRouter.currentRoute.value.fullPath,
    settle: async () => {
      await vueRouter.isReady()
      await new Promise((resolve) => setTimeout(resolve, 0))
    },
    teardown: () => {
      router.destroy()
      app.unmount()
    },
  }
})
