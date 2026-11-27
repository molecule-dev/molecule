import {
  defineComponent,
  type DefineSetupFnComponent,
  h,
  type InjectionKey,
  provide,
  renderSlot,
  type Slot,
  type SlotsType,
  type VNode,
} from 'vue'

import type { ProviderProps } from './types.js'

/** One service to provide: its injection key and the value. */
export type ServiceEntry = readonly [InjectionKey<unknown>, unknown]

/** A number per object identity, so a changed service gives the provided tree a new key. */
const identities = new WeakMap<object, number>()
let nextIdentity = 0

/**
 * The identity number of a service value (0 for an absent one).
 *
 * @param value - A provided service, or `undefined`.
 * @returns The same number for the same object, a new one for another.
 */
export function identityOf(value: unknown): number {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return 0
  const known = identities.get(value)
  if (known !== undefined) return known
  nextIdentity += 1
  identities.set(value, nextIdentity)
  return nextIdentity
}

/**
 * Provides its entries in setup and renders its default slot. Rendered under a key made from
 * the entries' identities, so a changed service sets it up again.
 */
export const ProvidedServices = defineComponent<
  { entries: ServiceEntry[] },
  Record<never, never>,
  string,
  SlotsType<ProviderProps>
>(
  (props, { slots }) => {
    for (const [key, value] of props.entries) provide(key, value)
    return (): VNode => renderSlot(slots, 'default')
  },
  { name: 'MoleculeServices', props: ['entries'] },
)

/**
 * Renders `content` below the given services, set up again when one of them changes.
 *
 * @param entries - The services to provide; an absent value is left out.
 * @param content - The tree that reads them.
 * @returns The provided tree.
 */
export function provideServices(entries: ServiceEntry[], content: Slot | undefined): VNode {
  const present = entries.filter(([, value]) => value !== undefined && value !== null)
  return h(
    ProvidedServices,
    { key: present.map(([, value]) => identityOf(value)).join(':'), entries: present },
    { default: () => (content ? content() : []) },
  )
}

/**
 * A component providing one service under `key` from its `prop`.
 *
 * @param name - The component name.
 * @param key - The injection key the composables read.
 * @param prop - The prop holding the service.
 * @param extra - Other props it declares (so they are not passed on as attributes).
 * @returns The provider component.
 */
export function serviceProvider<
  P extends ProviderProps,
  K extends Exclude<keyof P, keyof ProviderProps> & string,
>(
  name: string,
  key: InjectionKey<NonNullable<P[K]>>,
  prop: K,
  extra: (Exclude<keyof P, keyof ProviderProps> & string)[] = [],
): DefineSetupFnComponent<
  Omit<P, keyof ProviderProps>,
  Record<never, never>,
  SlotsType<ProviderProps>
> {
  return defineComponent<
    Omit<P, keyof ProviderProps>,
    Record<never, never>,
    string,
    SlotsType<ProviderProps>
  >(
    (props, { slots }) =>
      (): VNode =>
        provideServices([[key, props[prop]]], slots.default),
    {
      name,
      props: [prop, ...extra],
    },
  )
}
