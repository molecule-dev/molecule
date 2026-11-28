/**
 * Binds the shared kit component trees to one renderer.
 *
 * @module
 */

import { createAccordion } from './components/Accordion.js'
import { createAlert } from './components/Alert.js'
import { createAvatar } from './components/Avatar.js'
import { createCheckbox } from './components/Checkbox.js'
import { createPagination } from './components/Pagination.js'
import { createRadioGroup } from './components/RadioGroup.js'
import { createSelect } from './components/Select.js'
import { createSpinner } from './components/Spinner.js'
import { createSwitch } from './components/Switch.js'
import { createTable } from './components/Table.js'
import { createTabs } from './components/Tabs.js'
import { createTextarea } from './components/Textarea.js'
import { createToast } from './components/Toast.js'
import type { KitHosts } from './hosts.js'

/** The components bound to an element and overlay renderer. */
export interface ReactKit {
  Accordion: ReturnType<typeof createAccordion>
  Alert: ReturnType<typeof createAlert>
  Avatar: ReturnType<typeof createAvatar>
  Checkbox: ReturnType<typeof createCheckbox>
  Pagination: ReturnType<typeof createPagination>
  RadioGroup: ReturnType<typeof createRadioGroup>
  Select: ReturnType<typeof createSelect>
  Spinner: ReturnType<typeof createSpinner>
  Switch: ReturnType<typeof createSwitch>
  Table: ReturnType<typeof createTable>
  Tabs: ReturnType<typeof createTabs>
  Textarea: ReturnType<typeof createTextarea>
  Toast: ReturnType<typeof createToast>
}

/**
 * Creates the kit components with the supplied renderer hosts.
 * @param hosts - The element, table, switch, and toast hosts for this renderer.
 * @returns The components bound to the renderer.
 */
export function createKit(hosts: KitHosts): ReactKit {
  return {
    Accordion: createAccordion(hosts),
    Alert: createAlert(hosts),
    Avatar: createAvatar(hosts),
    Checkbox: createCheckbox(hosts),
    Pagination: createPagination(hosts),
    RadioGroup: createRadioGroup(hosts),
    Select: createSelect(hosts),
    Spinner: createSpinner(hosts),
    Switch: createSwitch(hosts),
    Table: createTable(hosts),
    Tabs: createTabs(hosts),
    Textarea: createTextarea(hosts),
    Toast: createToast(hosts),
  }
}
