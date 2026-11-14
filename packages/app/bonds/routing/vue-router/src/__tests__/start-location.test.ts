// @vitest-environment jsdom
/**
 * A REAL Vue Router before its first navigation: the app mounts while Vue Router still
 * reports its start route (`/`), so the molecule router must read the address being opened.
 * Reading the start route sent a deep link to a public page (`/signup`) through a
 * signed-in-only guard on `/`, which redirected it to the login page.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'

import type { Router } from '@molecule/app-routing'

import { createVueRouter } from '../index.js'

/** A component the routes render (nothing — only the location is under test). */
const Empty = { render: (): null => null }

const routes = [
  { path: '/', component: Empty },
  { path: '/signup', component: Empty },
  { path: '/users/:id', component: Empty },
]

describe('before Vue Router has navigated', () => {
  let router: Router | undefined

  afterEach(() => {
    router?.destroy()
    router = undefined
    window.history.replaceState(null, '', '/')
  })

  it('reports the address being opened, not the start route', () => {
    window.history.replaceState(null, '', '/signup?ref=mail#form')
    const vueRouter = createRouter({ history: createWebHistory(), routes })
    expect(vueRouter.currentRoute.value).toBe(START_LOCATION)

    router = createVueRouter({ router: vueRouter })

    expect(router.getLocation()).toMatchObject({
      pathname: '/signup',
      search: '?ref=mail',
      hash: '#form',
    })
  })

  it('reads the params of the address being opened', () => {
    window.history.replaceState(null, '', '/users/42')
    const vueRouter = createRouter({ history: createWebHistory(), routes })

    router = createVueRouter({ router: vueRouter })

    expect(router.getParams()).toEqual({ id: '42' })
  })

  it('follows Vue Router once it has navigated', async () => {
    window.history.replaceState(null, '', '/signup')
    const vueRouter = createRouter({ history: createWebHistory(), routes })
    router = createVueRouter({ router: vueRouter })

    await vueRouter.push('/users/7')

    expect(router.getLocation().pathname).toBe('/users/7')
    expect(router.getParams()).toEqual({ id: '7' })
  })
})
