/** Owned lifecycle for the local dsh Web Host process. */

import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'

const READY_PREFIX = 'dsh web: '
const START_TIMEOUT_MS = 30_000
const STOP_GRACE_MS = 5_000
const MAX_DIAGNOSTIC_BYTES = 16_384

/** Parse one dsh Web Host status line, accepting only its loopback HTTP endpoint. */
export function parseHostUrl(line: string): URL | undefined {
  if (!line.startsWith(READY_PREFIX)) return undefined
  try {
    const url = new URL(line.slice(READY_PREFIX.length).trim().split(' ')[0] ?? '')
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port === '') return undefined
    return url
  } catch {
    return undefined
  }
}

/** Inputs used to launch one isolated local dsh Host. */
export interface HostProcessOptions {
  /** Electron executable used in Node compatibility mode. */
  nodePath: string
  /** Absolute path of the built `@deepseek-ai/dsh` CLI entry. */
  dshEntry: string
  /** Harness state directory for this desktop installation. */
  dshHome: string
}

/** Starts, observes, and terminates the one Host process owned by the desktop application. */
export class HostProcess {
  private child: ChildProcess | undefined
  private startPromise: Promise<URL> | undefined
  private diagnostics = ''

  constructor(private readonly options: HostProcessOptions) {}

  /** Start the local Host once and resolve when it announces its loopback origin. */
  start(): Promise<URL> {
    this.startPromise ??= this.startOnce()
    return this.startPromise
  }

  /** Stop the owned Host. Repeated calls are harmless. */
  async stop(): Promise<void> {
    const child = this.child
    if (child === undefined || child.exitCode !== null || child.signalCode !== null) return
    child.kill('SIGTERM')
    await Promise.race([
      once(child, 'exit').then(() => undefined),
      new Promise<void>(resolve => setTimeout(resolve, STOP_GRACE_MS)),
    ])
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL')
      await once(child, 'exit')
    }
  }

  private startOnce(): Promise<URL> {
    const child = spawn(this.options.nodePath, [this.options.dshEntry, 'web', '--port', '0'], {
      env: {
        ...process.env,
        DSH_HOME: this.options.dshHome,
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    this.child = child

    return new Promise<URL>((resolve, reject) => {
      let settled = false
      let pending = ''
      const finish = (value: URL | Error): void => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (value instanceof URL) resolve(value)
        else reject(value)
      }
      const read = (chunk: Buffer): void => {
        const text = chunk.toString('utf8')
        this.diagnostics = `${this.diagnostics}${text}`.slice(-MAX_DIAGNOSTIC_BYTES)
        pending += text
        const lines = pending.split(/\r?\n/)
        pending = lines.pop() ?? ''
        for (const line of lines) {
          const url = parseHostUrl(line)
          if (url !== undefined) finish(url)
        }
      }
      const timeout = setTimeout(() => {
        finish(new Error(`DeepSeek Harness Host did not become ready within ${String(START_TIMEOUT_MS)} ms.\n${this.diagnostics}`))
      }, START_TIMEOUT_MS)

      child.stdout?.on('data', read)
      child.stderr?.on('data', read)
      child.once('error', error => finish(error))
      child.once('exit', (code, signal) => {
        if (!settled) finish(new Error(`DeepSeek Harness Host exited before startup (code ${String(code)}, signal ${String(signal)}).\n${this.diagnostics}`))
      })
    })
  }
}
