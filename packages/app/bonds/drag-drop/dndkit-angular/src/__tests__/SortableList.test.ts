// @vitest-environment jsdom

import '@angular/compiler'
import {
  Component,
  createComponent,
  Injector,
  provideZonelessChangeDetection,
  runInInjectionContext,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'

import { SortableItem, SortableList, useSortableItem } from '@molecule/app-drag-drop-dndkit-angular'
import type {
  ConformanceListProps,
  MountedConformanceList,
} from '@molecule/app-framework-conformance/drag-drop'
import { describeSortableListConformance } from '@molecule/app-framework-conformance/drag-drop'

/**
 * The conformance host: a `[molSortableList]` with one `[molSortableItem]` row
 * per item, the row's text being the item's title.
 */
@Component({
  selector: 'div[data-conformance-list]',
  standalone: true,
  imports: [SortableList, SortableItem],
  template: `<ul
    molSortableList
    [items]="props.items"
    [onReorder]="props.onReorder"
    [onDragStart]="props.onDragStart"
    [onDragEnd]="props.onDragEnd"
    [getItemLabel]="props.getItemLabel"
    [disabled]="props.disabled ?? false"
    [config]="props.config"
  >
    @for (item of props.items; track item.id) {
      <li
        molSortableItem
        [molSortableItem]="item.id"
        [disabled]="props.disabledIds.includes(item.id)"
        [attr.data-row]="item.id"
      >
        {{ item.title }}
      </li>
    }
  </ul>`,
})
class ConformanceList {
  props!: ConformanceListProps
}

/** A component that asks for a sortable row without a list around it. */
class RowOutsideList {
  readonly row = useSortableItem({ id: 'a' })
}

describeSortableListConformance('angular', {
  async mount(props: ConformanceListProps): Promise<MountedConformanceList> {
    const appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
    const host = createComponent(ConformanceList, { environmentInjector: appRef.injector })
    host.instance.props = props
    const element = host.location.nativeElement as HTMLElement
    document.body.appendChild(element)
    appRef.attachView(host.hostView)
    appRef.tick()
    return {
      row: (id) => {
        const row = element.querySelector<HTMLElement>(`[data-row="${id}"]`)
        if (!row) throw new Error(`no row ${id}`)
        return row
      },
      unmount: async () => {
        host.destroy()
        element.remove()
        await appRef.destroy()
      },
    }
  },
  mountRowOutsideList: {
    run: () => {
      const injector = Injector.create({ providers: [] })
      return runInInjectionContext(injector, () => new RowOutsideList())
    },
    message: 'useSortableItem must be called inside a [molSortableList].',
  },
})
