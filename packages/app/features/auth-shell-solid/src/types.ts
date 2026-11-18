/**
 * Types for the Solid auth-page layout shell — the Solid counterpart of
 * `@molecule/app-auth-shell-react`: the same props (React names) and the same
 * DOM for the same input.
 *
 * @module
 */

import type { Accessor, JSX } from 'solid-js'

import type { StorageProvider } from '@molecule/app-storage'

/**
 * Shared auth form field values. `email` is the canonical cross-view field;
 * additional string fields (e.g. a name carried from Signup) may be stored
 * alongside it.
 */
export interface AuthFormFields {
  /** Email address, shared across all auth views. */
  email?: string
  /** Any other shared string field (e.g. `name`). */
  [field: string]: string | undefined
}

/** Options for {@link useAuthFormState}. */
export interface UseAuthFormStateOptions {
  /** Storage provider backing persistence (defaults to a process-shared in-memory provider). */
  storage?: StorageProvider
  /** Storage key for the persisted fields. Defaults to `molecule.auth.form-state`. */
  storageKey?: string
  /** Seed values used before hydration completes / when storage is empty. */
  initialFields?: AuthFormFields
}

/** The value {@link useAuthFormState} returns. */
export interface AuthFormState {
  /** Current field values (email + any shared fields), as an accessor. */
  fields: Accessor<AuthFormFields>
  /** `true` once the initial read from storage has completed, as an accessor. */
  hydrated: Accessor<boolean>
  /** Sets a single field and persists the new state. */
  setField: (name: string, value: string) => void
  /** Merges a patch of fields and persists the new state. */
  setFields: (patch: AuthFormFields) => void
  /** Clears all persisted auth form state and removes the storage key. */
  clear: () => void
}

/** Props for {@link AuthFormStateProvider}. */
export interface AuthFormStateProviderProps {
  /** Children rendered inside the provider. */
  children?: JSX.Element
  /** Storage provider backing persistence (defaults to a shared in-memory provider). */
  storage?: StorageProvider
  /** Storage key for the persisted fields. */
  storageKey?: string
  /** Seed values used before hydration / when storage is empty. */
  initialFields?: AuthFormFields
}

/** Props accepted by {@link AuthShellContainer}. */
export interface AuthShellContainerProps {
  /** Content rendered inside the container. */
  children?: JSX.Element
  /** Optional CSS background applied to the container. */
  style?: JSX.CSSProperties
  /** Extra classes appended after the defaults. */
  className?: string
  /** Layout direction. Defaults to `'centered'`; pass `'column'` for a vertical stack. */
  layout?: 'centered' | 'column'
}

/** Props accepted by {@link AuthShellCard}. */
export interface AuthShellCardProps {
  /** Content rendered inside the card. */
  children?: JSX.Element
  /** Override the default glass surface. */
  surfaceClassName?: string
  /** Extra layout classes appended after the flex/padding defaults. */
  className?: string
  /** Override the outer `<main>` wrapper classes. */
  outerClassName?: string
  /** `data-mol-id` pass-through for E2E selectors. */
  dataMolId?: string
  /** Optional CSS style applied to the card's inner surface. */
  style?: JSX.CSSProperties
}

/** Props accepted by {@link AuthShellHeading}. */
export interface AuthShellHeadingProps {
  /** The heading text. */
  heading: string
  /** Optional subheading paragraph. */
  subheading?: string
  /** Optional small uppercase tag rendered above the heading. */
  eyebrow?: string
  /** Optional override for the h1 className. */
  headingClassName?: string
  /** Optional override for the h1 style. */
  headingStyle?: JSX.CSSProperties
}

/** Props accepted by {@link AuthShellBackLink}. */
export interface AuthShellBackLinkProps {
  /** Destination. Defaults to `/`. */
  to?: string
  /** Translated label override; falls back to `auth.backHome` → "Back to home" when absent, empty or blank. */
  label?: string
}

/** Props accepted by {@link AuthShellSplit}. */
export interface AuthShellSplitProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The split row (and optionally a site footer sibling). */
  children?: JSX.Element
  /** Cosmetic classes (background, text color, font) for the outer container. */
  className?: string
}

/** Props accepted by {@link AuthShellSplitRow}. */
export interface AuthShellSplitRowProps extends JSX.HTMLAttributes<HTMLElement> {
  /** The brand panel and the card column. */
  children?: JSX.Element
  /** Layout classes for the row (typically `cm.flex({})` or `cm.grid({ cols: 2 })`). */
  className?: string
}

/** Props accepted by {@link AuthShellPanel}. */
export interface AuthShellPanelProps extends JSX.HTMLAttributes<HTMLElement> {
  /** The app's bespoke decoration, wordmark or social proof. */
  children?: JSX.Element
  /** Cosmetic classes — width ratio, padding, gradient, positioning. */
  className?: string
}

/** Props accepted by {@link AuthShellCardColumn}. */
export interface AuthShellCardColumnProps extends JSX.HTMLAttributes<HTMLElement> {
  /** The form card content. */
  children?: JSX.Element
  /** Cosmetic classes — width ratio, padding. */
  className?: string
  /** Element to render. Defaults to `'section'`. */
  as?: 'section' | 'main'
}

/** Props accepted by {@link AuthShell}. */
export interface AuthShellProps {
  /** The heading text. */
  heading: string
  /** The subheading text. */
  subheading: string
  /** The form body. */
  children?: JSX.Element
  /** Optional footer node. */
  footer?: JSX.Element
  /** Optional brand node rendered above the heading. */
  brand?: JSX.Element
  /** Optional background decoration node. */
  decoration?: JSX.Element
  /** Destination of the back link. Defaults to `/`. */
  backTo?: string
  /** Whether to render the back link. Defaults to `true`. */
  showBackLink?: boolean
  /** Storage provider backing cross-view auth form persistence. */
  formStateStorage?: StorageProvider
  /** Storage key for the persisted auth form state. */
  formStateKey?: string
}
