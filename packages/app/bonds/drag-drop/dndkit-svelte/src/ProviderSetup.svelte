<script lang="ts">
  /**
   * Gives the list's manager the list's own plugins, sensors and modifiers.
   *
   * @module
   */

  import { getDragDropManager } from '@dnd-kit/svelte'

  import type { SortableListModifiers, SortableListSensors } from '@molecule/app-drag-drop-dndkit'

  /** The list's configured sensors and axis modifiers. */
  interface Props {
    /** The list's configured sensors. */
    sensors: SortableListSensors
    /** The list's axis modifiers. */
    modifiers: SortableListModifiers
  }

  let { sensors, modifiers }: Props = $props()

  const manager = getDragDropManager()

  // `DragDropProvider` builds its manager with dnd-kit's default plugins, sensors and modifiers and
  // only applies those props afterwards, and dnd-kit keeps an already-registered instance, updating
  // the options that instance read when it was constructed. Emptying the registries here — in a
  // child whose effect runs before the rows' — removes those defaults, so the provider's own
  // assignment builds each from the list's options. The sensors are registered here too: a sensor
  // attaches its listeners when it registers, so it has to be in place before the rows are.
  $effect(() => {
    manager.plugins = []
    manager.sensors = []
    manager.modifiers = []
    // The shared helpers are typed as a list or a function of dnd-kit's defaults; both return a list.
    if (Array.isArray(sensors)) manager.sensors = sensors
    if (Array.isArray(modifiers)) manager.modifiers = modifiers
  })
</script>
