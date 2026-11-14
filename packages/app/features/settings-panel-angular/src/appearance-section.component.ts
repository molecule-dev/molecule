/**
 * AppearanceSection component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  untracked,
  ViewChild,
} from '@angular/core'

import { useTheme, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Switch } from '@molecule/app-ui-angular'

import { ControlledSwitchSync } from './controlled-switch.js'

/**
 * AppearanceSection component.
 *
 * Appearance section — dark-mode toggle wired to the theme bond. The host IS
 * the `<section>` React renders.
 *
 * Apps that expose other appearance knobs (font size, density, etc.) can
 * either add more sub-components to this package or render their own section
 * in line with this one.
 *
 * The `id` / `aria-label` rest props of React's `<Switch>` are host
 * attributes here: the UI `Switch` moves host attributes onto its visible
 * trigger on every check, so the label follows the locale the same way. The
 * controlled `checked` is re-synced by an effect (React re-renders the hidden
 * checkbox's property; see {@link ControlledSwitchSync}).
 */
@Component({
  selector: 'section[mol-settings-appearance]',
  standalone: true,
  imports: [Flex, Switch],
  template: `<h3 [class]="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">
      {{ t('settings.appearance', undefined, { defaultValue: 'Appearance' }) }}
    </h3>
    <div mol-flex [align]="'center'" [justify]="'between'">
      <span [class]="cm.textSize('sm')">{{
        t('settings.darkMode', undefined, { defaultValue: 'Dark mode' })
      }}</span>
      <mol-switch
        #themeSwitch
        id="settings-theme-toggle"
        [attr.aria-label]="t('theme.toggle', undefined, { defaultValue: 'Toggle theme' })"
        [checked]="isDark()"
        (change)="theme.toggleTheme()"
        [size]="'sm'"
      ></mol-switch>
    </div>`,
})
export class AppearanceSection implements AfterViewInit {
  /** The theme bond's state and actions. */
  protected readonly theme = useTheme()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  /** Whether the dark mode is on (React's `mode === 'dark'`). */
  protected readonly isDark = computed(() => this.theme.mode() === 'dark')

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The theme switch's host element (the hidden checkbox lives inside). */
  @ViewChild('themeSwitch', { read: ElementRef }) themeSwitch?: ElementRef<HTMLElement>

  /** The controlled-`checked` sync (created once the host exists). */
  private sync?: ControlledSwitchSync

  /** Re-syncs the switch's hidden checkbox whenever the mode changes. */
  constructor() {
    effect(() => {
      const checked = this.isDark()
      untracked(() => this.runSync(checked))
    })
  }

  /** Captures the mount-time attribute state (hooks run on the mount passes). */
  ngAfterViewInit(): void {
    this.runSync(this.isDark())
  }

  /**
   * Runs the controlled-`checked` sync once the switch host exists.
   * @param checked - The controlled value this render shows.
   */
  private runSync(checked: boolean): void {
    if (!this.sync && this.themeSwitch) {
      this.sync = new ControlledSwitchSync(this.themeSwitch.nativeElement)
    }
    this.sync?.sync(checked)
  }
}
