<!--
  AppearanceSection: the dark-mode toggle wired to the theme bond. Apps that
  expose other appearance knobs (font size, density, etc.) can either add
  more sub-components to this package or render their own section in line
  with this one via children.
-->
<script lang="ts">
  import { useTheme, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Flex, Switch } from '@molecule/app-ui-svelte'

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const { mode, toggleTheme } = useTheme()
</script>

<section>
  <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
    {t('settings.appearance', undefined, { defaultValue: 'Appearance' })}
  </h3>
  <Flex align="center" justify="between">
    <span class={cm.textSize('sm')}>
      {t('settings.darkMode', undefined, { defaultValue: 'Dark mode' })}
    </span>
    <Switch
      id="settings-theme-toggle"
      aria-label={t('theme.toggle', undefined, { defaultValue: 'Toggle theme' })}
      checked={$mode === 'dark'}
      onChange={() => toggleTheme()}
      size="sm"
    />
  </Flex>
</section>
