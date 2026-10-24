import * as migration_20260920_152319_initial from './20260920_152319_initial';
import * as migration_20260924_081959_vendor_service_details from './20260924_081959_vendor_service_details';
import * as migration_20261001_044341_host_applications from './20261001_044341_host_applications';
import * as migration_20261001_111304_gift_registry from './20261001_111304_gift_registry';
import * as migration_20261001_114626_polls from './20261001_114626_polls';
import * as migration_20261002_132939_zenfest_ai from './20261002_132939_zenfest_ai';
import * as migration_20261003_183428_marketplace_accounts from './20261003_183428_marketplace_accounts';
import * as migration_20261005_142133_email_verification_google from './20261005_142133_email_verification_google';
import * as migration_20261005_173802_zenfest_shop from './20261005_173802_zenfest_shop';
import * as migration_20261009_090152_occasion_reminders from './20261009_090152_occasion_reminders';
import * as migration_20261014_032729_event_requirements from './20261014_032729_event_requirements';
import * as migration_20261014_040817_tamil_nadu_copy from './20261014_040817_tamil_nadu_copy';
import * as migration_20261014_124216_whatsapp_cloud from './20261014_124216_whatsapp_cloud';
import * as migration_20261022_172310_testimonials from './20261022_172310_testimonials';
import * as migration_20261022_172311_google_reviews from './20261022_172311_google_reviews';
import * as migration_20261024_061243_runs_club from './20261024_061243_runs_club';

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
    name: '20261003_183428_marketplace_accounts',
  },
  {
    up: migration_20261005_142133_email_verification_google.up,
    down: migration_20261005_142133_email_verification_google.down,
    name: '20261005_142133_email_verification_google',
  },
  {
    up: migration_20261005_173802_zenfest_shop.up,
    down: migration_20261005_173802_zenfest_shop.down,
    name: '20261005_173802_zenfest_shop',
  },
  {
    up: migration_20261009_090152_occasion_reminders.up,
    down: migration_20261009_090152_occasion_reminders.down,
    name: '20261009_090152_occasion_reminders',
  },
  {
    up: migration_20261014_032729_event_requirements.up,
    down: migration_20261014_032729_event_requirements.down,
    name: '20261014_032729_event_requirements',
  },
  {
    up: migration_20261014_040817_tamil_nadu_copy.up,
    down: migration_20261014_040817_tamil_nadu_copy.down,
    name: '20261014_040817_tamil_nadu_copy',
  },
  {
    up: migration_20261014_124216_whatsapp_cloud.up,
    down: migration_20261014_124216_whatsapp_cloud.down,
    name: '20261014_124216_whatsapp_cloud',
  },
  {
    up: migration_20261022_172310_testimonials.up,
    down: migration_20261022_172310_testimonials.down,
    name: '20261022_172310_testimonials',
  },
  {
    up: migration_20261022_172311_google_reviews.up,
    down: migration_20261022_172311_google_reviews.down,
    name: '20261022_172311_google_reviews',
  },
  {
    up: migration_20261024_061243_runs_club.up,
    down: migration_20261024_061243_runs_club.down,
    name: '20261024_061243_runs_club'
  },
];
