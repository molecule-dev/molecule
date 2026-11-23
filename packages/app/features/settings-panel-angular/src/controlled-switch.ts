/**
 * The controlled-`checked` sync for the UI package's `Switch`, used by the
 * sections that toggle one.
 *
 * React's controlled inputs mirror the `checked` prop on every re-render:
 * the attribute is written once at mount and the PROPERTY follows the prop.
 * The UI `Switch` mirrors the prop through the attribute instead, which is
 * equivalent until a user click sets the native checkbox's dirty flag — after
 * that, attribute writes no longer move the property. This helper reproduces
 * React's split exactly: the property always follows the prop, the attribute
 * stays as it was at mount.
 *
 * @module
 */

/**
 * Syncs one `Switch`'s hidden native checkbox after the binding pass.
 */
export class ControlledSwitchSync {
  /** The attribute state React froze at mount (null until the first sync). */
  private mountedAttrChecked: boolean | null = null

  /**
   * Creates the sync for one switch.
   * @param switchHost - The switch's host element (`mol-switch`).
   */
  constructor(private readonly switchHost: HTMLElement) {}

  /**
   * Applies React's property/attribute split for the given controlled value.
   * Runs after the switch's own bindings (the owner's `ngAfterViewChecked`),
   * so it settles the state the pass produced.
   *
   * @param checked - The controlled `checked` value this render shows.
   */
  sync(checked: boolean): void {
    const input = this.switchHost.querySelector('input')
    if (!input) return
    if (this.mountedAttrChecked === null) this.mountedAttrChecked = checked
    // React's re-render: the property mirrors the prop…
    input.checked = checked
    // …and the attribute keeps its mount-time state.
    if (this.mountedAttrChecked) input.setAttribute('checked', '')
    else input.removeAttribute('checked')
  }
}
