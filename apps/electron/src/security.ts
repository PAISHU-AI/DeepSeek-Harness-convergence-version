/** Desktop navigation and external-link policy. */

/** Whether a renderer navigation stays on the exact Host origin assigned to this process. */
export function isAllowedNavigation(candidate: string, host: URL): boolean {
  try {
    return new URL(candidate).origin === host.origin
  } catch {
    return false
  }
}

/** Whether a renderer-requested external link may be handed to the operating system. */
export function isAllowedExternalUrl(candidate: string): boolean {
  try {
    return new URL(candidate).protocol === 'https:'
  } catch {
    return false
  }
}
