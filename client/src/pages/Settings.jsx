import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';

const Settings = () => {
    const [formData, setFormData] = useState({
        hevy_api_key: '',
        openai_api_key: '',
        age: '',
        gender: 'male',
        weight: '',
        goal: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            if (res.data) {
                setFormData({
                    hevy_api_key: res.data.hevy_api_key || '',
                    openai_api_key: res.data.openai_api_key || '',
                    age: res.data.age || '',
                    gender: res.data.gender || 'male',
                    weight: res.data.weight || '',
                    goal: res.data.goal || ''
                });
            }
        } catch (err) {
            console.error('Failed to load settings', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            await axios.post('/api/settings', formData);
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="settings-page">
            <h2>App Settings</h2>

            {message && (
                <div className={`message ${message.type}`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="settings-form">
                <section className="settings-section">
                    <h3>API Integrations</h3>
                    <div className="form-group">
                        <label>Hevy API Key</label>
                        <input
                            type="password"
                            name="hevy_api_key"
                            value={formData.hevy_api_key}
                            onChange={handleChange}
                            placeholder="Start with 'hv_...'"
                        />
                        <small>Required to fetch your workouts.</small>
                    </div>
                    <div className="form-group">
                        <label>OpenAI/Gemini API Key</label>
                        <input
                            type="password"
                            name="openai_api_key"
                            value={formData.openai_api_key}
                            onChange={handleChange}
                            placeholder="sk-..."
                        />
                        <small>Required for Coach AI.</small>
                    </div>
                </section>

                <section className="settings-section">
                    <h3>Personal Stats</h3>
                    <div className="row">
                        <div className="form-group">
                            <label>Age</label>
                            <input type="number" name="age" value={formData.age} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleChange}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Weight (kg)</label>
                            <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Goal</label>
                        <textarea
                            name="goal"
                            value={formData.goal}
                            onChange={handleChange}
                            rows="3"
                            placeholder="e.g. Increase bench press to 100kg, lose 5kg body fat..."
                        />
                    </div>
                </section>

                <button type="submit" className="save-btn" disabled={saving}>
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </form>
        </div>
    );
};

export default Settings;
