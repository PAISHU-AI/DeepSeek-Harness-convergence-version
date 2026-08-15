/** Copy dictionaries for the plugin inventory Settings section. */

/** Simplified Chinese dictionary and key source of truth. */
export const zh = {
  tab: '插件列表',
  loading: '正在读取插件…',
  error: '暂时无法读取插件。',
  changeError: '插件状态更新失败，请重试。',
  retry: '重试',
  search: '搜索插件',
  catalog: '插件列表',
  empty: '暂无插件。',
  emptySearch: '没有匹配的插件。',
  enabledTag: '已启用',
  disabledTag: '已停用',
  configuration: '配置状态',
  purpose: '功能说明',
  protectedToggle: '系统启动项，不能关闭',
  hmrToggleUnavailable: '配置热更新已内置',
  cordis: 'Cordis 状态',
  unobserved: '未挂载',
  pending: '等待依赖',
  loadingPhase: '加载中',
  active: '已挂载',
  failed: '挂载失败',
  unloading: '卸载中',
} satisfies Record<string, string>

/** Plugin inventory locale key union. */
export type PluginInventoryLocaleKey = keyof typeof zh

/** English dictionary checked against the Chinese key set. */
export const en = {
  tab: 'Plugin list',
  loading: 'Reading plugins…',
  error: 'Plugins are temporarily unavailable.',
  changeError: 'The plugin state could not be updated. Please try again.',
  retry: 'Retry',
  search: 'Search plugins',
  catalog: 'Plugin list',
  empty: 'No plugins are available.',
  emptySearch: 'No matching plugins.',
  enabledTag: 'Enabled',
  disabledTag: 'Disabled',
  configuration: 'Configuration',
  purpose: 'Purpose',
  protectedToggle: 'System bootstrap entry; cannot be disabled',
  hmrToggleUnavailable: 'Config hot reload is built in; full module HMR is not supported yet',
  cordis: 'Cordis status',
  unobserved: 'Not mounted',
  pending: 'Waiting for dependencies',
  loadingPhase: 'Loading',
  active: 'Mounted',
  failed: 'Mount failed',
  unloading: 'Unloading',
} satisfies Record<PluginInventoryLocaleKey, string>
