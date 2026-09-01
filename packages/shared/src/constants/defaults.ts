export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const;

export const ROOM_LIMITS = {
  MIN_CAPACITY: 2,
  MAX_CAPACITY: 500,
  DEFAULT_CAPACITY: 100,
} as const;
