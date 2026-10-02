// Server-only: whether Zenfest AI is live. Off when the admin kill switch is unticked
// or no API key is set, so deploying without a key never breaks the site: every AI
// entry point then links to /contact instead (same idea as verifyMode()).
import type { SiteSettings } from '../site'
import { aiConfigured } from './config'

export function aiAvailable(settings: SiteSettings): boolean {
  return settings.ai?.enabled !== false && aiConfigured()
}
