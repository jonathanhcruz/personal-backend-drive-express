import multer from 'multer';

// Files are buffered in memory and written to disk by StorageAdapter (Phase 7)
export const upload = multer({ storage: multer.memoryStorage() });
