import path from "node:path";

export const PROJECT_ROOT = path.resolve(__dirname, "../../..");

/** Scratch directory for the throwaway databases. Removed on global teardown. */
export const TMP_DIR = path.join(PROJECT_ROOT, ".tmp");

/**
 * Migrated but empty database. Every test file copies it instead of running
 * `prisma migrate deploy` again, which would cost a process spawn per file.
 */
export const TEMPLATE_DB = path.join(TMP_DIR, "template.db");

/** SQLite leaves these next to the database depending on the journal mode. */
export const sidecarFiles = (dbPath: string) => [
    `${dbPath}-journal`,
    `${dbPath}-wal`,
    `${dbPath}-shm`,
];
