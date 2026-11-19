<!--
  An action sibling (a locale switch or a translation add from its mount
  effect) rendered BEFORE a reader sibling, which reads through `useT()` or
  `useTranslation()`. React's `Root` with `SwitchOnMount`/`AddOnMount` and a
  later `Greeting`/`LateText`/`Detail`.
-->
<script lang="ts">
  import type { I18nProvider, Translations } from '@molecule/app-i18n'

  import AddOnMount from './AddOnMount.svelte'
  import SwitchOnMount from './SwitchOnMount.svelte'
  import TranslationDetail from './TranslationDetail.svelte'
  import TText from './TText.svelte'

  let {
    provider,
    action,
    to = 'fr',
    translations = {},
    reader = 'late-t',
    readerTestId = 'detail',
    detailText = 'greeting',
    detailShowLocale = true,
  }: {
    provider: I18nProvider
    action: 'switch' | 'add'
    to?: string
    translations?: Translations
    reader?: 'late-t' | 'greeting-t' | 'translation'
    readerTestId?: string
    detailText?: 'greeting' | 'late' | 'both'
    detailShowLocale?: boolean
  } = $props()
</script>

{#if action === 'switch'}
  <SwitchOnMount {provider} {to} />
{:else}
  <AddOnMount {provider} {translations} />
{/if}

{#if reader === 'translation'}
  <TranslationDetail testId={readerTestId} text={detailText} showLocale={detailShowLocale} />
{:else if reader === 'greeting-t'}
  <TText textKey="greeting" fallback="Hello" testId={readerTestId} />
{:else}
  <TText textKey="late" fallback="Pending" testId={readerTestId} />
{/if}
