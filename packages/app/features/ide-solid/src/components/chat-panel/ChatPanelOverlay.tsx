/**
 * The chat panel's blocking dialog for browsing skills, scripts, settings and
 * test runs. Its heading and content follow the selected view.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import { panelOverlayHeading } from '@molecule/app-ide-panel-logic'
import { DEFAULT_AGENT_NAME } from '@molecule/app-solid'
import { Modal } from '@molecule/app-ui-solid'

import { ScriptsCard } from '../../parts/ScriptsCard.jsx'
import { SettingsCard } from '../../parts/SettingsCard.jsx'
import { SkillsCard } from '../../parts/SkillsCard.jsx'
import { TestsCard } from '../TestsCard.jsx'
import type { ChatInnerCtx } from './context.js'

/**
 * Hands an inline style object to Solid's runtime style diffing.
 *
 * Solid's compiler inlines a fully static `style` object into the template as
 * raw CSS text, while React assigns every declaration through the CSSOM — so a
 * `flex`/`border` shorthand and `background: none` serialize differently, and a
 * later dynamic declaration on the same element re-parses the raw text and can
 * drop a shorthand entirely. Calling through this identity function keeps every
 * declaration on the CSSOM path, so the rendered `style` attribute is the one
 * React writes.
 *
 * @param style - The inline style object.
 * @returns The same object.
 */
const styleOf = (style: JSX.CSSProperties): JSX.CSSProperties => style

/** Props for {@link ChatPanelOverlay}. */
export interface ChatPanelOverlayProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the panel overlay.
 * @param props - The inner ctx (the open view, its query and the cards' inputs).
 * @returns The overlay, or nothing while it is closed.
 */
export function ChatPanelOverlay(props: ChatPanelOverlayProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm
  const t = ctx.env.t

  /**
   * The header ✕'s inline style: the slim fine-pointer header, or the 36px
   * touch floor for this secondary header control.
   * @returns The close button's style.
   */
  const closeStyle = (): JSX.CSSProperties => {
    const base: JSX.CSSProperties = {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'inherit',
      padding: '0 2px',
      'font-size': '14px',
      'line-height': 1,
      opacity: 0.6,
    }
    return ctx.env.isCoarse()
      ? {
          ...base,
          display: 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-width': '36px',
          'min-height': '36px',
        }
      : base
  }

  /**
   * Why fixing the failing tests is unavailable right now (already translated),
   * or null when it is available.
   * @returns The reason, or null.
   */
  const fixDisabledReason = (): string | null => {
    if (ctx.props.canEdit === false)
      return t('ide.tests.viewerCannotRun', undefined, {
        defaultValue: 'Only editors can run this project’s tests.',
      })
    if (ctx.chat.isLoading() || ctx.chat.isRemoteStreaming())
      return t('ide.tests.fixBusy', undefined, {
        defaultValue: 'Wait for the current turn to finish.',
      })
    return null
  }

  return (
    <Show when={ctx.overlay.panelOverlay()}>
      {(overlay) => (
        <Modal
          open
          onClose={() => ctx.overlay.setPanelOverlay(null)}
          showCloseButton={false}
          size="lg"
          aria-label={panelOverlayHeading(t, overlay())}
          data-mol-id="chat-panel-overlay"
        >
          {/* Header bar — title on the left, ✕ on the right (mirrors the
              /sounds popup header). The title reuses each panel's existing
              heading key, so no new i18n key is needed. */}
          <div
            class={cm.cn(cm.textSize('xs'), cm.textMuted)}
            style={styleOf({
              padding: '5px 12px',
              'border-bottom': '1px solid rgba(128,128,128,0.12)',
              'flex-shrink': 0,
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
            })}
          >
            <span class={cm.fontWeight('medium')}>{panelOverlayHeading(t, overlay())}</span>
            <button
              /* mol-bespoke-button: icon-only overlay close — header x, no label */
              type="button"
              data-mol-id="panel-overlay-close"
              aria-label={t('ide.chat.closeOverlay', undefined, { defaultValue: 'Close' })}
              onClick={() => ctx.overlay.setPanelOverlay(null)}
              style={closeStyle()}
            >
              {'✕'}
            </button>
          </div>
          <div style={styleOf({ 'overflow-y': 'auto', flex: 1 })}>
            <Show when={overlay() === 'settings'}>
              <SettingsCard
                settings={ctx.timeline.computeSettingsList()}
                onRunCommand={(commandId) =>
                  void ctx.renderHandlers.stableExecuteCommand(commandId)
                }
                onPrefillInput={(input) => ctx.input.setInputAndCursorEnd(`${input} `)}
                isLight={ctx.env.isLight()}
                agentName={ctx.props.agentName ?? DEFAULT_AGENT_NAME}
                embedded
              />
            </Show>
            <Show when={overlay() === 'skills'}>
              <SkillsCard
                projectId={ctx.props.projectId}
                initialQuery={ctx.overlay.panelOverlayQuery()}
                onLoad={(skill) => ctx.skills.loadSkill(skill)}
                onCreate={(name) => ctx.skills.createSkill(name)}
                loadedSkillPaths={ctx.skills.loadedSkillPaths()}
                defaultSkillPaths={ctx.skills.defaultSkillPaths()}
                onToggleDefault={(skill, next) => ctx.skills.toggleDefaultSkill(skill, next)}
                onResetDefault={() => ctx.skills.resetDefaultSkills()}
                defaultsExplicit={ctx.skills.defaultSkillsExplicit()}
                isLight={ctx.env.isLight()}
                embedded
              />
            </Show>
            <Show when={overlay() === 'scripts'}>
              <ScriptsCard
                projectId={ctx.props.projectId}
                initialQuery={ctx.overlay.panelOverlayQuery()}
                isLight={ctx.env.isLight()}
                agentName={ctx.props.agentName ?? DEFAULT_AGENT_NAME}
                embedded
              />
            </Show>
            <Show when={overlay() === 'tests'}>
              {ctx.props.nativeTests?.history}
              <TestsCard
                tests={ctx.tests.testsList()}
                status={ctx.tests.testsStatus()}
                run={ctx.tests.testsRun()}
                agentName={ctx.props.agentName ?? DEFAULT_AGENT_NAME}
                initialQuery={ctx.overlay.panelOverlayQuery()}
                canRun={
                  (ctx.props.canRunTests ?? ctx.props.canEdit !== false) &&
                  ctx.props.canEdit !== false
                }
                onRun={(selection) => ctx.tests.startTestsRun(selection)}
                onCancel={() => ctx.tests.cancelTestsRun()}
                onSkipCurrent={() => ctx.tests.skipCurrentTest()}
                onFix={(failures) => ctx.tests.fixTests(failures)}
                fixDisabledReason={fixDisabledReason()}
                isLight={ctx.env.isLight()}
                embedded
              />
            </Show>
          </div>
        </Modal>
      )}
    </Show>
  )
}
