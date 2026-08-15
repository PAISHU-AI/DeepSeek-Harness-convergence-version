/** `deliverables` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'deliverables'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'produced.label': '产物',
  'produced.moreOne': '+ 1 个文件',
  'produced.more': '+ {count} 个文件',
  'produced.open': '打开 {name}',
  'produced.showInFolder': '在文件夹中显示',
  'artifact.loading': '正在加载产物…',
  'artifact.preview': '预览',
  'artifact.edit': '编辑',
  'artifact.save': '保存修改',
  'artifact.saving': '正在保存…',
  'artifact.saved': '已保存',
  'artifact.failed': '无法加载此产物：{message}',
  'artifact.saveFailed': '保存失败：{message}',
  'artifact.imageAlt': '生成的图片产物',
  'artifact.docxPreview': 'Word 文档已保持原格式。点击“在默认应用中编辑”即可完整预览和修改。',
  'artifact.openNativeEditor': '在默认应用中编辑',
  'artifact.livePreview': '实时预览',
  'artifact.expandPreview': '放大预览',
  'artifact.expandedPreview': '网页大预览',
  'artifact.expandedEditor': '网页放大编辑',
  'artifact.expandedMarkdownPreview': '文档大预览',
  'artifact.expandedMarkdownEditor': '文档放大编辑',
  'artifact.closeExpandedPreview': '退出大预览',
}

/** English dictionary (same key set). */
export const en: Record<DeliverablesKey, string> = {
  'produced.label': 'Produced',
  'produced.moreOne': '+ 1 file',
  'produced.more': '+ {count} files',
  'produced.open': 'Open {name}',
  'produced.showInFolder': 'Show in folder',
  'artifact.loading': 'Loading artifact…',
  'artifact.preview': 'Preview',
  'artifact.edit': 'Edit',
  'artifact.save': 'Save changes',
  'artifact.saving': 'Saving…',
  'artifact.saved': 'Saved',
  'artifact.failed': 'Could not load this artifact: {message}',
  'artifact.saveFailed': 'Could not save: {message}',
  'artifact.imageAlt': 'Generated image artifact',
  'artifact.docxPreview': 'The original Word document is preserved. Open it in the default application to preview and edit it completely.',
  'artifact.openNativeEditor': 'Edit in default app',
  'artifact.livePreview': 'Live preview',
  'artifact.expandPreview': 'Expand preview',
  'artifact.expandedPreview': 'Expanded webpage preview',
  'artifact.expandedEditor': 'Expanded webpage editor',
  'artifact.expandedMarkdownPreview': 'Expanded document preview',
  'artifact.expandedMarkdownEditor': 'Expanded document editor',
  'artifact.closeExpandedPreview': 'Exit expanded preview',
}

/** Union of this namespace's dictionary keys. */
export type DeliverablesKey = keyof typeof zh
