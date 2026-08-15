/** Browser-local upload classification and model-context formatting. */
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment'
// Mammoth's package root is Node-oriented. Its standalone browser build owns
// an internal module table and accepts ArrayBuffer input without Node built-ins.
import mammoth from 'mammoth/mammoth.browser.js'

/** Text-bearing file formats supported by the composer. */
export type DocumentFormat = 'pdf' | 'docx' | 'text' | 'markdown' | 'csv' | 'json'

/** A file category accepted by the composer before any bytes are retained. */
export type UploadClassification =
  | { readonly kind: 'image'; readonly mediaType: ImageMediaType }
  | { readonly kind: 'document'; readonly format: DocumentFormat }

/** Minimal document projection held in the browser draft and serialized to text. */
export interface ParsedDocument {
  readonly name: string
  readonly text: string
  readonly truncated: boolean
}

/** Maximum text sent for one document, before the visible truncation marker. */
export const MAX_DOCUMENT_CHARACTERS = 100_000
/** Maximum number of documents in one submitted message. */
export const MAX_DOCUMENTS_PER_MESSAGE = 10
/** Maximum original byte length of one document. */
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024
/** Maximum aggregate original document byte length per message. */
export const MAX_DOCUMENT_BATCH_BYTES = 20 * 1024 * 1024
/** Maximum combined extracted document text in one submitted message. */
export const MAX_DOCUMENT_BATCH_CHARACTERS = 200_000

/** A visible, safe-to-localize upload rejection. */
export class UploadFileError extends Error {
  /** Machine-readable rejection reason for the UI boundary. */
  readonly reason:
    | 'unsupported-type'
    | 'mismatched-type'
    | 'parse-failed'
    | 'empty-document'
    | 'too-many-documents'
    | 'file-too-large'
    | 'batch-too-large'
    | 'batch-text-too-large'

  /** @param reason - stable intake rejection category. */
  constructor(reason: UploadFileError['reason']) {
    super(reason)
    this.name = 'UploadFileError'
    this.reason = reason
  }
}

const IMAGE_BY_EXTENSION: Readonly<Record<string, ImageMediaType>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

const DOCUMENT_BY_EXTENSION: Readonly<Record<string, DocumentFormat>> = {
  pdf: 'pdf',
  docx: 'docx',
  txt: 'text',
  md: 'markdown',
  csv: 'csv',
  json: 'json',
}

const DOCUMENT_MIME: Readonly<Record<DocumentFormat, readonly string[]>> = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  text: ['text/plain'],
  markdown: ['text/markdown', 'text/x-markdown'],
  csv: ['text/csv', 'application/csv'],
  json: ['application/json', 'text/json'],
}

/** Accept list used by the native file picker. */
export const UPLOAD_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.txt,.md,.csv,.json'

/**
 * Check whether a browser file is part of the product upload contract.
 *
 * MIME is authoritative when present. An extension may fill in a browser's
 * empty MIME only for formats with an unambiguous extension; it can never
 * disguise a contradictory MIME declaration.
 *
 * @param file - browser-selected file.
 * @returns the product attachment classification.
 * @throws {UploadFileError} for unsupported or contradictory files.
 */
export function classifyUpload(file: Pick<File, 'name' | 'type'>): UploadClassification {
  const extension = extensionOf(file.name)
  const imageType = IMAGE_BY_EXTENSION[extension]
  if (imageType !== undefined) {
    if (file.type !== '' && file.type !== imageType) throw new UploadFileError('mismatched-type')
    return { kind: 'image', mediaType: imageType }
  }
  const documentFormat = DOCUMENT_BY_EXTENSION[extension]
  if (documentFormat === undefined) throw new UploadFileError('unsupported-type')
  if (file.type !== '' && !DOCUMENT_MIME[documentFormat].includes(file.type)) {
    throw new UploadFileError('mismatched-type')
  }
  return { kind: 'document', format: documentFormat }
}

/** Enforce document count and byte limits before any document parser is loaded. */
export function assertDocumentBatch(files: readonly Pick<File, 'name' | 'type' | 'size'>[]): void {
  const documents = files.filter(file => classifyUpload(file).kind === 'document')
  if (documents.length > MAX_DOCUMENTS_PER_MESSAGE) throw new UploadFileError('too-many-documents')
  if (documents.some(file => file.size > MAX_DOCUMENT_BYTES)) throw new UploadFileError('file-too-large')
  if (documents.reduce((total, file) => total + file.size, 0) > MAX_DOCUMENT_BATCH_BYTES) {
    throw new UploadFileError('batch-too-large')
  }
}

/** Render one extracted document as an unambiguous model-visible text block. */
export function formatDocumentPrompt(document: ParsedDocument): string {
  return `[Attachment: ${document.name}]\n${document.text}${document.truncated ? '\n[content truncated]' : ''}\n[/Attachment]`
}

/**
 * Extract the model-visible text from a supported non-image file in the
 * renderer. Source bytes do not leave this function.
 *
 * @param file - validated browser document.
 * @returns name and bounded plain text for one prompt part.
 * @throws {UploadFileError} when parsing fails or yields no readable text.
 */
export async function parseDocument(file: File): Promise<ParsedDocument> {
  const classification = classifyUpload(file)
  if (classification.kind !== 'document') throw new UploadFileError('unsupported-type')
  try {
    const text = normalizeText(await extractDocument(file, classification.format))
    if (text === '') throw new UploadFileError('empty-document')
    return {
      name: file.name,
      text: text.slice(0, MAX_DOCUMENT_CHARACTERS),
      truncated: text.length > MAX_DOCUMENT_CHARACTERS,
    }
  } catch (error: unknown) {
    if (error instanceof UploadFileError) throw error
    throw new UploadFileError('parse-failed')
  }
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 1 || dot === name.length - 1 ? '' : name.slice(dot + 1).toLowerCase()
}

async function extractDocument(file: File, format: DocumentFormat): Promise<string> {
  switch (format) {
    case 'text':
    case 'markdown':
    case 'csv':
    case 'json':
      return file.text()
    case 'pdf':
      return extractPdfText(file)
    case 'docx':
      return extractDocxText(file)
  }
}

async function extractPdfText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const source = new TextDecoder('latin1').decode(bytes)
  return [...source.matchAll(/\(([^()]*)\)\s*Tj|\[([^\]]*)\]\s*TJ/g)]
    .flatMap(match => (match[1] ?? match[2] ?? '').match(/\(([^()]*)\)/g) ?? [match[1] ?? ''])
    .map(text => text.slice(1, -1).replace(/\\([()\\])/g, '$1'))
    .join('\n')
}

async function extractDocxText(file: File): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}

function normalizeText(value: string): string {
  return value.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim()
}
