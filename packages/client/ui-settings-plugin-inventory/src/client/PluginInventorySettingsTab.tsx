import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import type { PluginInventorySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import {
  IconChevronDownOutline14,
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PluginInventoryLocaleKey } from './locales.ts'
import css from './PluginInventorySettingsTab.module.css'

/** Registration-side Remote face used by the section. */
export interface PluginInventorySettingsTabInjected {
  /** Read a current Host inventory snapshot. */
  list: () => Promise<PluginInventorySnapshot>
  /** Change one Loader entry and wait for its lifecycle transition. */
  setEnabled: (entryId: PluginInventoryEntry['entryId'], enabled: boolean) => Promise<PluginInventoryEntry>
}

type PluginInventoryEntry = PluginInventorySnapshot['entries'][number]
type PluginFiberPhase = PluginInventoryEntry['fiberPhase']

/** Full component props assembled by the Settings slot renderer. */
export type PluginInventorySettingsTabProps =
  PropsRuntime<'settings.plugins.tab'>
  & PropsLocale<'settings.pluginInventory'>
  & InjectFace<PluginInventorySettingsTabInjected>

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly snapshot: PluginInventorySnapshot }

const PHASE_KEYS = {
  pending: 'pending',
  loading: 'loadingPhase',
  active: 'active',
  failed: 'failed',
  unloading: 'unloading',
} satisfies Record<Exclude<PluginFiberPhase, null>, PluginInventoryLocaleKey>

/** Localized accessible label for one root Fiber phase. */
function phaseLabel(
  phase: PluginFiberPhase,
  t: PluginInventorySettingsTabProps['t'],
): string {
  return phase === null ? t('unobserved') : t(PHASE_KEYS[phase])
}

/** Compact a module specifier without guessing whether its Loader id was generated. */
function moduleShortName(moduleName: string): string {
  const unscoped = moduleName.startsWith('@') ? moduleName.slice(moduleName.indexOf('/') + 1) : moduleName
  return unscoped
    .replace(/^cordis:/, '')
    .replace(/^cordis-plugin-/, '')
    .replace(/^dsh-(?:host-|client-)?/, '')
}

/** Product explanations for every built-in plugin shown by the desktop host. */
const PLUGIN_PURPOSES: Record<string, string> = {
  '@deepseek-ai/cordis-plugin-hmr': '开发时监听配置与模块变化，并热更新运行中的功能。',
  '@deepseek-ai/cordis-plugin-timer': '为定时任务、重试和延迟操作提供计时能力。',
  '@deepseek-ai/dsh-agent': '管理 AI 助手的任务执行生命周期。',
  '@deepseek-ai/dsh-agent-default-model': '为新任务选择默认模型。',
  '@deepseek-ai/dsh-agent-instructions': '把项目说明和用户指令加入助手上下文。',
  '@deepseek-ai/dsh-agent-loop': '驱动助手的连续推理与工具调用循环。',
  '@deepseek-ai/dsh-agent-presets': '保存和应用常用助手预设。',
  '@deepseek-ai/dsh-api-gateway': '提供桌面界面与本地 Host 之间的 API 通道。',
  '@deepseek-ai/dsh-api-remotes': '把 Host 服务安全地暴露给桌面界面调用。',
  '@deepseek-ai/dsh-attachment-local': '在本机保存并读取上传的图片和文件。',
  '@deepseek-ai/dsh-bash-sandbox': '在受控环境中执行 Bash 命令。',
  '@deepseek-ai/dsh-client-connection': '维护桌面界面与本地服务的连接状态。',
  '@deepseek-ai/dsh-client-hmr': '开发时刷新客户端界面模块。',
  '@deepseek-ai/dsh-client-locale': '加载中文、英文等界面语言资源。',
  '@deepseek-ai/dsh-client-modules': '加载桌面界面的客户端插件模块。',
  '@deepseek-ai/dsh-client-runtime': '提供客户端状态、路由和运行时基础能力。',
  '@deepseek-ai/dsh-client-ui-agent-preset': '提供助手预设的界面入口。',
  '@deepseek-ai/dsh-client-ui-commands': '提供斜杠命令的提示和选择界面。',
  '@deepseek-ai/dsh-client-ui-conversation': '提供对话消息、输入框和附件交互界面。',
  '@deepseek-ai/dsh-client-ui-deliverables': '在右侧预览和编辑生成的网页、文档与图片。',
  '@deepseek-ai/dsh-client-ui-goal': '显示和编辑长期任务目标。',
  '@deepseek-ai/dsh-client-ui-input-trigger': '处理输入框中的命令触发与联想。',
  '@deepseek-ai/dsh-client-ui-jobs': '显示后台任务与执行进度。',
  '@deepseek-ai/dsh-client-ui-layout': '提供桌面主界面布局与分栏。',
  '@deepseek-ai/dsh-client-ui-message-feedback': '收集会话消息反馈。',
  '@deepseek-ai/dsh-client-ui-model-selection': '提供模型选择与切换界面。',
  '@deepseek-ai/dsh-client-ui-permission-presets': '提供只读、工作区写入和完全访问权限选择。',
  '@deepseek-ai/dsh-client-ui-plan': '显示和管理任务计划。',
  '@deepseek-ai/dsh-client-ui-settings': '提供设置页的容器与导航。',
  '@deepseek-ai/dsh-client-ui-settings-general': '提供通用设置选项。',
  '@deepseek-ai/dsh-client-ui-settings-models': '提供模型与供应商设置。',
  '@deepseek-ai/dsh-client-ui-settings-plugin-inventory': '提供本页插件列表、状态和启停控制。',
  '@deepseek-ai/dsh-client-ui-settings-plugins': '提供插件设置页入口。',
  '@deepseek-ai/dsh-client-ui-sidebar': '提供会话侧边栏与任务列表。',
  '@deepseek-ai/dsh-client-ui-skill': '显示可用技能及其说明。',
  '@deepseek-ai/dsh-client-ui-subagent': '显示子代理任务和状态。',
  '@deepseek-ai/dsh-client-ui-theme': '提供明暗主题和外观设置。',
  '@deepseek-ai/dsh-client-ui-tool': '显示工具调用、输入和结果。',
  '@deepseek-ai/dsh-client-ui-trajectory': '展示任务执行过程与步骤。',
  '@deepseek-ai/dsh-client-ui-user-questions': '显示助手向用户提出的待答问题。',
  '@deepseek-ai/dsh-client-ui-workflow-run': '显示工作流运行进度与结果。',
  '@deepseek-ai/dsh-client-ui-workspace': '提供工作区选择和文件范围界面。',
  '@deepseek-ai/dsh-command-compact': '压缩较早对话历史以节省上下文。',
  '@deepseek-ai/dsh-command-feedback': '处理会话反馈命令。',
  '@deepseek-ai/dsh-command-goal': '处理设置和查看长期目标的命令。',
  '@deepseek-ai/dsh-commands': '注册并分发斜杠命令。',
  '@deepseek-ai/dsh-compaction-basic': '执行基础对话历史压缩。',
  '@deepseek-ai/dsh-compaction-tool-result-pruner': '清理过长的工具结果以节省上下文。',
  '@deepseek-ai/dsh-cordis-client-runner': '在浏览器端运行客户端插件树。',
  '@deepseek-ai/dsh-cordis-host-runner': '在本地 Host 进程中运行服务插件树。',
  '@deepseek-ai/dsh-credentials-local': '在本机安全读取模型凭据；不会写入安装包。',
  '@deepseek-ai/dsh-fs-observation-policy': '限制助手对文件系统的观察范围。',
  '@deepseek-ai/dsh-fs-sandbox': '在沙箱策略下提供文件系统访问。',
  '@deepseek-ai/dsh-goal': '保存长期任务目标和进度。',
  '@deepseek-ai/dsh-host-apiproxy': '将桌面请求转发给模型 API。',
  '@deepseek-ai/dsh-host-directory-picker-auto': '自动提供本机目录选择能力。',
  '@deepseek-ai/dsh-host-plugin-inventory': '读取插件状态并保存用户选择的启停偏好。',
  '@deepseek-ai/dsh-host-webserver': '提供桌面应用使用的本地网页服务。',
  '@deepseek-ai/dsh-jobs-local': '在本机执行和追踪后台任务。',
  '@deepseek-ai/dsh-llm': '定义模型调用的通用能力。',
  '@deepseek-ai/dsh-llm-deepseek': '连接 DeepSeek 模型服务。',
  '@deepseek-ai/dsh-llm-pi-ai': '连接兼容 Pi AI 协议的模型服务。',
  '@deepseek-ai/dsh-llm-retry': '在模型请求失败时按策略重试。',
  '@deepseek-ai/dsh-permission-presets': '定义只读、工作区写入和完全访问权限规则。',
  '@deepseek-ai/dsh-plan-mode': '让助手以计划模式工作并等待确认。',
  '@deepseek-ai/dsh-pwsh-sandbox': '在受控环境中执行 PowerShell 命令。',
  '@deepseek-ai/dsh-sandbox-local': '为本机工作区提供沙箱执行环境。',
  '@deepseek-ai/dsh-sandbox-policy': '决定工具操作所需的授权规则。',
  '@deepseek-ai/dsh-session': '管理会话创建、切换和状态。',
  '@deepseek-ai/dsh-session-log-export': '导出会话记录为压缩文件。',
  '@deepseek-ai/dsh-session-persistence-jsonl': '在本机以 JSONL 格式保存会话记录。',
  '@deepseek-ai/dsh-session-projection-cache': '缓存会话界面所需的状态投影。',
  '@deepseek-ai/dsh-session-query-sqlite': '使用 SQLite 查询会话数据。',
  '@deepseek-ai/dsh-session-stats': '统计会话用量和运行信息。',
  '@deepseek-ai/dsh-session-title': '生成和维护会话标题。',
  '@deepseek-ai/dsh-settings-file': '读取和保存本机应用设置。',
  '@deepseek-ai/dsh-skill': '发现并加载可供助手使用的技能。',
  '@deepseek-ai/dsh-skill-filesystem': '从本地目录读取技能定义。',
  '@deepseek-ai/dsh-storage-json': '将轻量数据保存为本地 JSON。',
  '@deepseek-ai/dsh-subagent': '管理子代理任务。',
  '@deepseek-ai/dsh-subprocess-local': '在本机创建受控子进程。',
  '@deepseek-ai/dsh-system-prompt': '组装发送给助手的系统提示词。',
  '@deepseek-ai/dsh-token-meter': '估算和记录上下文 Token 用量。',
  '@deepseek-ai/dsh-tools': '注册助手可调用的全部工具。',
  '@deepseek-ai/dsh-user-approval': '在敏感操作前请求用户确认。',
  '@deepseek-ai/dsh-user-questions': '处理助手向用户提出的问题。',
  '@deepseek-ai/dsh-web-search-deepseek': '通过 DeepSeek 服务执行网页搜索。',
  '@deepseek-ai/dsh-workspace': '管理当前任务的工作目录和边界。',
}

/** A Chinese, user-facing explanation for each catalog entry, including external plugins. */
function pluginPurpose(moduleName: string): string {
  const known = PLUGIN_PURPOSES[moduleName]
  if (known !== undefined) return known
  if (moduleName.includes('tool-')) return '为助手提供对应名称的工具调用能力。'
  if (moduleName.includes('session-')) return '为会话提供对应的保存、查询或状态处理能力。'
  if (moduleName.includes('client-ui-')) return '为桌面界面提供对应名称的功能区域。'
  if (moduleName.includes('llm-')) return '为模型调用提供对应的连接或处理能力。'
  return `第三方插件“${moduleShortName(moduleName)}”：提供该插件声明的扩展能力。`
}

/** Whether an inventory row matches the local catalog query. */
function matches(entry: PluginInventoryEntry, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) return true
  return [entry.moduleName, entry.entryId, pluginPurpose(entry.moduleName)]
    .some(value => value.toLocaleLowerCase().includes(normalizedQuery))
}

/** Render the read-only current Loader inventory. */
export function PluginInventorySettingsTab({ list, setEnabled, t }: PluginInventorySettingsTabProps): ReactNode {
  const catalogId = useId()
  const [request, setRequest] = useState(0)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<PluginInventoryEntry['entryId'] | null>(null)
  const [changing, setChanging] = useState<PluginInventoryEntry['entryId'] | null>(null)
  const [changeError, setChangeError] = useState(false)
  const [state, setState] = useState<ViewState>({ status: 'loading' })

  useEffect(() => {
    let current = true
    void Promise.resolve().then(() => list()).then(
      (snapshot) => { if (current) setState({ status: 'ready', snapshot }) },
      () => { if (current) setState({ status: 'error' }) },
    )
    return () => { current = false }
  }, [list, request])

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredEntries = useMemo(
    () => state.status === 'ready'
      ? state.snapshot.entries.filter(entry => matches(entry, normalizedQuery))
      : [],
    [normalizedQuery, state],
  )

  useEffect(() => {
    if (expanded !== null && !filteredEntries.some(entry => entry.entryId === expanded)) {
      setExpanded(null)
    }
  }, [expanded, filteredEntries])

  const retry = (): void => {
    setState({ status: 'loading' })
    setRequest(value => value + 1)
  }

  const toggle = async (entry: PluginInventoryEntry): Promise<void> => {
    if (changing !== null) return
    setChanging(entry.entryId)
    setChangeError(false)
    try {
      await setEnabled(entry.entryId, !entry.enabled)
      retry()
    } catch {
      setChangeError(true)
    } finally {
      setChanging(null)
    }
  }

  return (
    <div className={css.section} aria-busy={state.status === 'loading'}>
      {state.status === 'loading' ? <p className={css.status}>{t('loading')}</p> : null}
      {state.status === 'error' ? (
        <div className={css.failure}>
          <p role="alert">{t('error')}</p>
          <button type="button" onClick={retry}>{t('retry')}</button>
        </div>
      ) : null}
      {changeError ? <p className={css.changeError} role="alert">{t('changeError')}</p> : null}
      {state.status === 'ready' ? (
        <div className={css.catalog}>
          <label className={css.search}>
            <IconSearchOutline16 aria-hidden="true" />
            <span className={css.visuallyHidden}>{t('search')}</span>
            <input
              type="search"
              value={query}
              placeholder={t('search')}
              aria-label={t('search')}
              onChange={(event) => { setQuery(event.currentTarget.value) }}
            />
          </label>
          <div className={css.catalogHeading}>
            <h3>{t('catalog')}</h3>
            <span data-plugin-count={filteredEntries.length}>{filteredEntries.length}</span>
          </div>
          {state.snapshot.entries.length === 0 ? <p className={css.status}>{t('empty')}</p> : null}
          {state.snapshot.entries.length > 0 && filteredEntries.length === 0
            ? <p className={css.status}>{t('emptySearch')}</p>
            : null}
          {filteredEntries.length > 0 ? (
            <ul className={css.cards}>
              {filteredEntries.map((entry) => {
                const status = phaseLabel(entry.fiberPhase, t)
                const title = moduleShortName(entry.moduleName)
                const purpose = pluginPurpose(entry.moduleName)
                const protectedEntry = entry.entryId === 'include'
                const hmrEntry = entry.entryId === 'include:hmr'
                const toggleNotice = protectedEntry
                  ? t('protectedToggle')
                  : hmrEntry ? t('hmrToggleUnavailable') : null
                const configuration = t(entry.enabled ? 'enabledTag' : 'disabledTag')
                const open = expanded === entry.entryId
                const detailId = `${catalogId}-details-${encodeURIComponent(entry.entryId)}`
                return (
                  <li
                    className={css.card}
                    key={entry.entryId}
                    data-plugin-entry={entry.entryId}
                    data-open={open ? 'true' : undefined}
                  >
                    <div
                      className={css.cardContent}
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      aria-controls={detailId}
                      aria-label={entry.enabled ? `${title}, ${status}, ${configuration}` : `${title}, ${configuration}`}
                      title={purpose}
                      onClick={() => {
                        setExpanded(current => current === entry.entryId ? null : entry.entryId)
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        setExpanded(current => current === entry.entryId ? null : entry.entryId)
                      }}
                    >
                      <strong className={css.cardTitle} title={`${purpose}\n${entry.moduleName}`}>{title}</strong>
                      <span className={css.cardTrailing}>
                        {entry.enabled ? (
                          <span
                            className={css.statusDot}
                            data-phase={entry.fiberPhase ?? 'unobserved'}
                            role="img"
                            aria-label={status}
                            title={status}
                          />
                        ) : null}
                        <span className={css.configTag} data-enabled={entry.enabled ? 'true' : 'false'}>
                          {configuration}
                        </span>
                        {toggleNotice !== null && <span className={css.toggleNotice}>{toggleNotice}</span>}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={entry.enabled}
                          aria-label={toggleNotice ?? `切换 ${title}`}
                          title={toggleNotice ?? purpose}
                          className={css.toggle}
                          data-enabled={entry.enabled ? 'true' : 'false'}
                          disabled={toggleNotice !== null || changing === entry.entryId}
                          onClick={(event) => {
                            event.stopPropagation()
                            void toggle(entry)
                          }}
                        >
                          <span aria-hidden="true" />
                        </button>
                        <IconChevronDownOutline14 className={css.chevron} size={12} aria-hidden="true" />
                      </span>
                    </div>
                    {open ? (
                      <div className={css.cardDetails} id={detailId}>
                        <code className={css.entryValue} data-loader-entry>{entry.entryId}</code>
                        <dl className={css.details}>
                          <div>
                            <dt>{t('purpose')}</dt>
                            <dd>{purpose}</dd>
                          </div>
                          <div>
                            <dt>{t('configuration')}</dt>
                            <dd>{configuration}</dd>
                          </div>
                          {entry.enabled ? (
                            <div>
                              <dt>{t('cordis')}</dt>
                              <dd>{status}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
