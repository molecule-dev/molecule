/**
 * The record and controlled-values fixture of React's
 * `useProfileForm.integration` cases, shared by the Svelte port's components.
 *
 * @module
 */

import type { UserProfile } from '@molecule/app-auth'

/** The signed-in reader: a profile with nullable biography and image. */
export interface Reader extends UserProfile {
  bio: string | null
  image: string | null
}

/** The page's controlled values, including the blank write-only credential. */
export type Fields = {
  name: string
  email: string
  bio: string
  image: string
  password: string
}

/** The profile the session starts with. */
export const initial: Reader = {
  id: 'reader',
  name: 'Reader',
  email: 'reader@example.test',
  bio: null,
  image: null,
}

/** The controlled-field defaults: every field blank. */
export const defaults: Fields = { name: '', email: '', bio: '', image: '', password: '' }

/**
 * Maps a profile into the page's controlled values.
 *
 * @param user - The current or saved profile.
 * @returns The controlled values.
 */
export const valuesFor = (user: Reader): Fields => ({
  name: user.name ?? '',
  email: user.email ?? '',
  bio: user.bio ?? '',
  image: user.image ?? '',
  password: '',
})
