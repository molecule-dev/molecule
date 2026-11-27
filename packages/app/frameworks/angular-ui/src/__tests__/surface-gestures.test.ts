// @vitest-environment jsdom
import '@angular/compiler'
import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, beforeAll } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { runSurfaceGestureConformance } from '@molecule/app-framework-conformance/ui'
import type { WebDragOptions } from '@molecule/app-pointer-events-dom'
import { WebDragDirective } from '@molecule/app-ui-angular'

class GestureHost {
  options?: WebDragOptions
}

const SurfaceGestureHost = Component({
  selector: 'surface-gesture-host',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [WebDragDirective],
  template:
    '<section data-testid="gesture-surface" aria-label="Editing surface" [molDrag]="options"><button>Edit</button></section>',
})(GestureHost)

beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser()))
afterAll(() => TestBed.resetTestEnvironment())

runSurfaceGestureConformance('angular', (container, options) => {
  TestBed.configureTestingModule({
    imports: [SurfaceGestureHost],
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const fixture = TestBed.createComponent(SurfaceGestureHost)
  fixture.componentInstance.options = options
  if (!(fixture.nativeElement instanceof HTMLElement)) throw new Error('Missing Angular host')
  fixture.nativeElement.setAttribute('data-parity-unwrap', '')
  container.append(fixture.nativeElement)
  fixture.detectChanges()
  return () => TestBed.resetTestingModule()
})
