/** Live and persisted projection of the current Cordis Loader plugin entries. */

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import type { Context, FiberState } from '@deepseek-ai/cordis'
import type { Entry } from '@deepseek-ai/cordis-plugin-loader'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
// Typert-generated ./typert and ./remote artifacts import Zod at runtime.
import type {} from 'zod'
import type {
  PluginEntryId,
  PluginFiberPhase,
  PluginInventoryEntry,
  PluginInventorySnapshot,
} from './types.ts'

export type * from './types.ts'

/** Preferences are intentionally separate from profile patches and credentials. */
const PLUGIN_TOGGLE_FILENAME = 'plugin-toggles.json'
/** The Loader's root include entry owns every plugin below it and must stay live. */
const PROTECTED_ENTRY_IDS = new Set<PluginEntryId>(['include' as PluginEntryId])

function pluginTogglePath(): string {
  // The host launcher always passes its dedicated state directory through
  // DSH_HOME. Keep the fallback equivalent to the CLI default so this host
  // module remains independently loadable even before workspace links exist.
  const configuredHome = process.env.DSH_HOME
  const home = configuredHome !== undefined && configuredHome.trim() !== ''
    ? configuredHome
    : join(homedir(), '.dsh')
  return join(resolve(home), PLUGIN_TOGGLE_FILENAME)
}

function readPluginToggles(): Record<string, boolean> {
  const path = pluginTogglePath()
  if (!existsSync(path)) return {}
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'))
  } catch {
    return {}
  }
}

/** Atomically persist one user-selected enablement value without touching API keys or model settings. */
function writePluginToggle(entryId: PluginEntryId, enabled: boolean): void {
  const path = pluginTogglePath()
  const next = readPluginToggles()
  next[entryId] = enabled
  const temporary = `${path}.${process.pid}.tmp`
  writeFileSync(temporary, JSON.stringify(next, undefined, 2) + '\n', { mode: 0o600 })
  renameSync(temporary, path)
}

/** Brand an existing Loader-tree entry id at the owning boundary. */
function pluginEntryId(value: string): PluginEntryId {
  return value as PluginEntryId
}

/** Project one Loader entry at the mutation boundary as well as during listing. */
function inventoryEntry(entry: Entry): PluginInventoryEntry {
  return {
    entryId: pluginEntryId(entry.id),
    moduleName: entry.options.name,
    enabled: !entry.disabled,
    fiberPhase: entry.fiber === undefined ? null : FIBER_PHASE[entry.fiber.state],
  }
}

/** Runtime mirror: FiberState is a cross-package const enum. */
const FIBER_STATE = {
  PENDING: 0 as FiberState.PENDING,
  LOADING: 1 as FiberState.LOADING,
  ACTIVE: 2 as FiberState.ACTIVE,
  FAILED: 3 as FiberState.FAILED,
  DISPOSED: 4 as FiberState.DISPOSED,
  UNLOADING: 5 as FiberState.UNLOADING,
} as const

/** Complete public projection of Cordis Fiber states. */
const FIBER_PHASE = {
  [FIBER_STATE.PENDING]: 'pending',
  [FIBER_STATE.LOADING]: 'loading',
  [FIBER_STATE.ACTIVE]: 'active',
  [FIBER_STATE.FAILED]: 'failed',
  [FIBER_STATE.DISPOSED]: null,
  [FIBER_STATE.UNLOADING]: 'unloading',
} as const satisfies Record<FiberState, PluginFiberPhase>

/** Remote-only service exposing the Loader's current non-group entry state. */
export class PluginInventoryGateway extends TypertRemoteService {
  static inject = ['loader']

  constructor(ctx: Context) {
    super(ctx, 'pluginInventory')
  }

  /**
   * Read the Loader directly on every call. Cordis's internal plugin/status
   * events already maintain Entry.fiber and Fiber.state, so a second cache
   * would only add another lifecycle truth to keep synchronized.
   * @returns Current non-group Loader entries in Loader order.
   */
  @Remote('list')
  list(): PluginInventorySnapshot {
    const entries: PluginInventoryEntry[] = []
    for (const entry of this.ctx.loader.entries()) {
      if (entry.options.group) continue
      entries.push(inventoryEntry(entry))
    }
    return { entries }
  }

  /**
   * Change one configured entry through Loader's transactional lifecycle path,
   * then persist only its enabled boolean for the next desktop launch.
   */
  @Remote('setEnabled')
  async setEnabled(entryId: PluginEntryId, enabled: boolean): Promise<PluginInventoryEntry> {
    const entry = this.ctx.loader.resolve(entryId)
    if (entry.options.group) throw new Error('plugin groups cannot be toggled directly')
    if (PROTECTED_ENTRY_IDS.has(entryId)) throw new Error('bootstrap plugin cannot be toggled')
    await this.ctx.loader.update(entryId, { disabled: !enabled })
    writePluginToggle(entryId, enabled)
    return inventoryEntry(this.ctx.loader.resolve(entryId))
  }
}

export default PluginInventoryGateway
