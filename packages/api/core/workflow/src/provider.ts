/**
 * Workflow provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-workflow-database`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  Workflow,
  WorkflowDefinition,
  WorkflowEvent,
  WorkflowInstance,
  WorkflowProvider,
} from './types.js'

const BOND_TYPE = 'workflow'
expectBond(BOND_TYPE)

/**
 * Registers a workflow provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The workflow provider implementation to bond.
 */
export const setProvider = (provider: WorkflowProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded workflow provider, throwing if none is configured.
 *
 * @returns The bonded workflow provider.
 * @throws {Error} If no workflow provider has been bonded.
 */
export const getProvider = (): WorkflowProvider => {
  try {
    return bondRequire<WorkflowProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('workflow.error.noProvider', undefined, {
        defaultValue: 'Workflow provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a workflow provider is currently bonded.
 *
 * @returns `true` if a workflow provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Persists a new workflow definition.
 *
 * @param definition - The workflow definition to create.
 * @returns The persisted workflow with generated ID and timestamps.
 * @throws {Error} If no workflow provider has been bonded.
 */
export const createWorkflow = async (definition: WorkflowDefinition): Promise<Workflow> => {
  return getProvider().createWorkflow(definition)
}

/**
 * Retrieves a workflow definition by ID.
 *
 * @param workflowId - The workflow identifier.
 * @returns The workflow, or `null` if not found.
 * @throws {Error} If no workflow provider has been bonded.
 */
export const getWorkflow = async (workflowId: string): Promise<Workflow | null> => {
  return getProvider().getWorkflow(workflowId)
}

/**
 * Lists all persisted workflow definitions.
 *
 * @returns An array of all workflows.
 * @throws {Error} If no workflow provider has been bonded.
 */
export const listWorkflows = async (): Promise<Workflow[]> => {
  return getProvider().listWorkflows()
}

/**
 * Creates and starts a new instance of a workflow.
 *
 * @param workflowId - The workflow to instantiate.
 * @param data - Optional initial data for the instance.
 * @returns The newly created instance in the workflow's initial state.
 * @throws {Error} If no workflow provider has been bonded.
 */
export const startInstance = async (
  workflowId: string,
  data?: Record<string, unknown>,
): Promise<WorkflowInstance> => {
  return getProvider().startInstance(workflowId, data)
}

/**
 * Retrieves a workflow instance by ID.
 *
 * @param instanceId - The instance identifier.
 * @returns The instance, or `null` if not found.
 * @throws {Error} If no workflow provider has been bonded.
 */
export const getInstance = async (instanceId: string): Promise<WorkflowInstance | null> => {
  return getProvider().getInstance(instanceId)
}

/**
 * Applies an action to transition an instance from its current state.
 *
 * @param instanceId - The instance to transition.
 * @param action - The action name triggering the transition.
 * @param data - Optional data to merge into the instance.
 * @returns The updated instance in its new state.
 * @throws {Error} If no workflow provider has been bonded.
 */
export const transition = async (
  instanceId: string,
  action: string,
  data?: Record<string, unknown>,
): Promise<WorkflowInstance> => {
  return getProvider().transition(instanceId, action, data)
}

/**
 * Returns the current state name of an instance.
 *
 * @param instanceId - The instance identifier.
 * @returns The current state name.
 * @throws {Error} If no workflow provider has been bonded.
 */
export const getState = async (instanceId: string): Promise<string> => {
  return getProvider().getState(instanceId)
}

/**
 * Returns the transition history for an instance.
 *
 * @param instanceId - The instance identifier.
 * @returns An array of workflow events in chronological order.
 * @throws {Error} If no workflow provider has been bonded.
 */
export const getHistory = async (instanceId: string): Promise<WorkflowEvent[]> => {
  return getProvider().getHistory(instanceId)
}

/**
 * Returns the list of action names available from the instance's current state.
 *
 * @param instanceId - The instance identifier.
 * @returns An array of available action names.
 * @throws {Error} If no workflow provider has been bonded.
 */
export const getAvailableActions = async (instanceId: string): Promise<string[]> => {
  return getProvider().getAvailableActions(instanceId)
}
