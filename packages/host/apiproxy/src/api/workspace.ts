/**
 * workspace domain contract. Wire projection of the host-side workspace
 * entity (@deepseek-ai/dsh-workspace): a stable id over a directory path,
 * a display title, and the ordered session account. Method signatures are the
 * source of truth, same as the sessions domain.
 */

import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Branded } from '@deepseek-ai/dsh-brand'
import type { RpcRequest, RpcResponse } from './rpc.ts'

/**
 * Wire-side workspace id brand. Deliberately re-declared here rather than
 * imported from dsh-workspace: api/ must stay browser-importable with zero
 * host-package dependencies, and the brand string matches, so both sides
 * agree structurally.
 */
export type WorkspaceId = Branded<'WorkspaceId'>

/** One workspace row: the record projection every workspace.* value carries. */
export interface WorkspaceView {
  workspaceId: WorkspaceId
  /** Canonical directory path (host-side realpath canon). */
  path: string
  /** Display title (defaults to the path basename at create). */
  title: string
  /**
   * Sessions accounted under this workspace, in manually owned order
   * (attach prepends, insertSessionBefore reorders; activity never does).
   */
  sessionIds: SessionId[]
  /** ISO-8601 creation instant. */
  createdAt: string
  /** ISO-8601 last-mutation instant. */
  updatedAt: string
}

/** A previewable artifact read from a workspace-owned path. */
export type WorkspaceArtifactFile =
  | { kind: 'text'; content: string }
  | { kind: 'image'; mimeType: string; data: string }
  /** Original document bytes for an in-panel PDF viewer or native Word editor. */
  | { kind: 'binary'; format: 'pdf' | 'docx'; mimeType: string; data: string }

/** Strictly one write representation: UTF-8 text or canonical raster bytes. */
export type WorkspaceArtifactWrite =
  | { workspaceId: WorkspaceId; path: string; content: string }
  | { workspaceId: WorkspaceId; path: string; data: string }

/** Workspace-domain unary methods (the map keys workspace.* of RpcMethodMap). */
export interface WorkspaceApi {
  /**
   * Lists all workspaces in the registry's durable display order, plus the
   * registry-global archive set (the reconnect baseline of
   * `host/archived-sessions-changed`). Archived sessions stay in their
   * workspace's `sessionIds` account; grouping surfaces hide them.
   */
  list(request: RpcRequest<{}>): Promise<RpcResponse<{ items: WorkspaceView[]; archivedSessionIds: SessionId[] }>>

  /**
   * Creates (or idempotently resolves) a workspace over an EXISTING directory
   * (no mkdir — a missing or non-directory path fails with
   * `workspace-invalid-path`). A path resolving to a directory already owned
   * by a workspace returns that workspace (`created: false`). Adoption allows
   * distinct canonical paths whose basenames produce the same display title;
   * the registry's basename title default names the new workspace.
   */
  create(request: RpcRequest<{ path: string }>):
  Promise<RpcResponse<{ workspace: WorkspaceView; created: boolean }>>

  /**
   * Renames a workspace. `title` is trimmed and must be non-empty
   * (schema-enforced). An unknown id fails with `workspace-not-found`; a
   * title equal to another workspace's fails with `workspace-name-conflict`.
   * Renaming to the current title is a no-op success (no durable write).
   */
  rename(request: RpcRequest<{ workspaceId: WorkspaceId; title: string }>):
  Promise<RpcResponse<{ workspace: WorkspaceView }>>

  /**
   * Removes one Workspace registration. The directory, every user file, and
   * every session log remain untouched; those Sessions consequently become
   * ungrouped. An unknown id fails with `workspace-not-found`.
   */
  delete(request: RpcRequest<{ workspaceId: WorkspaceId }>):
  Promise<RpcResponse<{ deleted: true }>>

  /**
   * Moves one Workspace within the registry display order,
   * DOM-insertBefore-like. An omitted anchor appends to the end.
   */
  insertBefore(request: RpcRequest<{
    workspaceId: WorkspaceId
    beforeWorkspaceId?: WorkspaceId
  }>): Promise<RpcResponse<{ workspaceIds: WorkspaceId[] }>>

  /**
   * Moves an accounted session within its workspace's manual order,
   * DOM-insertBefore-like: with `beforeSessionId` the session is inserted
   * before that anchor; omitted appends to the end. An unknown workspace
   * fails with `workspace-not-found`; a session or anchor not accounted by
   * the workspace fails with `workspace-move-invalid`. A move to the current
   * position is a no-op success.
   */
  insertSessionBefore(request: RpcRequest<{
    workspaceId: WorkspaceId
    sessionId: SessionId
    beforeSessionId?: SessionId
  }>): Promise<RpcResponse<{ workspace: WorkspaceView }>>

  /**
   * Adds one session to the registry-global archive set: the session
   * disappears from every grouping surface but keeps its session log and its
   * workspace accounting slot (a future unarchive restores its position).
   * Idempotent for an already archived id. A session neither live nor in
   * session persistence fails with `session-not-found`. Returns the full
   * updated set (same snapshot the changed frame carries).
   */
  archiveSession(request: RpcRequest<{ sessionId: SessionId }>):
  Promise<RpcResponse<{ archivedSessionIds: SessionId[] }>>

  /**
   * Reads one previewable artifact below a registered workspace. The path is
   * always relative, cannot traverse outside the workspace, and excludes
   * credential-bearing and VCS paths. Text and common raster-image formats
   * are bounded before crossing the RPC boundary.
   */
  readFile(request: RpcRequest<{ workspaceId: WorkspaceId; path: string }>):
  Promise<RpcResponse<WorkspaceArtifactFile>>

  /**
   * Opens one existing artifact through the OS default application after the
   * host resolves it below the registered workspace root. This is the
   * original-format edit path for PDF and Word files.
   */
  openFile(
    request: RpcRequest<{ workspaceId: WorkspaceId; path: string }>,
    signal: AbortSignal,
  ): Promise<RpcResponse<{ opened: true }>>

  /**
   * Replaces one existing editable artifact below a registered workspace.
   * Text and known raster images are supported; other binary files stay
   * original-format only and must use their native editor.
   */
  writeFile(request: RpcRequest<WorkspaceArtifactWrite>):
  Promise<RpcResponse<{ bytes: number }>>
}
