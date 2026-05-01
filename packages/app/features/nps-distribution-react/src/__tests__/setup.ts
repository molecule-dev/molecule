import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

// Wire a real ClassMap once for the whole test file so `getClassMap()`
// inside the components under test resolves to the Tailwind bond.
setClassMap(classMap)
