import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
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
    const [selectedTopics, setSelectedTopics] = useState(user?.preferences.topics ?? []);
    const [frequency, setFrequency] = useState(user?.preferences.frequency ?? 'daily');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    useEffect(() => {
        if (user) {
            setSelectedTopics(user.preferences.topics);
            setFrequency(user.preferences.frequency);
        }
    }, [user]);
    const toggleTopic = (topic) => {
        setSelectedTopics((prev) => prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]);
    };
    const handleSave = async () => {
        if (selectedTopics.length === 0)
            return;
        setSaving(true);
        try {
            await api.put('/preferences', { topics: selectedTopics, frequency });
            await fetchMe();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "max-w-2xl mx-auto px-4 py-8", children: [_jsx("h1", { className: "text-2xl font-bold text-white mb-2", children: "Preferences" }), _jsx("p", { className: "text-gray-400 mb-8", children: "Customize your news feed and briefing schedule." }), _jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-lg font-semibold text-white mb-1", children: "Topics" }), _jsxs("p", { className: "text-sm text-gray-500 mb-4", children: ["Select the topics you care about (", selectedTopics.length, " selected)"] }), _jsx("div", { className: "flex flex-wrap gap-2", children: ALL_TOPICS.map((topic) => (_jsx("button", { onClick: () => toggleTopic(topic), className: `px-4 py-2 rounded-full text-sm font-medium transition ${selectedTopics.includes(topic)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`, children: topic }, topic))) })] }), _jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-lg font-semibold text-white mb-4", children: "Briefing Frequency" }), _jsx("div", { className: "grid grid-cols-3 gap-3", children: FREQUENCIES.map((f) => (_jsxs("button", { onClick: () => setFrequency(f.value), className: `p-4 rounded-xl border text-left transition ${frequency === f.value
                                ? 'border-blue-500 bg-blue-900/20'
                                : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`, children: [_jsx("p", { className: "font-medium text-white text-sm", children: f.label }), _jsx("p", { className: "text-xs text-gray-500 mt-0.5", children: f.desc })] }, f.value))) })] }), _jsx("button", { onClick: () => void handleSave(), disabled: saving || selectedTopics.length === 0, className: "w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition", children: saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save preferences' }), selectedTopics.length === 0 && (_jsx("p", { className: "text-red-400 text-sm text-center mt-2", children: "Select at least one topic" }))] }));
}
