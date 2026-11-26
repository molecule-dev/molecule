/**
 * The chat panel's blocking dialog for browsing skills, scripts, settings and
 * test runs. Its heading and content follow the selected view.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { panelOverlayHeading } from '@molecule/app-ide-panel-logic'
import type { CommandId } from '@molecule/app-ide-panel-logic/panels'
import { Modal } from '@molecule/app-ui-vue'

import { ScriptsCard } from '../../parts/ScriptsCard.js'
import { SettingsCard } from '../../parts/SettingsCard.js'
import { SkillsCard } from '../../parts/SkillsCard.js'
import { TestsCard } from '../TestsCard.js'
import type { ChatCtx } from './context.js'

/**
 * Renders the panel overlay.
 *
 * @param ctx - The panel context (the open variant, its search seed and the
 *   card each variant mounts).
 * @returns The overlay, or `null` while it is closed.
 */
export function renderChatPanelOverlay(ctx: ChatCtx): VNodeChild {
  const panelOverlay = ctx.overlay.panelOverlay.value
  if (!panelOverlay) return null

  const { props, env } = ctx
  const cm = env.cm
  const t = env.t
  const isCoarse = env.isCoarse.value
  const isLight = env.isLight.value
  const agentName = props.agentName
  const panelOverlayQuery = ctx.overlay.panelOverlayQuery.value
  const canEdit = props.canEdit
  const isTurnInFlight = ctx.chat.isLoading.value || ctx.chat.isRemoteStreaming.value
  const heading = panelOverlayHeading(t, panelOverlay)

  return h(
    Modal,
    {
      open: true,
      onClose: () => ctx.overlay.setPanelOverlay(null),
      showCloseButton: false,
      size: 'lg',
      'aria-label': heading,
      'data-mol-id': 'chat-panel-overlay',
    },
    {
      default: () => [
        // Header bar — title on the left, ✕ on the right (mirrors the /sounds
        // popup header). The title reuses each panel's existing heading key.
        h(
          'div',
          {
            class: cm.cn(cm.textSize('xs'), cm.textMuted),
            style: {
              padding: '5px 12px',
              borderBottom: '1px solid rgba(128,128,128,0.12)',
              flexShrink: '0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          },
          [
            h('span', { class: cm.fontWeight('medium') }, [heading]),
            h(
              'button',
              {
                // mol-bespoke-button: icon-only overlay close — header x, no label
                type: 'button',
                'data-mol-id': 'panel-overlay-close',
                'aria-label': t('ide.chat.closeOverlay', undefined, { defaultValue: 'Close' }),
                onClick: () => {
                  ctx.overlay.setPanelOverlay(null)
                },
                style: {
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  padding: '0 2px',
                  fontSize: '14px',
                  lineHeight: '1',
                  opacity: '0.6',
                  // Touch floor for this secondary header ✕ (36px, like the
                  // notice-card actions); fine pointers keep the slim header.
                  ...(isCoarse
                    ? {
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '36px',
                        minHeight: '36px',
                      }
                    : {}),
                },
              },
              ['✕'],
            ),
          ],
        ),
        h('div', { style: { overflowY: 'auto', flex: '1' } }, [
          panelOverlay === 'settings'
            ? h(SettingsCard, {
                settings: ctx.timeline.computeSettingsList(),
                onRunCommand: (commandId: CommandId) => {
                  void ctx.commands.executeCommand(commandId)
                },
                onPrefillInput: (input: string) => {
                  ctx.input.setInputAndCursorEnd(`${input} `)
                },
                isLight,
                agentName,
                embedded: true,
              })
            : null,
          panelOverlay === 'skills'
            ? h(SkillsCard, {
                projectId: props.projectId,
                initialQuery: panelOverlayQuery,
                onLoad: ctx.skills.loadSkill,
                onCreate: ctx.skills.createSkill,
                loadedSkillPaths: ctx.skills.loadedSkillPaths.value,
                defaultSkillPaths: ctx.skills.defaultSkillPaths.value,
                onToggleDefault: ctx.skills.toggleDefaultSkill,
                onResetDefault: ctx.skills.resetDefaultSkills,
                defaultsExplicit: ctx.skills.defaultSkillsExplicit.value,
                isLight,
                embedded: true,
              })
            : null,
          panelOverlay === 'scripts'
            ? h(ScriptsCard, {
                projectId: props.projectId,
                initialQuery: panelOverlayQuery,
                isLight,
                agentName,
                embedded: true,
              })
            : null,
          panelOverlay === 'tests'
            ? [
                props.nativeTests?.history,
                h(TestsCard, {
                  tests: ctx.tests.testsList.value,
                  status: ctx.tests.testsStatus.value,
                  run: ctx.tests.testsRun.value,
                  agentName,
                  initialQuery: panelOverlayQuery,
                  canRun: (props.canRunTests ?? canEdit !== false) && canEdit !== false,
                  onRun: ctx.tests.startTestsRun,
                  onCancel: ctx.tests.cancelTestsRun,
                  onSkipCurrent: ctx.tests.skipCurrentTest,
                  onFix: ctx.tests.fixTests,
                  fixDisabledReason:
                    canEdit === false
                      ? t('ide.tests.viewerCannotRun', undefined, {
                          defaultValue: 'Only editors can run this project’s tests.',
                        })
                      : isTurnInFlight
                        ? t('ide.tests.fixBusy', undefined, {
                            defaultValue: 'Wait for the current turn to finish.',
                          })
                        : null,
                  isLight,
                  embedded: true,
                }),
              ]
            : null,
        ]),
      ],
    },
  )
}
