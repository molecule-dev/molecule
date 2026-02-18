import { t } from '@molecule/app-i18n'

import type { VersionEvent, VersionInfo, VersionState } from './types.js'
import { DEFAULT_VERSION_URL } from './utilities.js'

/**
 * Creates a version checker.
 *
 * @param getState - Function to get the current version state.
 * @param updateState - Function to update the version state.
 * @param emit - Function to emit events.
 * @returns The check for updates function.
 */
export const createVersionChecker = (
  getState: () => VersionState,
  updateState: (partial: Partial<VersionState>) => void,
  emit: <T>(event: VersionEvent, data: T) => void,
): (() => Promise<boolean>) => {
  return async (): Promise<boolean> => {
    const versionUrl = DEFAULT_VERSION_URL

    emit('check-start', {})
    updateState({ isChecking: true })

    try {
      const response = await fetch(versionUrl, {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' },
      })

      if (!response.ok) {
        throw new Error(
          t(
            'version.error.fetchFailed',
            { status: String(response.status) },
            { defaultValue: `Failed to fetch version: ${response.status}` },
          ),
        )
      }

      const newInfo: VersionInfo = await response.json()
      const state = getState()

      updateState({ lastChecked: new Date(), isChecking: false })

      // Check if version has changed
      const hasUpdate =
        (state.buildId && newInfo.buildId && newInfo.buildId !== state.buildId) ||
        (state.version && newInfo.version && newInfo.version !== state.version)

      if (hasUpdate) {
        updateState({
          newBuildId: newInfo.buildId,
          newVersion: newInfo.version,
          isUpdateAvailable: true,
        })
        emit('update-available', { current: state, new: newInfo })
        return true
      }

      // Initialize version if not set
      if (!state.buildId && newInfo.buildId) {
        updateState({ buildId: newInfo.buildId })
      }
      if (!state.version && newInfo.version) {
        updateState({ version: newInfo.version })
      }

      emit('check-complete', { hasUpdate: false })
      return false
    } catch (error) {
      updateState({ isChecking: false })
      emit('check-error', { error })
      return false
    }
  }
}
