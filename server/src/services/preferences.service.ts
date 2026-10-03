import { User } from '../models/index.js';
import type { IUser, IUserPreferences } from '../models/index.js';
import { NotFoundError } from '../utils/errors.js';
import type { UpdatePreferencesInput } from '../validators/preferences.schema.js';
import { PREDEFINED_TOPICS } from '../config/feeds.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreferencesResult {
  preferences: IUserPreferences;
  availableTopics: string[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Get the preferences for a user.
 * Also returns the full list of available topics for the UI to display.
 */
export async function getPreferences(userId: string): Promise<PreferencesResult> {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');

  return {
    preferences: user.preferences,
    availableTopics: PREDEFINED_TOPICS,
  };
}

/**
 * Update a user's topic preferences (partial update — PATCH semantics).
 * Only the provided fields are changed; omitted fields keep their current values.
 */
export async function updatePreferences(
  userId: string,
  input: UpdatePreferencesInput,
): Promise<IUser> {
  // Build a $set object with only the provided fields
  const updates: Record<string, unknown> = {};

  if (input.topics !== undefined) {
    // Normalise: trim whitespace, remove duplicates, cap at 20
    const cleaned = [...new Set(input.topics.map((t) => t.trim()).filter(Boolean))].slice(0, 20);
    updates['preferences.topics'] = cleaned;
  }

  if (input.frequency !== undefined) {
    updates['preferences.frequency'] = input.frequency;
  }

  if (input.alertThreshold !== undefined) {
    updates['preferences.alertThreshold'] = input.alertThreshold;
  }

  if (input.timezone !== undefined) {
    updates['preferences.timezone'] = input.timezone;
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true },
  );

  if (!user) throw new NotFoundError('User');
  return user;
}

/**
 * Add a single topic to the user's preferences (idempotent).
 */
export async function addTopic(userId: string, topic: string): Promise<IUser> {
  const trimmed = topic.trim();
  if (!trimmed) throw new Error('Topic cannot be empty');

  const user = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { 'preferences.topics': trimmed } },
    { new: true },
  );

  if (!user) throw new NotFoundError('User');
  return user;
}

/**
 * Remove a single topic from the user's preferences.
 */
export async function removeTopic(userId: string, topic: string): Promise<IUser> {
  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { 'preferences.topics': topic } },
    { new: true },
  );

  if (!user) throw new NotFoundError('User');
  return user;
}

// Export the predefined topic list for use in other modules
export { PREDEFINED_TOPICS };
