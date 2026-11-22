/**
 * The working plan, one of the strips above the composer. It is not part of
 * the transcript: every `update_task_list` call re-draws this one strip
 * instead of adding a new card to the chat.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `PlanCard` (see that
 * file for the design notes): the same inputs (React prop names), the same
 * DOM for the same input. The rows render over the shared `DockStrip` chrome
 * ({@link DockStrip}, whose standalone branch draws the strip) with the
 * shared `StatusMark` icon — a check circle when done, the platform's
 * molecule spinner while the turn is running and the step is in progress, a
 * still ring that says why the work stopped when it is not (a question mark
 * while the person has to answer, a dash when it simply stopped), an empty
 * ring while still to do. Done rows dim and strike through. The strip's
 * detail collapses through its own disclosure toggle; while collapsed and a
 * step is in flight the header hints the step's content. Rows are tracked by
 * position (`track $index`, React keys them by index), so a new list re-binds
 * the same nodes instead of re-creating them.
 *
 * The host element is a `div` shell marked `data-parity-unwrap` (React's
 * component renders the strip as its root, with no wrapper of its own; the
 * kit's normalizer removes the marked shell, so the DOM is React's). Inputs
 * are declared the way the kit's other Angular feature components declare
 * them — one plain field per React prop, named in the decorator's `inputs`
 * array — and every derived value is a method the template reads, so each
 * change-detection pass renders the current state the way React's render
 * does. Styling uses `getClassMap()` (`cm.*`); the only inline styles are
 * layout the ClassMap can't express, serialized through `styleText` the way
 * React writes numbers (`8` → `8px`). The component is a part (React renders
 * it inside ChatPanel without exporting it), so it lives in `src/parts/`.
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { normalizeTaskListInput, type TaskListRow } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { DockStrip, StatusMark, type StatusMarkState } from './dock-strip.component.js'

/** The status icon each row's status draws: done, active, or the empty ring. */
const MARK: Record<TaskListRow['status'], StatusMarkState> = {
  completed: 'done',
  in_progress: 'active',
  pending: 'todo',
}

/**
 * The mark for a step still in progress: a spinner only while a turn is
 * actually running.
 *
 * @param live - Whether a turn is running.
 * @param awaitingUser - Whether the turn is paused on a question.
 * @returns The mark's state.
 */
function inProgressMark(live: boolean, awaitingUser: boolean): StatusMarkState {
  return live ? 'active' : awaitingUser ? 'waiting' : 'stopped'
}

/**
 * The latest plan in a transcript: the most recent `update_task_list` call's
 * task list, which replaces the earlier ones.
 *
 * @param messages - The transcript's messages (only their tool calls are read).
 * @returns The latest task list, or an empty list when there is none.
 */
export function latestPlan(
  messages: ReadonlyArray<{
    toolCalls?: ReadonlyArray<{ name?: string; input?: unknown }>
  }>,
): TaskListRow[] {
  for (let m = messages.length - 1; m >= 0; m--) {
    const calls = messages[m].toolCalls ?? []
    for (let c = calls.length - 1; c >= 0; c--) {
      if (calls[c].name !== 'update_task_list') continue
      const rows = normalizeTaskListInput(calls[c].input)
      if (rows.length > 0) return rows
    }
  }
  return []
}

/** Props for {@link PlanCard} — the React prop names, React's own contract. */
export interface PlanCardProps {
  /** The latest task list. */
  todos: ReadonlyArray<TaskListRow>
  /** Whether a turn is running. A step still "in progress" with no turn running is not progressing. */
  live?: boolean
  /** Whether the turn is paused on a question to the person. */
  awaitingUser?: boolean
}

/** The strip's constant inline styles, serialized once through `styleText`. */
const s = {
  /** The scrolling detail the rows render in. */
  rows: styleText({ maxHeight: '168px', overflowY: 'auto' }),
  /** The mark column before each row's text. */
  rowMark: styleText({ flexShrink: 0, display: 'inline-flex', paddingTop: 1 }),
} as const

/**
 * The working plan, redrawn in place on every `update_task_list` call. React
 * renders it inside ChatPanel under the React name `PlanCard`.
 */
@Component({
  selector: 'div[mol-plan-card]',
  standalone: true,
  imports: [DockStrip, StatusMark],
  inputs: ['todos', 'live', 'awaitingUser'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `@if (todos.length > 0) {
  <div mol-dock-strip [molId]="'task-list-card'" [toggleMolId]="'task-list-toggle'" [expanded]="expanded" [onToggle]="toggleExpanded" [icon]="iconTpl" [label]="label()" [hint]="hint() ?? undefined" [chipLabel]="chipLabel()" [chipTitle]="chipTitle() ?? undefined">
    <div [attr.style]="s.rows">
      @for (todo of todos; track $index) {
        <div data-mol-id="task-list-row" [class]="cm.textSize('xs')" [attr.style]="rowStyle(todo)">
          <span [attr.style]="s.rowMark"><span mol-dock-strip-status-mark [state]="rowMark(todo)"></span></span>
          <span [attr.style]="rowTextStyle(todo)">{{ todo.content }}@if (todo.status === 'in_progress' && stuckNote(); as note) {<span [class]="cm.textMuted">{{ ' — ' + note }}</span>}</span>
        </div>
      }
    </div>
  </div>
}
<ng-template #iconTpl><span mol-dock-strip-status-mark [state]="headerMark()" [size]="14"></span></ng-template>`,
})
export class PlanCard {
  /** The latest task list. */
  todos: TaskListRow[] = []

  /** Whether a turn is running. A step still "in progress" with no turn running is not progressing. */
  live = true

  /** Whether the turn is paused on a question to the person. */
  awaitingUser = false

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function; its calls re-run the view on a locale switch. */
  protected readonly t = this.i18n.t

  /** Whether the strip's detail is shown (React's `useState(true)` initial). */
  protected expanded = true

  /** The strip's constant inline styles. */
  protected readonly s = s

  /** Flips the detail, the way React's disclosure toggle does. */
  protected readonly toggleExpanded = (): void => {
    this.expanded = !this.expanded
  }

  /** How many steps are done (the chip's tally). */
  protected completedCount(): number {
    return this.todos.filter((todo) => todo.status === 'completed').length
  }

  /** The step in flight, or undefined when none is. */
  protected current(): TaskListRow | undefined {
    return this.todos.find((todo) => todo.status === 'in_progress')
  }

  /** The mark for the step in flight under the current turn state. */
  protected stuckMark(): StatusMarkState {
    return inProgressMark(this.live, this.awaitingUser)
  }

  /**
   * Why the work is not progressing, when it is not: a question is waiting,
   * or the work simply stopped. Undefined while the turn runs.
   *
   * @returns The note text, or undefined for none.
   */
  protected stuckNote(): string | undefined {
    return this.live
      ? undefined
      : this.awaitingUser
        ? this.t('ide.work.waiting', undefined, { defaultValue: 'Waiting for your answer' })
        : this.t('ide.work.stopped', undefined, { defaultValue: 'Stopped before finishing' })
  }

  /**
   * The header's mark: the in-flight step's stuck mark, the check circle when
   * every step is done, the empty ring otherwise.
   *
   * @returns The mark's state.
   */
  protected headerMark(): StatusMarkState {
    if (this.current()) return this.stuckMark()
    return this.completedCount() === this.todos.length ? 'done' : 'todo'
  }

  /**
   * The strip's label.
   *
   * @returns The translated label.
   */
  protected label(): string {
    return this.t('ide.chat.taskListTitle', undefined, { defaultValue: 'Working plan' })
  }

  /**
   * The collapsed header's hint: the step in flight.
   *
   * @returns The hint text, or undefined for none.
   */
  protected hint(): string | undefined {
    return !this.expanded && this.current() ? `· ${this.current()?.content}` : undefined
  }

  /**
   * The tray chip's tally.
   *
   * @returns The translated chip label.
   */
  protected chipLabel(): string {
    return this.t(
      'ide.work.plan',
      { done: this.completedCount(), total: this.todos.length },
      { defaultValue: 'Plan {{done}}/{{total}}' },
    )
  }

  /**
   * The tray chip's hover text: the step in flight and why the work is not
   * progressing, joined the way React joins them.
   *
   * @returns The chip title, or undefined for none.
   */
  protected chipTitle(): string | undefined {
    return this.current()
      ? [this.current()?.content, this.stuckNote()].filter(Boolean).join(' — ')
      : undefined
  }

  /**
   * A row's inline style: the row layout, dimmed when the step is done.
   *
   * @param todo - The row's step.
   * @returns The `style` attribute text.
   */
  protected rowStyle(todo: TaskListRow): string | null {
    return styleText({
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '3px 0px',
      ...(todo.status === 'completed' ? { opacity: 0.55 } : {}),
    })
  }

  /**
   * A row text's inline style: struck through when the step is done.
   *
   * @param todo - The row's step.
   * @returns The `style` attribute text.
   */
  protected rowTextStyle(todo: TaskListRow): string | null {
    return styleText({
      flex: '1 1 0%',
      minWidth: 0,
      ...(todo.status === 'completed' ? { textDecoration: 'line-through' } : {}),
    })
  }

  /**
   * A row mark's state: the stuck mark for the step in flight, otherwise the
   * step's own mark.
   *
   * @param todo - The row's step.
   * @returns The mark's state.
   */
  protected rowMark(todo: TaskListRow): StatusMarkState {
    return todo.status === 'in_progress' ? this.stuckMark() : MARK[todo.status]
  }
}
