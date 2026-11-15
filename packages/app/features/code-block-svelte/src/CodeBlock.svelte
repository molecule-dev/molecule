<!--
  CodeBlock: the Svelte counterpart of `@molecule/app-code-block-react`'s
  `CodeBlock` — read-only code block with an optional header (filename +
  language tag), optional line numbers, and a copy-to-clipboard button. Same
  props, same DOM for the same input; `code` is rendered as escaped plain text
  (no syntax highlighting), and every visible string goes through `t()` so a
  locale switch re-renders it.

  Two markup details keep the DOM React's: the `<pre>`/`<code>` content is
  written contiguous, and the line spans come from a recursive snippet rather
  than an `{#each}` block — Svelte leaves an empty text node after an each
  block, and inside the `<pre>` that node draws as an extra blank line.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { CodeBlockProps } from './types.js'

  let {
    code,
    language,
    showLineNumbers = true,
    showCopy = true,
    filename,
    className,
  }: CodeBlockProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let copied = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  // Detaches the feedback timer with the component (React leaves it running;
  // the write it would make on a dead component is observable nowhere).
  $effect(() => () => clearTimeout(timer))

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so the label re-runs on a locale switch the way React's render-time
  // `t` call re-runs on a re-render.
  const buttonLabel = $derived(
    copied
      ? t('codeBlock.copied', {}, { defaultValue: 'Copied!' })
      : t('codeBlock.copy', {}, { defaultValue: 'Copy' }),
  )
  const lines = $derived(code.split('\n'))
  const hasHeader = $derived(Boolean(filename || language || showCopy))

  /** The newline each rendered line ends with (React's `{'\n'}`). */
  const eol = '\n'

  /** Copies the code, then shows the "Copied!" feedback for 1500 ms. */
  function copy(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(code).then(() => {
        copied = true
        timer = setTimeout(() => {
          copied = false
        }, 1500)
      })
    }
  }
</script>

<div class={cm.cn(cm.stack(0), className)}>
  {#if hasHeader}
    <header class={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        {#if filename}<span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            >{filename}</span
          >{/if}
        {#if language}<span class={cm.textSize('xs')}>{language}</span>{/if}
      </div>
      {#if showCopy}<Button variant="ghost" size="sm" onClick={copy}>{buttonLabel}</Button>{/if}
    </header>
  {/if}
  <pre class={cm.cn(cm.sp('p', 3), cm.textSize('sm'))}><code
      >{#if showLineNumbers}<span
          >{#snippet lineAt(i: number)}<span
              ><span
                aria-hidden="true"
                style="display: inline-block; width: 2.5em; opacity: 0.4; user-select: none"
                >{i + 1}</span
              >{lines[i]}{eol}</span
            >{#if i + 1 < lines.length}{@render lineAt(i + 1)}{/if}{/snippet}{@render lineAt(
            0,
          )}</span
        >{:else}{code}{/if}</code
    ></pre>
</div>
