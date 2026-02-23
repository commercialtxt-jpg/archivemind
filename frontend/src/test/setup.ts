import '@testing-library/jest-dom';

// Silence console.warn in tests (e.g. mock fallback warnings)
vi.spyOn(console, 'warn').mockImplementation(() => {});

// Mock IndexedDB — idb will fail in jsdom without this
// We use a minimal stub so tests don't actually open an IDB connection.
vi.mock('../lib/offlineDb', () => ({
  cacheNotes: vi.fn().mockResolvedValue(undefined),
  getCachedNotes: vi.fn().mockResolvedValue([]),
  getCachedNote: vi.fn().mockResolvedValue(undefined),
  removeCachedNote: vi.fn().mockResolvedValue(undefined),
  cacheEntities: vi.fn().mockResolvedValue(undefined),
  getCachedEntities: vi.fn().mockResolvedValue([]),
  enqueuePendingChange: vi.fn().mockResolvedValue(undefined),
  getPendingChanges: vi.fn().mockResolvedValue([]),
  removePendingChange: vi.fn().mockResolvedValue(undefined),
  clearPendingChanges: vi.fn().mockResolvedValue(undefined),
  countPendingChanges: vi.fn().mockResolvedValue(0),
}));
