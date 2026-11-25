// @vitest-environment jsdom
/**
 * `Link` against react-router `<Link>`'s behavior: the shared
 * `@molecule/app-framework-conformance/link` cases, mounted as a real Vue app
 * with `moleculePlugin` carrying the router, or with no router for a case that
 * mounts none.
 *
 * @module
 */

import { createApp, h, ref } from 'vue'

import { runLinkConformance } from '@molecule/app-framework-conformance/link'

import { Link } from '../link.js'
import { moleculePlugin } from '../plugin.js'

runLinkConformance(
  '@molecule/app-vue',
  async (container, router, props) => {
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
    // The plugin without a router when none is mounted: an app with no router installs it the same way.
    app.use(moleculePlugin, { router: router ?? undefined })
    app.mount(container)
    return {
      setTo: async (next) => {
        to.value = next
      },
      unmount: async () => app.unmount(),
    }
  },
  'vue.error.useRouterOutsideProvider',
)
