<!--
  Test host for the QuickPicker keyboard tests: sets the theme provider in
  Svelte context during component initialisation (the only place Svelte context
  is legal) and renders the picker from a props object the test can replace,
  the way React's `rerender` hands the picker a fresh `items` array.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import QuickPicker, { type QuickPickerProps } from '../components/QuickPicker.svelte'

  let { theme, initial }: { theme: ThemeProvider; initial: QuickPickerProps } = $props()

  // The picker's current props (a test replaces them wholesale, as React's
  // `rerender` does with a new props object).
  let pickerProps = $state<QuickPickerProps>({ ...untrack(() => initial) })

  untrack(() => setThemeContext(theme))

  /**
   * Replaces the picker's props (the host re-rendered with new values).
   *
   * @param next - The picker's new props.
   */
  export function setProps(next: QuickPickerProps): void {
    pickerProps = next
  }
</script>

<QuickPicker {...pickerProps} />
