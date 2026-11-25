import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  inject,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'
import { provideServerRendering, renderApplication } from '@angular/platform-server'
import { JSDOM } from 'jsdom'
import { expect, it, vi } from 'vitest'

import type * as Binding from '@molecule/app-angular'
import { provideDomPlacement } from '@molecule/app-angular'

import { ConfirmDialog } from '../components/confirm-dialog.component.js'
import { Modal } from '../components/modal.component.js'
import {
  ResponsiveAppShell,
  ResponsiveAppShellContent,
  ResponsiveAppShellDrawer,
  ResponsiveAppShellTopBar,
} from '../components/responsive-app-shell.component.js'

vi.mock('@molecule/app-angular', async (importOriginal) => {
  const { signal } = await import('@angular/core')
  const location = signal({ pathname: '/', search: '', hash: '', key: 'home' })
  return {
    ...(await importOriginal<typeof Binding>()),
    useRouter: () => ({ location }),
  }
})

type Part = 'modal' | 'confirm' | 'shell'
const part = signal<Part>('modal')

const OpenDrawerForSsr = Directive({
  selector: '[openDrawerForSsr]',
  standalone: true,
})(
  class SpecOpenDrawerForSsr {
    private readonly shell = inject(ResponsiveAppShell, { self: true })

    ngAfterViewInit(): void {
      this.shell.drawerOpen.set(true)
    }
  },
)

const Host = Component({
  selector: 'mol-ssr-overlay-test',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    OpenDrawerForSsr,
    Modal,
    ConfirmDialog,
    ResponsiveAppShell,
    ResponsiveAppShellContent,
    ResponsiveAppShellDrawer,
    ResponsiveAppShellTopBar,
  ],
  template: `
    @if (part() === 'shell') {
      <div mol-responsive-app-shell openDrawerForSsr>
        <header mol-responsive-app-shell-topbar><span slot="brand">Mobile shell</span></header>
        <mol-responsive-app-shell-drawer>Drawer content</mol-responsive-app-shell-drawer>
        <main mol-responsive-app-shell-content>Page content</main>
      </div>
    } @else {
      <main>
        @if (part() === 'modal') {
          <mol-modal [open]="true" title="A server dialog">Dialog body</mol-modal>
        } @else {
          <mol-confirm-dialog [open]="true" title="Delete?" description="Cannot be undone." />
        }
      </main>
    }
  `,
})(
  class SpecOverlaySsrHost {
    readonly part = part
  },
)

async function render(component: Part): Promise<DocumentFragment> {
  part.set(component)
  const markup = await renderApplication(
    (context) =>
      bootstrapApplication(
        Host,
        {
          providers: [
            provideZonelessChangeDetection(),
            provideServerRendering(),
            provideDomPlacement(),
          ],
        },
        context,
      ),
    { document: '<!doctype html><mol-ssr-overlay-test></mol-ssr-overlay-test>' },
  )
  return JSDOM.fragment(markup)
}

it('renders open Modal and ConfirmDialog inline on a Node server', async () => {
  expect(typeof document).toBe('undefined')
  const modal = await render('modal')
  const confirm = await render('confirm')
  const modalPanel = modal.querySelector('main [role="presentation"] > [role="dialog"]')
  const confirmPanel = confirm.querySelector('main [role="presentation"] > [role="dialog"]')

  expect(modalPanel?.querySelector('h2')?.textContent).toBe('A server dialog')
  expect(modalPanel?.textContent).toContain('Dialog body')
  expect(confirmPanel?.querySelector('p')?.textContent?.trim()).toBe('Cannot be undone.')
  const headingId = confirmPanel?.getAttribute('aria-labelledby')
  const descriptionId = confirmPanel?.getAttribute('aria-describedby')
  expect(headingId).toBeTruthy()
  expect(descriptionId).toBeTruthy()
  expect(confirmPanel?.querySelector('h2')?.id).toBe(headingId)
  expect(confirmPanel?.querySelector('p')?.id).toBe(descriptionId)
  expect(
    [...(confirmPanel?.querySelectorAll('button') ?? [])].map((button) =>
      button.textContent.trim(),
    ),
  ).toContain('Confirm')
})

it('renders the mobile shell and omits hosted drawer content in Node', async () => {
  const shell = await render('shell')

  expect(shell.querySelector('header')?.textContent).toContain('Mobile shell')
  expect(shell.querySelector('main')?.textContent).toBe('Page content')
  expect(shell.textContent).not.toContain('Drawer content')
  expect(shell.querySelector('[role="dialog"]')).toBeNull()
})
