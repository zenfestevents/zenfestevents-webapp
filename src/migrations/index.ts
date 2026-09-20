import * as migration_20260920_152319_initial from './20260920_152319_initial';

export const migrations = [
  {
    up: migration_20260920_152319_initial.up,
    down: migration_20260920_152319_initial.down,
    name: '20260920_152319_initial'
  },
];
