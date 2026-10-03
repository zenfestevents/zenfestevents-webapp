import * as migration_20260920_152319_initial from './20260920_152319_initial';
import * as migration_20260924_081959_vendor_service_details from './20260924_081959_vendor_service_details';
import * as migration_20261001_044341_host_applications from './20261001_044341_host_applications';
import * as migration_20261001_111304_gift_registry from './20261001_111304_gift_registry';
import * as migration_20261001_114626_polls from './20261001_114626_polls';
import * as migration_20261002_132939_zenfest_ai from './20261002_132939_zenfest_ai';
import * as migration_20261003_183428_marketplace_accounts from './20261003_183428_marketplace_accounts';

export const migrations = [
  {
    up: migration_20260920_152319_initial.up,
    down: migration_20260920_152319_initial.down,
    name: '20260920_152319_initial',
  },
  {
    up: migration_20260924_081959_vendor_service_details.up,
    down: migration_20260924_081959_vendor_service_details.down,
    name: '20260924_081959_vendor_service_details',
  },
  {
    up: migration_20261001_044341_host_applications.up,
    down: migration_20261001_044341_host_applications.down,
    name: '20261001_044341_host_applications',
  },
  {
    up: migration_20261001_111304_gift_registry.up,
    down: migration_20261001_111304_gift_registry.down,
    name: '20261001_111304_gift_registry',
  },
  {
    up: migration_20261001_114626_polls.up,
    down: migration_20261001_114626_polls.down,
    name: '20261001_114626_polls',
  },
  {
    up: migration_20261002_132939_zenfest_ai.up,
    down: migration_20261002_132939_zenfest_ai.down,
    name: '20261002_132939_zenfest_ai',
  },
  {
    up: migration_20261003_183428_marketplace_accounts.up,
    down: migration_20261003_183428_marketplace_accounts.down,
    name: '20261003_183428_marketplace_accounts'
  },
];
