<!--
  CookieBanner: the Svelte counterpart of `@molecule/app-cookie-banner-react`'s
  `CookieBanner` — the same props (React names), the same DOM for the same
  input, the same callback calls. Two modes: Accept / Reject only, or
  per-category switches behind "Customize" when `categories` are supplied.
  Node-valued props (`title`, `description`, category labels) are snippets, or
  plain strings passed verbatim.

  The template's whitespace is deliberate: every element sits on its own line
  with no whitespace-only text between siblings React does not render.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Switch } from '@molecule/app-ui-svelte'

  import type { ReactNodeProp } from './node-prop.js'
  import type { CookieBannerProps } from './types.js'

  let {
    categories,
    onAcceptAll,
    onRejectAll,
    onSave,
    title,
    description,
    policyHref,
    visible = true,
    onDismiss,
    className,
  }: CookieBannerProps = $props()

  /** React's inline style for the banner, written the way React writes it. */
  const BANNER_STYLE =
    'position: fixed; left: 16px; right: 16px; bottom: 16px; z-index: 60; background: var(--color-surface, #fff); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.18); max-width: 720px; margin-left: auto; margin-right: auto'

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Generated ids (never derived from data — React's `useId()`; Svelte allows
  // one `$props.id()` per component, so the name ids derive from it): the
  // details list's id, wired to the Customize/Hide details button's
  // `aria-controls`, and the base of each category row's label/description
  // ids, which name and describe that row's switch so every `role="switch"`
  // has an accessible name.
  const baseId = $props.id()
  const detailsId = `${baseId}-details`
  const nameId = `${baseId}-name`

  /** React's `{' '}` between the description and the policy link (a runtime text node, so the compiler keeps it). */
  const SPACE = ' '

  let showDetails = $state(false)

  /**
   * React's `useState` initializer: captured once, from the mount-time
   * categories — a later `categories` change keeps the toggled state.
   * @returns The initial per-category consent map.
   */
  function initialEnabled(): Record<string, boolean> {
    const init: Record<string, boolean> = {}
    for (const category of categories ?? [])
      init[category.id] = category.required === true || !!category.defaultEnabled
    return init
  }

  let enabled = $state<Record<string, boolean>>(initialEnabled())

  /**
   * Calls the optional callback then fires the shared onDismiss handler.
   * @param fn - The mode-specific callback.
   */
  function dismissAfter(fn?: () => void): void {
    fn?.()
    onDismiss?.()
  }

  /**
   * Flips one category's enabled state, as React's `setEnabled` does.
   * @param id - The category id.
   * @param checked - The switch's new checked state.
   */
  function setCategory(id: string, checked: boolean): void {
    enabled = { ...enabled, [id]: checked }
  }
</script>

{#snippet node(value: ReactNodeProp, fallback: string)}
  {#if value === undefined || value === null}{fallback}{:else if typeof value === 'function'}{@render value?.()}{:else}{value}{/if}
{/snippet}

{#snippet space()}{SPACE}{/snippet}

{#if visible}
  <div
    role="dialog"
    aria-label={t('cookieBanner.title', {}, { defaultValue: 'Cookie preferences' })}
    class={cm.cn(cm.stack(3), cm.sp('p', 4), className)}
    style={BANNER_STYLE}
  >
    <header class={cm.stack(1)}>
      <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
        {@render node(title, t('cookieBanner.title', {}, { defaultValue: 'Cookie preferences' }))}
      </h3>
      <p class={cm.textSize('sm')}>
        {@render node(
          description,
          t(
            'cookieBanner.description',
            {},
            { defaultValue: 'We use cookies to improve your experience and analyse traffic.' },
          ),
        )}{#if policyHref}{@render space()}<a href={policyHref} class={cm.link}
            >{t('cookieBanner.learnMore', {}, { defaultValue: 'Learn more' })}</a
          >.{/if}
      </p>
    </header>
    {#if showDetails && categories}
      <div id={detailsId} class={cm.stack(2)}>
        {#each categories as category, index (category.id)}
          <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <div class={cm.cn(cm.flex1, cm.stack(0))}>
              <span
                id={`${nameId}-${index}`}
                class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
                >{@render node(category.label, '')}</span
              >
              {#if category.description}<span
                  id={`${nameId}-${index}-description`}
                  class={cm.textSize('xs')}>{@render node(category.description, '')}</span
                >{/if}
            </div>
            <Switch
              checked={!!enabled[category.id] || !!category.required}
              disabled={category.required}
              aria-labelledby={`${nameId}-${index}`}
              aria-describedby={category.description ? `${nameId}-${index}-description` : undefined}
              onChange={(event) =>
                setCategory(category.id, (event.target as HTMLInputElement).checked)}
            />
          </div>
        {/each}
      </div>
    {/if}
    <footer class={cm.flex({ align: 'center', justify: 'end', gap: 'sm', wrap: 'wrap' })}>
      {#if categories}<Button
          variant="ghost"
          size="sm"
          aria-expanded={showDetails}
          aria-controls={showDetails && categories ? detailsId : undefined}
          onClick={() => (showDetails = !showDetails)}
          >{showDetails
            ? t('cookieBanner.hideDetails', {}, { defaultValue: 'Hide details' })
            : t('cookieBanner.customize', {}, { defaultValue: 'Customize' })}</Button
        >{/if}
      <Button variant="ghost" onClick={() => dismissAfter(onRejectAll)}
        >{t('cookieBanner.reject', {}, { defaultValue: 'Reject all' })}</Button
      >
      {#if showDetails && categories && onSave}<Button
          variant="outline"
          onClick={() => dismissAfter(() => onSave?.(enabled))}
          >{t('cookieBanner.save', {}, { defaultValue: 'Save preferences' })}</Button
        >{/if}
      <Button variant="solid" color="primary" onClick={() => dismissAfter(onAcceptAll)}
        >{t('cookieBanner.accept', {}, { defaultValue: 'Accept all' })}</Button
      >
    </footer>
  </div>
{/if}
