// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  UploadFileError, assertDocumentBatch, classifyUpload, formatDocumentPrompt, parseDocument,
} from '../src/client/attachments/file-attachments.ts'

describe('composer file attachments', () => {
  it('classifies supported images and documents from their safe filename and MIME pairing', () => {
    expect(classifyUpload(new File(['image'], 'diagram.png', { type: 'image/png' })))
      .toEqual({ kind: 'image', mediaType: 'image/png' })
    expect(classifyUpload(new File(['# Notes'], 'notes.md', { type: 'text/markdown' })))
      .toEqual({ kind: 'document', format: 'markdown' })
    expect(classifyUpload(new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })))
      .toEqual({ kind: 'document', format: 'pdf' })
  })

  it('rejects unsupported and misleading uploads before they become a draft attachment', () => {
    expect(() => classifyUpload(new File(['x'], 'program.exe', { type: 'application/octet-stream' })))
      .toThrow(UploadFileError)
    expect(() => classifyUpload(new File(['not a PNG'], 'report.pdf', { type: 'image/png' })))
      .toThrow(UploadFileError)
  })

  it('marks extracted document text with its name and an explicit truncation marker', () => {
    expect(formatDocumentPrompt({ name: 'notes.txt', text: 'hello', truncated: false }))
      .toBe('[Attachment: notes.txt]\nhello\n[/Attachment]')
    expect(formatDocumentPrompt({ name: 'big.csv', text: 'a,b', truncated: true }))
      .toContain('[content truncated]')
  })

  it('reads text documents locally and bounds their extracted model context', async () => {
    await expect(parseDocument(new File(['one\ntwo'], 'notes.txt', { type: 'text/plain' })))
      .resolves.toEqual({ name: 'notes.txt', text: 'one\ntwo', truncated: false })
    await expect(parseDocument(new File(['x'.repeat(100_001)], 'big.md', { type: 'text/markdown' })))
      .resolves.toMatchObject({ name: 'big.md', text: 'x'.repeat(100_000), truncated: true })
  })

  it('rejects document batches that exceed the configured count and byte caps before parsing', () => {
    const files = Array.from({ length: 11 }, (_, index) =>
      new File(['x'], `note-${index}.txt`, { type: 'text/plain' }))
    expect(() => assertDocumentBatch(files)).toThrow(expect.objectContaining({ reason: 'too-many-documents' }))
    expect(() => assertDocumentBatch([
      new File([new ArrayBuffer(8 * 1024 * 1024 + 1)], 'large.txt', { type: 'text/plain' }),
    ])).toThrow(expect.objectContaining({ reason: 'file-too-large' }))
  })
})
