<!--
  ThisDeviceSection: "This device" detail strip — OS, browser, online/offline.

  Reads everything from `@molecule/app-device` through the `useDevice` hook
  (`deviceInfo` and `isOnline()`), so the bonded device provider decides what
  it shows. No side effects, no app-specific state.
-->
<script lang="ts">
  import { useDevice, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Flex } from '@molecule/app-ui-svelte'

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const { deviceInfo, isOnline } = useDevice()
</script>

<section>
  <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
    {t('settings.thisDevice', undefined, { defaultValue: 'This Device' })}
  </h3>
  <dl class={cm.cn(cm.stack(1), cm.textSize('sm'))}>
    <Flex justify="between">
      <dt class={cm.textMuted}>
        {t('settings.platform', undefined, { defaultValue: 'Platform' })}
      </dt>
      <dd>
        {deviceInfo.os.name || t('settings.unknown', undefined, { defaultValue: 'Unknown' })}
      </dd>
    </Flex>
    <Flex justify="between">
      <dt class={cm.textMuted}>
        {t('settings.browser', undefined, { defaultValue: 'Browser' })}
      </dt>
      <dd>
        {deviceInfo.browser.name || t('settings.unknown', undefined, { defaultValue: 'Unknown' })}
      </dd>
    </Flex>
    <Flex justify="between">
      <dt class={cm.textMuted}>
        {t('settings.network', undefined, { defaultValue: 'Network' })}
      </dt>
      <dd>
        {isOnline()
          ? t('settings.online', undefined, { defaultValue: 'Online' })
          : t('settings.offline', undefined, { defaultValue: 'Offline' })}
      </dd>
    </Flex>
  </dl>
</section>
