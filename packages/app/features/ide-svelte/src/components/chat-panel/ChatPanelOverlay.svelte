<!--
  React's section “Panel overlay popup (/skills, /scripts, /settings)”
  (ChatPanel.tsx lines 7514–7659): the closeable popup above the composer,
  mirroring the model and sounds picker shells. A thin header bar carries the
  title (left) and the ✕ (right) — NOT absolutely positioned over the card, so
  it never overlaps the card's own top-right actions (New skill / New script).
  The card mounts `embedded` in the scrollable body below, rendering transparent
  so the overlay's `cm.surface` is the single clean background.

  A non-modal popover dialog: it takes its name from the same translated heading
  its header renders. Escape closes it from anywhere inside (the `chat:overlay`
  slice's window listener); the ✕ closes it here.
-->
<script lang="ts">
  import { type CommandId, panelOverlayHeading } from '@molecule/app-ide-panel-logic'

  import ScriptsCard from '../../parts/ScriptsCard.svelte'
  import SettingsCard from '../../parts/SettingsCard.svelte'
  import SkillsCard from '../../parts/SkillsCard.svelte'
  import TestsCard from '../TestsCard.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()

  /**
   * Why the tests browser's Fix button is unavailable, already translated, or
   * null when it is available — a viewer may not fix, and a live turn must
   * finish first.
   *
   * @returns The reason, or null.
   */
  function fixDisabledReason(): string | null {
    if (ctx.props.canEdit === false) {
      return ctx.env.t('ide.tests.viewerCannotRun', undefined, {
        defaultValue: 'Only editors can run this project’s tests.',
      })
    }
    if (ctx.chat.isLoading || ctx.chat.isRemoteStreaming) {
      return ctx.env.t('ide.tests.fixBusy', undefined, {
        defaultValue: 'Wait for the current turn to finish.',
      })
    }
    return null
  }
</script>

{#if ctx.overlay.panelOverlay}
  {@const overlay = ctx.overlay.panelOverlay}
  <div
    class={ctx.env.cm.cn(ctx.env.cm.surface, ctx.env.cm.borderAll)}
    role="dialog"
    aria-label={panelOverlayHeading(ctx.env.t, overlay)}
    style="position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 0; border-radius: 6px 6px 0 0; z-index: 100; box-shadow: 0 -4px 16px rgba(0,0,0,0.25); display: flex; flex-direction: column; max-height: {ctx
      .env.popupMaxHeight}"
  >
    <!-- Header bar — title on the left, ✕ on the right (mirrors the /sounds
         popup header). The title reuses each panel's existing heading key. -->
    <div
      class={ctx.env.cm.cn(ctx.env.cm.textSize('xs'), ctx.env.cm.textMuted)}
      style="padding: 5px 12px; border-bottom: 1px solid rgba(128,128,128,0.12); flex-shrink: 0; display: flex; justify-content: space-between; align-items: center"
    >
      <span class={ctx.env.cm.fontWeight('medium')}>
        {panelOverlayHeading(ctx.env.t, overlay)}
      </span>
      <button
        type="button"
        data-mol-id="panel-overlay-close"
        aria-label={ctx.env.t('ide.chat.closeOverlay', undefined, { defaultValue: 'Close' })}
        onclick={() => ctx.overlay.setPanelOverlay(null)}
        style="border: none; cursor: pointer; color: inherit; padding: 0 2px; font-size: 14px; line-height: 1; opacity: 0.6;{ctx
          .env.isCoarse
          ? ' display: inline-flex; align-items: center; justify-content: center; min-width: 36px; min-height: 36px'
          : ''}"
        style:background="none"
      >
        ✕
      </button>
    </div>
    <div style="overflow-y: auto; flex: 1">
      {#if overlay === 'settings'}
        <SettingsCard
          settings={ctx.timeline.computeSettingsList()}
          onRunCommand={(commandId: CommandId) => void ctx.commands.executeCommand(commandId)}
          onPrefillInput={(input: string) => ctx.input.setInputAndCursorEnd(`${input} `)}
          isLight={ctx.env.isLight}
          agentName={ctx.agentName}
          embedded
        />
      {:else if overlay === 'skills'}
        <SkillsCard
          projectId={ctx.props.projectId}
          initialQuery={ctx.overlay.panelOverlayQuery}
          onLoad={ctx.skills.loadSkill}
          onCreate={ctx.skills.createSkill}
          loadedSkillPaths={ctx.skills.loadedSkillPaths}
          defaultSkillPaths={ctx.skills.defaultSkillPaths}
          onToggleDefault={ctx.skills.toggleDefaultSkill}
          onResetDefault={ctx.skills.resetDefaultSkills}
          defaultsExplicit={ctx.skills.defaultSkillsExplicit}
          isLight={ctx.env.isLight}
          embedded
        />
      {:else if overlay === 'scripts'}
        <ScriptsCard
          projectId={ctx.props.projectId}
          initialQuery={ctx.overlay.panelOverlayQuery}
          isLight={ctx.env.isLight}
          agentName={ctx.agentName}
          embedded
        />
      {:else if overlay === 'tests'}
        {#if ctx.props.nativeTests}
          {@render ctx.props.nativeTests.history()}
        {/if}
        <TestsCard
          tests={ctx.tests.testsList}
          status={ctx.tests.testsStatus}
          run={ctx.tests.testsRun}
          agentName={ctx.agentName}
          initialQuery={ctx.overlay.panelOverlayQuery}
          canRun={(ctx.props.canRunTests ?? ctx.props.canEdit !== false) &&
            ctx.props.canEdit !== false}
          onRun={ctx.tests.startTestsRun}
          onCancel={ctx.tests.cancelTestsRun}
          onSkipCurrent={ctx.tests.skipCurrentTest}
          onFix={ctx.tests.fixTests}
          fixDisabledReason={fixDisabledReason()}
          isLight={ctx.env.isLight}
          embedded
        />
      {/if}
    </div>
  </div>
{/if}
