// @vitest-environment jsdom
import { render } from 'solid-js/web'

import { runSurfaceGestureConformance } from '@molecule/app-framework-conformance/ui'

import { webDrag } from '../drag.js'

runSurfaceGestureConformance('solid', (container, options) =>
  render(
    () => (
      <section
        data-testid="gesture-surface"
        aria-label="Editing surface"
        ref={(host) => webDrag(host, () => options)}
      >
        <button>Edit</button>
      </section>
    ),
    container,
  ),
)
