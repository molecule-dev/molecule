<!--
  Toast: a single toast. The auto-dismiss countdown pauses on hover AND
  focus (WCAG 2.2.1) and resumes with whatever time was left; warning/error
  toasts announce assertively (role=alert), the rest politely (role=status).
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { IconName } from '@molecule/app-icons'
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import type { ColorVariant } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { ToastProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'
  import ReactNode from './ReactNode.svelte'

  /** Map status to toast variant. */
  const statusVariantMap: Record<
    ColorVariant,
    'default' | 'success' | 'warning' | 'error' | 'info'
  > = {
    primary: 'default',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }

  /** Map toast variant to icon name. */
  const statusIconMap: Record<string, IconName> = {
    info: 'info-circle',
    success: 'check-circle',
    warning: 'exclamation-triangle',
    error: 'x-circle',
  }

  let {
    ref = $bindable(null),
    children,
    title,
    description,
    status = 'info',
    duration = 5000,
    dismissible = true,
    onDismiss,
    position: _position = 'bottom-right',
    closeLabel,
    className,
    style,
    testId,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    ...rest
  }: ToastProps = $props()

  let isVisible = $state(true)
  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const variant = $derived(statusVariantMap[status] ?? 'default')
  const iconName = $derived(statusIconMap[variant])

  // The countdown depends ONLY on duration (a parent re-render that changes
  // nothing else must not restart it); the latest onDismiss is read through
  // the prop reference at fire time. The initial `remaining` read is
  // deliberately one-shot — `untrack` says so explicitly.
  let remaining = untrack(() => duration)
  let startedAt: number | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  const clearTimer = (): void => {
    if (timer) clearTimeout(timer)
    timer = undefined
    startedAt = null
  }

  const startTimer = (ms: number): void => {
    clearTimer()
    if (ms <= 0) return
    startedAt = Date.now()
    timer = setTimeout(() => {
      isVisible = false
      onDismiss?.()
    }, ms)
  }

  const pauseTimer = (): void => {
    if (startedAt === null) return
    const elapsed = Date.now() - startedAt
    remaining = Math.max(0, remaining - elapsed)
    clearTimer()
  }

  const resumeTimer = (): void => {
    if (remaining > 0) startTimer(remaining)
  }

  $effect(() => {
    remaining = duration
    startTimer(duration)
    return clearTimer
  })

  const handleDismiss = (): void => {
    isVisible = false
    onDismiss?.()
  }

  // Every other declared prop (id, aria-*, data-*, automationId as data-mol-id,
  // the DOM event handlers) reaches the root; a caller's role replaces the
  // live-region default.
  const attributes = $derived(reactAttrs(withoutEvents(rest)))

  // The timer pauses while the pointer or focus is on the toast; the caller's
  // handlers for the same events run after it.
  const handleMouseEnter = (event: MouseEvent): void => {
    pauseTimer()
    onMouseEnter?.(event)
  }
  const handleMouseLeave = (event: MouseEvent): void => {
    resumeTimer()
    onMouseLeave?.(event)
  }
  const handleFocusIn = (event: FocusEvent): void => {
    pauseTimer()
    onFocus?.(event)
  }
  const handleFocusOut = (event: FocusEvent): void => {
    resumeTimer()
    onBlur?.(event)
  }
</script>

{#if isVisible}
  {@const role = variant === 'warning' || variant === 'error' ? 'alert' : 'status'}
  <div
    bind:this={ref}
    {role}
    data-state="open"
    class={cm.cn(cm.toast({ variant }), className)}
    use:reactStyle={style}
    data-testid={testId}
    {...attributes}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    onfocusin={handleFocusIn}
    onfocusout={handleFocusOut}
    use:spreadEvents={rest}
  >
    {#if iconName}<span class={cm.toastIconWrapper}
        ><IconGlyph name={iconName} className={cm.iconMd} /></span
      >{/if}
    <div class={cm.toastContentWrapper}>
      {#if title}<div class={cm.toastTitle}><ReactNode node={title} /></div>{/if}
      {#if description || children}
        <PresentWhileContent class={cm.toastDescription}
          >{#if description}<ReactNode node={description} />{:else}{@render children?.()}{/if}
        </PresentWhileContent>
      {/if}
    </div>
    {#if dismissible}
      <button
        type="button"
        onclick={handleDismiss}
        class={cm.toastClose}
        aria-label={closeLabel ?? t('ui.toast.close', undefined, { defaultValue: 'Close' })}
      >
        <IconGlyph name="x-mark" className={cm.iconSm} />
      </button>
    {/if}
  </div>
{/if}
