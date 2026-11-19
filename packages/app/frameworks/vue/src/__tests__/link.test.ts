// @vitest-environment jsdom
/**
 * `Link` against react-router `<Link>`'s behavior: the shared
 * `@molecule/app-framework-conformance/link` cases, mounted as a real Vue app
 * with `moleculePlugin` carrying the router.
 *
 * @module
 */

import { createApp, h, ref } from 'vue'

import { runLinkConformance } from '@molecule/app-framework-conformance/link'

import { Link } from '../link.js'
import { moleculePlugin } from '../plugin.js'

runLinkConformance('@molecule/app-vue', async (container, router, props) => {
  const to = ref(props.to)
  const app = createApp({
    render: () =>
      h(
        Link,
        {
          to: to.value,
          replace: props.replace,
          state: props.state,
          onClick: props.onClick,
          // A template ref on `Link` reaches its anchor as the component's `$el`.
          ref: (instance) => {
            const element =
              instance === null || instance instanceof Element ? instance : instance.$el
            props.ref?.(element instanceof HTMLAnchorElement ? element : null)
          },
          ...props.attrs,
        },
        () => props.text,
      ),
  })
  app.use(moleculePlugin, { router })
  app.mount(container)
  return {
    setTo: async (next) => {
      to.value = next
    },
    unmount: async () => app.unmount(),
  }
})
