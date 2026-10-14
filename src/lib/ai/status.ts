// Server-only: whether Zenfest AI is live. Off when the FEATURES.ai flag is off, the
// admin kill switch is unticked or no API key is set, so deploying without a key never
// breaks the site: every AI entry point then links to /enquire instead (same idea as
// verifyMode()).
import { FEATURES } from '../features'
import type { SiteSettings } from '../site'
import { aiConfigured } from './config'

export function aiAvailable(settings: SiteSettings): boolean {
  return FEATURES.ai && settings.ai?.enabled !== false && aiConfigured()
}
