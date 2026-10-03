import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import api from '../lib/api';

const ALL_TOPICS = [
  'AI', 'Crypto', 'Finance', 'Tech', 'Science', 'Health',
  'Politics', 'Business', 'Sports', 'Entertainment', 'Climate', 'Space',
];

const FREQUENCIES = [
  { value: 'realtime', label: 'Real-time', desc: 'As it happens' },
  { value: 'daily', label: 'Daily', desc: 'Morning briefing' },
  { value: 'weekly', label: 'Weekly', desc: 'Weekend digest' },
];

export default function PreferencesPage() {
  const { user, fetchMe } = useAuthStore();
  const [selectedTopics, setSelectedTopics] = useState<string[]>(user?.preferences.topics ?? []);
  const [frequency, setFrequency] = useState(user?.preferences.frequency ?? 'daily');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedTopics(user.preferences.topics);
      setFrequency(user.preferences.frequency);
    }
  }, [user]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  };

  const handleSave = async () => {
    if (selectedTopics.length === 0) return;
    setSaving(true);
    try {
      await api.put('/preferences', { topics: selectedTopics, frequency });
      await fetchMe();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Preferences</h1>
      <p className="text-gray-400 mb-8">Customize your news feed and briefing schedule.</p>

      {/* Topics */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-1">Topics</h2>
        <p className="text-sm text-gray-500 mb-4">Select the topics you care about ({selectedTopics.length} selected)</p>
        <div className="flex flex-wrap gap-2">
          {ALL_TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => toggleTopic(topic)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedTopics.includes(topic)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </section>

      {/* Frequency */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Briefing Frequency</h2>
        <div className="grid grid-cols-3 gap-3">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              onClick={() => setFrequency(f.value)}
              className={`p-4 rounded-xl border text-left transition ${
                frequency === f.value
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-600'
              }`}
            >
              <p className="font-medium text-white text-sm">{f.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={() => void handleSave()}
        disabled={saving || selectedTopics.length === 0}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition"
      >
        {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save preferences'}
      </button>
      {selectedTopics.length === 0 && (
        <p className="text-red-400 text-sm text-center mt-2">Select at least one topic</p>
      )}
    </div>
  );
}
