/**
 * Types for a portable file chooser.
 *
 * @module
 */

import type { FileSelectionOptions, PickedFile } from '@molecule/app-filesystem'

/** Options for opening the chooser and returning its selection. */
export interface FilePickerOptions extends Pick<FileSelectionOptions, 'accept' | 'multiple'> {
  /**
   * Return every acquired file in selection order so the caller can apply its own
   * validation and report rejections. The chooser still uses `accept` and `multiple`.
   */
  includeRejected?: boolean
}

/** Opens a chooser and adapts the selected files to portable values. */
export interface FilePickerProvider {
  /**
   * Opens the chooser. Defaults to selecting one file and returning only matches.
   *
   * @param options - Accepted types, selection mode and whether to return the full selection.
   * @returns Ordered files, or an empty array on cancellation or when nothing matches.
   * @throws {Error} On failure, with the original error as its cause.
   */
  pickFiles(options: FilePickerOptions): Promise<readonly PickedFile[]>
}
