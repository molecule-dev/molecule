<!--
  The chat panel dialog for skills, scripts, settings and test runs.
-->
<script lang="ts">
  import { type CommandId, panelOverlayHeading } from '@molecule/app-ide-panel-logic'
  import { Modal } from '@molecule/app-ui-svelte'

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
  <Modal
    open
    onClose={() => ctx.overlay.setPanelOverlay(null)}
    showCloseButton={false}
    size="lg"
    aria-label={panelOverlayHeading(ctx.env.t, overlay)}
    data-mol-id="chat-panel-overlay"
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
          {@render ctx.props.nativeTests.history?.()}
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
  </Modal>
{/if}
