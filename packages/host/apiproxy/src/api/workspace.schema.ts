/**
 * workspace domain zod schemas (names derived from map keys). The
 * WorkspaceId brand cast lives in sessions.schema (see the note there) and
 * is re-exported here as the domain-local name.
 */

import { z } from 'zod'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { Wire } from './rpc.schema.ts'
import type { WorkspaceArtifactFile, WorkspaceArtifactWrite, WorkspaceView } from './workspace.ts'
import { sessionIdSchema, workspaceIdSchema } from './sessions.schema.ts'

export { workspaceIdSchema } from './sessions.schema.ts'

/** WorkspaceView row of every workspace.* response. */
export const workspaceViewSchema = z.object({
  workspaceId: workspaceIdSchema,
  path: z.string(),
  title: z.string(),
  sessionIds: z.array(sessionIdSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<Wire<WorkspaceView>>

/** workspace.list request payload (empty object literal). */
export const workspaceListRequestSchema = z.object({}) satisfies z.ZodType<Wire<RequestPayload<'workspace.list'>>>

/** workspace.list response value. */
export const workspaceListValueSchema = z.object({
  items: z.array(workspaceViewSchema),
  archivedSessionIds: z.array(sessionIdSchema),
}) satisfies z.ZodType<Wire<ResponseValue<'workspace.list'>>>

/** workspace.create request payload: the existing directory to adopt. */
export const workspaceCreateRequestSchema = z.object({
  path: z.string(),
}) satisfies z.ZodType<Wire<RequestPayload<'workspace.create'>>>

/** workspace.create response value. */
export const workspaceCreateValueSchema = z.object({
  workspace: workspaceViewSchema,
  created: z.boolean(),
}) satisfies z.ZodType<Wire<ResponseValue<'workspace.create'>>>

/** workspace.rename request payload: the new title must be non-blank. */
export const workspaceRenameRequestSchema = z.object({
  workspaceId: workspaceIdSchema,
  title: z.string(),
}).refine(
  payload => payload.title.trim() !== '',
  { message: 'workspace.rename requires a non-blank title' },
) satisfies z.ZodType<Wire<RequestPayload<'workspace.rename'>>>

/** workspace.rename response value. */
export const workspaceRenameValueSchema = z.object({
  workspace: workspaceViewSchema,
}) satisfies z.ZodType<Wire<ResponseValue<'workspace.rename'>>>

/** workspace.delete request payload. */
export const workspaceDeleteRequestSchema = z.object({
  workspaceId: workspaceIdSchema,
}) satisfies z.ZodType<Wire<RequestPayload<'workspace.delete'>>>

/** workspace.delete response value. */
export const workspaceDeleteValueSchema = z.object({
  deleted: z.literal(true),
}) satisfies z.ZodType<Wire<ResponseValue<'workspace.delete'>>>

/** workspace.insertBefore request payload (anchor omitted = append to end). */
export const workspaceInsertBeforeRequestSchema = z.object({
  workspaceId: workspaceIdSchema,
  beforeWorkspaceId: workspaceIdSchema.optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'workspace.insertBefore'>>>

/** workspace.insertBefore response value: the complete durable display order. */
export const workspaceInsertBeforeValueSchema = z.object({
  workspaceIds: z.array(workspaceIdSchema),
}) satisfies z.ZodType<Wire<ResponseValue<'workspace.insertBefore'>>>

/** workspace.insertSessionBefore request payload (anchor omitted = append to end). */
export const workspaceInsertSessionBeforeRequestSchema = z.object({
  workspaceId: workspaceIdSchema,
  sessionId: sessionIdSchema,
  beforeSessionId: sessionIdSchema.optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'workspace.insertSessionBefore'>>>

/** workspace.insertSessionBefore response value. */
export const workspaceInsertSessionBeforeValueSchema = z.object({
  workspace: workspaceViewSchema,
}) satisfies z.ZodType<Wire<ResponseValue<'workspace.insertSessionBefore'>>>

/** workspace.archiveSession request payload. */
export const workspaceArchiveSessionRequestSchema = z.object({
  sessionId: sessionIdSchema,
}) satisfies z.ZodType<Wire<RequestPayload<'workspace.archiveSession'>>>

/** workspace.archiveSession response value: the full updated archive set. */
export const workspaceArchiveSessionValueSchema = z.object({
  archivedSessionIds: z.array(sessionIdSchema),
}) satisfies z.ZodType<Wire<ResponseValue<'workspace.archiveSession'>>>

/** workspace.readFile request: paths stay relative to the registered root. */
export const workspaceReadFileRequestSchema = z.object({
  workspaceId: workspaceIdSchema,
  path: z.string(),
}) satisfies z.ZodType<Wire<RequestPayload<'workspace.readFile'>>>

/** One bounded preview payload: text, a raster image, or an original document. */
export const workspaceArtifactFileSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), content: z.string() }),
  z.object({ kind: z.literal('image'), mimeType: z.string(), data: z.string() }),
  z.object({ kind: z.literal('binary'), format: z.union([z.literal('pdf'), z.literal('docx')]), mimeType: z.string(), data: z.string() }),
]) satisfies z.ZodType<Wire<WorkspaceArtifactFile>>

/** workspace.readFile response value. */
export const workspaceReadFileValueSchema = workspaceArtifactFileSchema satisfies z.ZodType<Wire<ResponseValue<'workspace.readFile'>>>

/** workspace.openFile request: only a workspace-relative existing artifact may be handed to the OS. */
export const workspaceOpenFileRequestSchema = workspaceReadFileRequestSchema satisfies z.ZodType<Wire<RequestPayload<'workspace.openFile'>>>

/** workspace.openFile response value. */
export const workspaceOpenFileValueSchema = z.object({
  opened: z.literal(true),
}) satisfies z.ZodType<Wire<ResponseValue<'workspace.openFile'>>>

/** workspace.writeFile request: host enforces byte and file-kind limits too. */
export const workspaceWriteFileRequestSchema = z.object({
  workspaceId: workspaceIdSchema,
  path: z.string(),
  content: z.string().max(4 * 1024 * 1024),
}).or(z.object({
  workspaceId: workspaceIdSchema,
  path: z.string(),
  // Base64 grows by 4/3; the host verifies the decoded size as well.
  data: z.string().max(6 * 1024 * 1024),
})) satisfies z.ZodType<Wire<WorkspaceArtifactWrite>>

/** workspace.writeFile response value. */
export const workspaceWriteFileValueSchema = z.object({
  bytes: z.number().int().nonnegative(),
}) satisfies z.ZodType<Wire<ResponseValue<'workspace.writeFile'>>>
