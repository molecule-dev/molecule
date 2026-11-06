/** Logical commands and ordered log boundaries for launchers that execute opaque wrappers. */
import { randomUUID } from 'node:crypto'
import { gunzipSync, gzipSync } from 'node:zlib'

/** One sequential command, with boundaries emitted by its launcher around execution. */
export interface CommandPlanStep {
  /** Launcher's stable step identity. */
  id: string
  /** The logical command actually executed, including launch rewrites. */
  command: string
  /** Printed on its own line immediately before this step runs. */
  startMarker: string
  /** Printed on its own line after this step settles. */
  endMarker: string
}

/** A wrapper's ordered commands; metadata describes execution, never proof or completion. */
export interface CommandPlan {
  /** Per-launch boundary identity, preventing ordinary suite output from matching a boundary. */
  id: string
  /** Steps execute in this order. */
  steps: CommandPlanStep[]
}

const HEADER = '# mol-command-plan-v1 '
const TRUNCATED = '__MOL_COMMAND_LOG_TRUNCATED__'

/**
 * Give already-prepared logical commands unique log boundaries.
 * @param steps - Commands in execution order.
 * @returns Metadata for the wrapper and the launcher that executes its steps.
 */
export function createCommandPlan(steps: { id: string; command: string }[]): CommandPlan {
  const id = randomUUID()
  return {
    id,
    steps: steps.map((step, index) => ({
      ...step,
      startMarker: `__MOL_COMMAND_STEP_${id}_${index}_START__`,
      endMarker: `__MOL_COMMAND_STEP_${id}_${index}_END__`,
    })),
  }
}

/**
 * Preserve a wrapper's typed logical plan in its durable shell script, including across restarts.
 * Shell comments keep this independent of the wrapper's executable, arguments and payload format.
 * @param command - Executed wrapper.
 * @param plan - Commands the launcher will actually execute and delimit.
 * @returns A shell command with a passive metadata header.
 */
export function commandWithPlan(command: string, plan: CommandPlan): string {
  return `${HEADER}${gzipSync(JSON.stringify(plan)).toString('base64')}\n${command}`
}

/**
 * Read the shared descriptor, never a launcher's private wrapper format.
 * @param command - Command or recovered task script.
 * @returns A valid logical plan, or null for an ordinary command.
 */
export function commandPlan(command: string): CommandPlan | null {
  const header = command.split('\n').find((line) => line.startsWith(HEADER))
  if (!header || header.length > 1024 * 1024) return null
  try {
    const plan = JSON.parse(
      gunzipSync(Buffer.from(header.slice(HEADER.length), 'base64'), {
        maxOutputLength: 1024 * 1024,
      }).toString('utf8'),
    ) as CommandPlan
    if (
      !plan ||
      !/^[a-f0-9-]{36}$/.test(plan.id) ||
      !Array.isArray(plan.steps) ||
      plan.steps.length === 0 ||
      !plan.steps.every(
        (step, index) =>
          typeof step?.id === 'string' &&
          typeof step.command === 'string' &&
          step.startMarker === `__MOL_COMMAND_STEP_${plan.id}_${index}_START__` &&
          step.endMarker === `__MOL_COMMAND_STEP_${plan.id}_${index}_END__`,
      )
    )
      return null
    return plan
  } catch (_error) {
    // Metadata is advisory. An absent or malformed descriptor supplies no logical commands.
    return null
  }
}

/**
 * Commands a wrapper will run, for static classification; live diagnostics use commandStepView.
 * @param command - Executed command.
 * @returns Logical commands in order, or the direct command unchanged.
 */
export function logicalCommandText(command: string): string {
  return (
    commandPlan(command)
      ?.steps.map((step) => step.command)
      .join(';\n') ?? command
  )
}

/**
 * Select only the step that owns the latest log boundary. Completed steps cannot supply a live
 * failure, target, retry policy, file selection or rerun. Before the first boundary and between
 * steps the live command is unknown; no diagnostic is permitted.
 * @param command - Wrapper or direct command.
 * @param output - Whole log, or the boundary-preserving bounded read.
 * @returns Active command and its output, plus whether the entire step's output is available.
 */
export function commandStepView(
  command: string,
  output: string,
): {
  command: string
  output: string
  complete: boolean
  /** Unique execution step, including when adjacent steps run identical commands. */
  stepKey?: string
} {
  const plan = commandPlan(command)
  if (!plan) return { command, output, complete: true }
  let at = -1
  let selected: CommandPlanStep | undefined
  let offset = 0
  for (const line of output.split('\n')) {
    for (const step of plan.steps) {
      if (line === step.startMarker || line === step.endMarker) {
        at = offset + line.length + 1
        selected = line === step.startMarker ? step : undefined
      }
    }
    offset += line.length + 1
  }
  const text = selected && at >= 0 ? output.slice(at) : ''
  return {
    stepKey: selected?.startMarker,
    command: selected?.command ?? '',
    output: text.replace(`${TRUNCATED}\n`, ''),
    complete: !text.startsWith(TRUNCATED),
  }
}

/**
 * AWK program for a bounded read that retains the active boundary even after a long step and
 * discards prior steps. A truncated step cannot establish a universal failure across its history.
 * @param plan - Logical plan whose boundaries the launcher emits.
 * @param limit - Maximum output characters retained for diagnosis.
 * @returns An AWK program; callers shell-quote it like every other argument.
 */
export function commandPlanLogRead(plan: CommandPlan, limit: number): string {
  const markers = plan.steps.flatMap((step) => [step.startMarker, step.endMarker])
  return (
    `BEGIN { ${markers.map((marker) => `marks["${marker}"]=1`).join('; ')} }\n` +
    '$0 in marks { marker=$0; text=""; cut=0; next }\n' +
    `{ text=text $0 "\\n"; if(length(text)>${limit}) { text=substr(text,length(text)-${limit}+1); cut=1 } }\n` +
    `END { if(marker!="") { print marker; if(cut) print "${TRUNCATED}"; printf "%s",text } }`
  )
}
