<!--
  DevicesSection: lists the user's registered devices and lets them revoke
  (sign out) any device other than the one they're currently using.

  Revoking deletes the device row (`DELETE /api/devices/:id`). The API's
  authorization layer enforces server-side revocation: it rejects that
  device's session the next time it makes a request (within the device-exists
  cache TTL), so the removed device is actually signed out — not just hidden
  from the list. The current device is labelled "This device" and is not
  revocable here (use Sign out for the current session). Recreates molecule
  v1's device-revocation behaviour.

  Apps that want a different trailing element per row can pass a
  `renderRowIcon` snippet (which then replaces the built-in revoke control);
  render nothing in it to suppress it entirely.
-->
<script lang="ts">
  import { useHttpClient, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Flex, Icon, Spinner } from '@molecule/app-ui-svelte'

  import type { Device, DevicesSectionProps } from './types.js'

  let { renderRowIcon }: DevicesSectionProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const http = useHttpClient()

  let devices = $state<Device[]>([])
  let loading = $state(true)
  let confirmingId = $state<string | null>(null)
  let revokingId = $state<string | null>(null)

  const load = async (): Promise<void> => {
    try {
      // GET /api/devices responds with the ARRAY itself (see the device
      // resource's query handler) — response.data IS the rows. This used to
      // read `response.data.data`, which is always undefined for that shape,
      // so the section rendered "No devices" for everyone.
      const response = await http.get<Device[]>('/api/devices')
      devices = Array.isArray(response.data) ? response.data : []
    } catch (_error) {
      // Devices endpoint is optional; the section renders empty when unavailable.
    } finally {
      loading = false
    }
  }

  $effect(() => {
    void load()
  })

  const revoke = async (id: string): Promise<void> => {
    revokingId = id
    try {
      await http.delete(`/api/devices/${id}`)
      confirmingId = null
      await load()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      revokingId = null
    }
  }
</script>

<section>
  <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
    <h3 class={cm.sectionHeading}>
      {t('settings.devices', undefined, { defaultValue: 'Devices' })}
    </h3>
    {#if loading}<Spinner size="xs" />{/if}
  </Flex>
  {#if devices.length > 0}
    <ul class={cm.stack(2)}>
      {#each devices as device (device.id)}
        <li>
          <Flex
            align="center"
            justify="between"
            className={cm.cn(cm.textSize('sm'), cm.sp('py', 1))}
          >
            <span
              >{device.name || device.platform}{#if device.isCurrent}<span
                  class={cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))}
                >
                  {t('settings.thisDevice', undefined, { defaultValue: 'This Device' })}
                </span>{/if}</span
            >
            {#if renderRowIcon}
              {@render renderRowIcon(device)}
            {:else if device.isCurrent}
              <Icon name="chevron-right" size={16} className={cm.textSubtle} />
            {:else if confirmingId === device.id}
              <Flex align="center" gap="sm">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revokingId === device.id}
                  onClick={() => (confirmingId = null)}
                >
                  {t('common.cancel', undefined, { defaultValue: 'Cancel' })}
                </Button>
                <Button
                  color="error"
                  size="sm"
                  loading={revokingId === device.id}
                  onClick={() => revoke(device.id)}
                  data-mol-id="device-revoke-confirm"
                >
                  {t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' })}
                </Button>
              </Flex>
            {:else}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (confirmingId = device.id)}
                data-mol-id="device-revoke"
              >
                {t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' })}
              </Button>
            {/if}
          </Flex>
          {#if confirmingId === device.id}
            <p class={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1))}>
              {t('settings.revokeDeviceWarning', undefined, {
                defaultValue: "This device's access will be revoked shortly. Sign it out?",
              })}
            </p>
          {/if}
        </li>
      {/each}
    </ul>
  {:else if !loading}
    <p class={cm.cn(cm.textSize('sm'), cm.textMuted)}>
      {t('settings.noDevices', undefined, { defaultValue: 'No devices found' })}
    </p>
  {/if}
</section>
