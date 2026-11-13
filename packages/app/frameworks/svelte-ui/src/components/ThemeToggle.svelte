<!--
  ThemeToggle: button that flips the wired theme bond between light and dark.
  Reads mode and toggleTheme from the theme provider in the Molecule context
  and shows the configured dark/light icon accordingly.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { useI18n, useTheme } from '../framework.js'
  import { reactStyle } from '../style.js'
  import type { ThemeToggleProps } from '../types.js'
  import Icon from './Icon.svelte'

  let {
    ariaLabelKey = 'theme.toggle',
    ariaLabelDefault = 'Toggle theme',
    darkIcon = 'moon',
    lightIcon = 'sun',
    iconSize = 20,
    className,
    style,
    ...rest
  }: ThemeToggleProps = $props()

  const { mode, toggleTheme } = useTheme()
  const { t } = useI18n()
  const cm = $derived(getClassMap())
</script>

<button
  type="button"
  data-mol-id="theme-toggle"
  data-mode={$mode}
  aria-pressed={$mode === 'dark'}
  aria-label={$t(ariaLabelKey, {}, { defaultValue: ariaLabelDefault })}
  onclick={toggleTheme}
  class={cm.cn(cm.themeToggleButton, className)}
  use:reactStyle={style}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {#if $mode === 'dark'}<Icon name={darkIcon} size={iconSize} />{:else}<Icon
      name={lightIcon}
      size={iconSize}
    />{/if}
</button>
