import * as migration_20260920_152319_initial from './20260920_152319_initial';
import * as migration_20260924_081959_vendor_service_details from './20260924_081959_vendor_service_details';

export const migrations = [
  {
    up: migration_20260920_152319_initial.up,
    down: migration_20260920_152319_initial.down,
    name: '20260920_152319_initial',
  },
  {
    up: migration_20260924_081959_vendor_service_details.up,
    down: migration_20260924_081959_vendor_service_details.down,
    name: '20260924_081959_vendor_service_details'
  },
];
