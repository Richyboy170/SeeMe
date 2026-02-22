/**
 * Draft Service — persists multiple post drafts locally (Instagram-style)
 *
 * Storage strategy:
 * - AsyncStorage key `@seeme_post_drafts` stores a JSON array of draft metadata
 * - expo-file-system (Paths.document) for image files, prefixed with draft ID
 * - Max 20 drafts, 30-day auto-expiry (pruned on read)
 * - One-time migration from the legacy single-draft key `@seeme_post_draft`
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paths, File, Directory } from 'expo-file-system';

const DRAFTS_KEY = '@seeme_post_drafts';
const LEGACY_DRAFT_KEY = '@seeme_post_draft';
const DRAFT_DIR = 'drafts';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DRAFTS = 20;

type Visibility = 'friends_only' | 'topics_only' | 'topics_and_friends';

export interface PostDraft {
  id: string;
  imageUri: string;
  originalImageUri: string | null;
  caption: string;
  visibility: Visibility;
  selectedTopics: string[];
  createdAt: number; // Unix ms
}

interface StoredDraftMeta {
  id: string;
  imageFilename: string;
  originalImageFilename: string | null;
  caption: string;
  visibility: Visibility;
  selectedTopics: string[];
  createdAt: number;
}

// Legacy single-draft format (for migration)
interface LegacyStoredDraftMeta {
  imageFilename: string;
  originalImageFilename: string | null;
  caption: string;
  visibility: Visibility;
  selectedTopics: string[];
  createdAt: number;
}

/**
 * Generate a unique draft ID (timestamp + random suffix, no external deps).
 */
const generateDraftId = (): string => {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${ts}_${rand}`;
};

/**
 * Ensure the drafts directory exists and return the Directory instance.
 */
const ensureDraftsDir = (): Directory => {
  const dir = new Directory(Paths.document, DRAFT_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
};

/**
 * Copy a source image to the drafts directory with a draft-ID-prefixed filename.
 * Returns the persisted file URI.
 */
const copyImageToDrafts = (sourceUri: string, draftId: string, suffix: string): string => {
  const ext = sourceUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const filename = `${draftId}_${suffix}_${Date.now()}.${ext}`;
  const draftsDir = ensureDraftsDir();

  const sourceFile = new File(sourceUri);
  const destFile = new File(draftsDir, filename);

  sourceFile.copy(destFile);

  return destFile.uri;
};

/**
 * Delete a file silently (no error if missing).
 */
const deleteFileSilent = (uri: string): void => {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // File may already be gone — that's fine
  }
};

/**
 * Read raw draft metadata array from AsyncStorage.
 * Prunes expired drafts automatically. Runs legacy migration if needed.
 */
const readDraftMetas = async (): Promise<StoredDraftMeta[]> => {
  // One-time migration from legacy single-draft key
  await migrateLegacyDraft();

  const raw = await AsyncStorage.getItem(DRAFTS_KEY);
  if (!raw) return [];

  try {
    const metas: StoredDraftMeta[] = JSON.parse(raw);
    const now = Date.now();

    // Separate expired from valid
    const valid: StoredDraftMeta[] = [];
    const expired: StoredDraftMeta[] = [];

    for (const meta of metas) {
      if (now - meta.createdAt > THIRTY_DAYS_MS) {
        expired.push(meta);
      } else {
        valid.push(meta);
      }
    }

    // Clean up expired draft files in background
    if (expired.length > 0) {
      const draftsDir = ensureDraftsDir();
      for (const meta of expired) {
        deleteFileSilent(new File(draftsDir, meta.imageFilename).uri);
        if (meta.originalImageFilename) {
          deleteFileSilent(new File(draftsDir, meta.originalImageFilename).uri);
        }
      }
      // Persist the pruned list
      await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(valid));
    }

    return valid;
  } catch {
    return [];
  }
};

/**
 * Write draft metadata array to AsyncStorage.
 */
const writeDraftMetas = async (metas: StoredDraftMeta[]): Promise<void> => {
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(metas));
};

/**
 * One-time migration from the legacy single-draft `@seeme_post_draft` key.
 */
let migrationDone = false;
const migrateLegacyDraft = async (): Promise<void> => {
  if (migrationDone) return;
  migrationDone = true;

  try {
    const legacyRaw = await AsyncStorage.getItem(LEGACY_DRAFT_KEY);
    if (!legacyRaw) return;

    const legacy: LegacyStoredDraftMeta = JSON.parse(legacyRaw);

    // Skip if expired
    if (Date.now() - legacy.createdAt > THIRTY_DAYS_MS) {
      await AsyncStorage.removeItem(LEGACY_DRAFT_KEY);
      return;
    }

    // Convert to new format
    const id = generateDraftId();
    const newMeta: StoredDraftMeta = {
      id,
      imageFilename: legacy.imageFilename,
      originalImageFilename: legacy.originalImageFilename,
      caption: legacy.caption,
      visibility: legacy.visibility,
      selectedTopics: legacy.selectedTopics,
      createdAt: legacy.createdAt,
    };

    // Append to existing drafts (if any already migrated somehow)
    const existingRaw = await AsyncStorage.getItem(DRAFTS_KEY);
    const existing: StoredDraftMeta[] = existingRaw ? JSON.parse(existingRaw) : [];
    existing.push(newMeta);
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(existing));

    // Remove legacy key
    await AsyncStorage.removeItem(LEGACY_DRAFT_KEY);
  } catch (error) {
    console.error('[DraftService] migration error:', error);
  }
};

// ─── Public API ──────────────────────────────────────────────────

export const DRAFT_LIMIT = MAX_DRAFTS;

/**
 * Save a new draft. Returns the draft ID.
 * Throws `DRAFT_LIMIT_REACHED` if 20 drafts already exist.
 */
export const saveDraft = async (
  draft: Omit<PostDraft, 'id' | 'createdAt'>
): Promise<string> => {
  const metas = await readDraftMetas();

  if (metas.length >= MAX_DRAFTS) {
    const error = new Error('Draft limit reached');
    (error as any).code = 'DRAFT_LIMIT_REACHED';
    throw error;
  }

  const id = generateDraftId();

  // Copy images to persistent storage, prefixed with draft ID
  const imageUri = copyImageToDrafts(draft.imageUri, id, 'main');
  const imageFilename = imageUri.split('/').pop()!;

  let originalImageFilename: string | null = null;
  if (draft.originalImageUri) {
    const origUri = copyImageToDrafts(draft.originalImageUri, id, 'orig');
    originalImageFilename = origUri.split('/').pop()!;
  }

  const meta: StoredDraftMeta = {
    id,
    imageFilename,
    originalImageFilename,
    caption: draft.caption,
    visibility: draft.visibility,
    selectedTopics: draft.selectedTopics,
    createdAt: Date.now(),
  };

  metas.push(meta);
  await writeDraftMetas(metas);

  return id;
};

/**
 * Load a specific draft by ID. Returns null if not found or images missing.
 * Does NOT delete the draft — caller decides when to clean up.
 */
export const loadDraft = async (id: string): Promise<PostDraft | null> => {
  try {
    const metas = await readDraftMetas();
    const meta = metas.find(m => m.id === id);
    if (!meta) return null;

    const draftsDir = ensureDraftsDir();
    const imageFile = new File(draftsDir, meta.imageFilename);

    if (!imageFile.exists) {
      // Image missing — clean up this draft
      await deleteDraft(id);
      return null;
    }

    let originalImageUri: string | null = null;
    if (meta.originalImageFilename) {
      const origFile = new File(draftsDir, meta.originalImageFilename);
      if (origFile.exists) {
        originalImageUri = origFile.uri;
      }
    }

    return {
      id: meta.id,
      imageUri: imageFile.uri,
      originalImageUri,
      caption: meta.caption,
      visibility: meta.visibility,
      selectedTopics: meta.selectedTopics,
      createdAt: meta.createdAt,
    };
  } catch (error) {
    console.error('[DraftService] loadDraft error:', error);
    return null;
  }
};

/**
 * Load all non-expired drafts (most recent first).
 */
export const loadAllDrafts = async (): Promise<PostDraft[]> => {
  try {
    const metas = await readDraftMetas();
    const draftsDir = ensureDraftsDir();
    const result: PostDraft[] = [];

    for (const meta of metas) {
      const imageFile = new File(draftsDir, meta.imageFilename);
      if (!imageFile.exists) continue;

      let originalImageUri: string | null = null;
      if (meta.originalImageFilename) {
        const origFile = new File(draftsDir, meta.originalImageFilename);
        if (origFile.exists) {
          originalImageUri = origFile.uri;
        }
      }

      result.push({
        id: meta.id,
        imageUri: imageFile.uri,
        originalImageUri,
        caption: meta.caption,
        visibility: meta.visibility,
        selectedTopics: meta.selectedTopics,
        createdAt: meta.createdAt,
      });
    }

    // Most recent first
    result.sort((a, b) => b.createdAt - a.createdAt);
    return result;
  } catch (error) {
    console.error('[DraftService] loadAllDrafts error:', error);
    return [];
  }
};

/**
 * Get the number of saved (non-expired) drafts.
 */
export const getDraftCount = async (): Promise<number> => {
  const metas = await readDraftMetas();
  return metas.length;
};

/**
 * Delete a specific draft by ID (metadata + image files).
 */
export const deleteDraft = async (id: string): Promise<void> => {
  try {
    const metas = await readDraftMetas();
    const meta = metas.find(m => m.id === id);

    if (meta) {
      const draftsDir = ensureDraftsDir();
      deleteFileSilent(new File(draftsDir, meta.imageFilename).uri);
      if (meta.originalImageFilename) {
        deleteFileSilent(new File(draftsDir, meta.originalImageFilename).uri);
      }
    }

    const remaining = metas.filter(m => m.id !== id);
    await writeDraftMetas(remaining);
  } catch (error) {
    console.error('[DraftService] deleteDraft error:', error);
  }
};

/**
 * Delete all drafts (metadata + all image files).
 */
export const deleteAllDrafts = async (): Promise<void> => {
  try {
    const metas = await readDraftMetas();
    const draftsDir = ensureDraftsDir();

    for (const meta of metas) {
      deleteFileSilent(new File(draftsDir, meta.imageFilename).uri);
      if (meta.originalImageFilename) {
        deleteFileSilent(new File(draftsDir, meta.originalImageFilename).uri);
      }
    }

    await AsyncStorage.removeItem(DRAFTS_KEY);
  } catch (error) {
    console.error('[DraftService] deleteAllDrafts error:', error);
    try { await AsyncStorage.removeItem(DRAFTS_KEY); } catch {}
  }
};

/**
 * Remove only the draft metadata for a specific draft (keep image files).
 * Use when loading a draft into compose state — images are still needed.
 */
export const clearDraftMeta = async (id: string): Promise<void> => {
  const metas = await readDraftMetas();
  const remaining = metas.filter(m => m.id !== id);
  await writeDraftMetas(remaining);
};

/**
 * Quick boolean check: do any non-expired drafts exist?
 */
export const hasDrafts = async (): Promise<boolean> => {
  const count = await getDraftCount();
  return count > 0;
};
