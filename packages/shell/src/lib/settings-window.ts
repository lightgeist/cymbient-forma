import { isDesktop } from '@sheet/platform'

/** Open native settings on desktop, or the same Settings route in a browser. */
export function openSettingsWindow() {
  if (!isDesktop()) {
    window.location.assign('/settings')
    return
  }
  void fetch('/desktop/settings', { method: 'POST' }).catch(() => undefined)
}
