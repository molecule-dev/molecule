<!--
  Inline verification result badge.

  Svelte counterpart of `@molecule/app-ide-react`'s `VerificationBadge` (see
  that file for the design notes): the same props (React names), the same DOM
  for the same input, the same behaviour. A green check for a pass — with the
  stored render-check advisory in the theme's warning token, never an inline
  colour — and an expandable error card for a failure, its label counted per
  category and its output behind the disclosure. The component is a part, so it
  lives in `src/parts/`.
-->
<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type VerificationBadgeProps = types.VerificationBadgeProps
</script>

<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  let {
    status,
    output,
    categories,
    renderCheckUnavailable = false,
  }: VerificationBadgeProps = $props()

  const { t } = useTranslation()
  const cm = getClassMap()

  let expanded = $state(false)

  const isLintOnly = $derived(
    (categories ?? []).length > 0 && (categories ?? []).every((category) => category === 'lint'),
  )
  const borderColor = $derived(isLintOnly ? 'rgba(234, 179, 8, 0.4)' : 'rgba(248, 81, 73, 0.3)')
  const bgColor = $derived(isLintOnly ? 'rgba(234, 179, 8, 0.06)' : 'rgba(248, 81, 73, 0.06)')
  const textColor = $derived(isLintOnly ? '#d4a017' : '#f85149')

  const failureLabel = $derived.by((): string => {
    const cats = categories ?? []
    const text = output
    const errorCount = text ? (text.match(/\berror\b/gi) ?? []).length || 1 : 1
    const warningCount = text ? (text.match(/\bwarning\b/gi) ?? []).length : 0
    const parts: string[] = []
    if (cats.includes('type')) {
      const n = text ? (text.match(/error TS\d+/g) ?? []).length || errorCount : errorCount
      parts.push(
        n === 1
          ? t('ide.chat.typeErrorCount', { count: 1 }, { defaultValue: '1 type error' })
          : t('ide.chat.typeErrorsCount', { count: n }, { defaultValue: '{{count}} type errors' }),
      )
    }
    if (cats.includes('lint')) {
      const n = text ? (text.match(/\d+:\d+\s+error/g) ?? []).length || 1 : 1
      const w = warningCount
      if (n > 0)
        parts.push(
          n === 1
            ? t('ide.chat.lintErrorCount', { count: 1 }, { defaultValue: '1 lint error' })
            : t(
                'ide.chat.lintErrorsCount',
                { count: n },
                { defaultValue: '{{count}} lint errors' },
              ),
        )
      if (w > 0)
        parts.push(
          w === 1
            ? t('ide.chat.lintWarningCount', { count: 1 }, { defaultValue: '1 warning' })
            : t('ide.chat.lintWarningsCount', { count: w }, { defaultValue: '{{count}} warnings' }),
        )
    }
    if (cats.includes('runtime')) {
      parts.push(t('ide.chat.runtimeErrors', undefined, { defaultValue: 'Runtime errors' }))
    }
    return parts.length > 0
      ? parts.join(', ')
      : t('ide.chat.verificationFailed', undefined, { defaultValue: 'Errors found' })
  })
</script>

{#if status === 'ok'}
  <div
    style="display: flex; align-items: baseline; gap: 6px; padding: 3px 0px; font-size: 13px"
    class={cm.textMuted}
  >
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      style="flex-shrink: 0; align-self: center; position: relative; top: -1px"
    >
      <path
        d="M2 5.5 L4.2 7.8 L8 3"
        fill="none"
        stroke="#3fb950"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>
    </svg>
    <span>
      {t('ide.chat.verificationPassed', undefined, {
        defaultValue: 'Checks passed',
      })}{#if renderCheckUnavailable}<span
          data-mol-id="render-check-unavailable"
          class={cm.textWarning}
          >{` · ${t('ide.chat.renderCheckUnavailable', undefined, {
            defaultValue: 'Render check unavailable',
          })}`}</span
        >{/if}
    </span>
  </div>
{:else}
  <div
    style={`margin: 4px 0px; border-radius: 6px; border: 1px solid ${borderColor}; background: ${bgColor}; overflow: hidden`}
  >
    <button
      type="button"
      onclick={() => {
        expanded = !expanded
      }}
      class={cm.cn(cm.textSize('xs'), cm.w('full'))}
      style={`display: flex; align-items: center; gap: 6px; padding: 5px 8px; border: medium none; color: ${textColor}; cursor: pointer; text-align: left`}
      style:background="transparent"
    >
      <span style="flex: 1">{failureLabel}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width="12"
        height="12"
        style={`flex-shrink: 0; transform: ${
          expanded ? 'rotate(180deg)' : 'rotate(0deg)'
        }; transition: transform 150ms; opacity: 0.6`}
      >
        <polyline
          points="4,6 8,10 12,6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></polyline>
      </svg>
    </button>
    {#if expanded && output}
      <pre
        class={cm.cn(cm.textSize('xs'))}
        style={`margin: 0px; padding: 6px 8px; border-top: 1px solid ${borderColor}; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow: auto; opacity: 0.85; font-family: var(--mol-font-mono, monospace); color: inherit`}>{output}</pre>
    {/if}
  </div>
{/if}
