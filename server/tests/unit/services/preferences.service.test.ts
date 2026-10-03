import { describe, it, expect, beforeEach } from 'vitest';
import * as preferencesService from '../../../src/services/preferences.service.js';
import * as authService from '../../../src/services/auth.service.js';
import { PREDEFINED_TOPICS } from '../../../src/config/feeds.js';

const VALID_USER = { name: 'Pref User', email: 'prefs@example.com', password: 'Password123' };

describe('preferences.service', () => {
  let userId: string;

  beforeEach(async () => {
    // Create a fresh user before each test
    const { user } = await authService.register(VALID_USER);
    userId = user.id as string;
  });

  // ── Get Preferences ─────────────────────────────────────────────────────────

  it('UT-PREFS-01: returns default preferences and available topics', async () => {
    const result = await preferencesService.getPreferences(userId);

    expect(result.preferences).toBeDefined();
    expect(result.preferences.frequency).toBe('daily');
    expect(result.preferences.alertThreshold).toBe('high');
    expect(result.availableTopics).toEqual(PREDEFINED_TOPICS);
    expect(result.availableTopics.length).toBeGreaterThan(0);
  });

  // ── Update Preferences ──────────────────────────────────────────────────────

  it('UT-PREFS-02: updates topics and frequency', async () => {
    const user = await preferencesService.updatePreferences(userId, {
      topics: ['AI', 'Crypto'],
      frequency: 'realtime',
    });

    expect(user.preferences.topics).toEqual(['AI', 'Crypto']);
    expect(user.preferences.frequency).toBe('realtime');
    // alertThreshold should remain unchanged (default)
    expect(user.preferences.alertThreshold).toBe('high');
  });

  it('UT-PREFS-03: partial update only changes provided fields', async () => {
    // First set some preferences
    await preferencesService.updatePreferences(userId, {
      topics: ['Tech'],
      frequency: 'weekly',
      alertThreshold: 'critical',
    });

    // Now only update alertThreshold
    const user = await preferencesService.updatePreferences(userId, {
      alertThreshold: 'all',
    });

    expect(user.preferences.topics).toEqual(['Tech']);
    expect(user.preferences.frequency).toBe('weekly');
    expect(user.preferences.alertThreshold).toBe('all');
  });

  it('UT-PREFS-04: deduplicates topics on update', async () => {
    const user = await preferencesService.updatePreferences(userId, {
      topics: ['AI', 'AI', 'Crypto', 'AI'],
    });

    expect(user.preferences.topics).toEqual(['AI', 'Crypto']);
  });

  // ── Add / Remove Topic ──────────────────────────────────────────────────────

  it('UT-PREFS-05: addTopic adds a topic idempotently', async () => {
    await preferencesService.addTopic(userId, 'Science');
    const user = await preferencesService.addTopic(userId, 'Science'); // duplicate

    expect(user.preferences.topics.filter((t) => t === 'Science')).toHaveLength(1);
  });

  it('UT-PREFS-06: removeTopic removes the specified topic', async () => {
    await preferencesService.updatePreferences(userId, { topics: ['AI', 'Crypto', 'Tech'] });
    const user = await preferencesService.removeTopic(userId, 'Crypto');

    expect(user.preferences.topics).not.toContain('Crypto');
    expect(user.preferences.topics).toContain('AI');
    expect(user.preferences.topics).toContain('Tech');
  });

  it('UT-PREFS-07: removeTopic on non-existent topic is a no-op', async () => {
    await preferencesService.updatePreferences(userId, { topics: ['AI'] });
    const user = await preferencesService.removeTopic(userId, 'NonExistent');

    expect(user.preferences.topics).toEqual(['AI']);
  });
});
