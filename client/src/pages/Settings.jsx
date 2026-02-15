import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, CheckCircle, AlertCircle, Moon, Sun } from 'lucide-react';

const Settings = () => {
    const [formData, setFormData] = useState({
        hevy_api_key: '',
        openai_api_key: '',
        age: '',
        gender: 'male',
        height: '',
        goal: ''
    });
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'dark';
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchSettings();
        // Apply theme on mount
        document.body.setAttribute('data-theme', theme);
    }, []);

    useEffect(() => {
        // Update theme when it changes
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            if (res.data) {
                setFormData({
                    hevy_api_key: res.data.hevy_api_key || '',
                    openai_api_key: res.data.openai_api_key || '',
                    age: res.data.age || '',
                    gender: res.data.gender || 'male',
                    height: res.data.height || '',
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

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="settings-page">
            <h2>Ajustes de la Aplicación</h2>

            {message && (
                <div className={`message ${message.type}`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="settings-form">
                <section className="settings-section">
                    <h3>Apariencia</h3>
                    <div className="form-group">
                        <label>Tema de la Aplicación</label>
                        <div className="theme-toggle">
                            <button
                                type="button"
                                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                                onClick={() => setTheme('dark')}
                            >
                                <Moon size={18} />
                                Oscuro
                            </button>
                            <button
                                type="button"
                                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                                onClick={() => setTheme('light')}
                            >
                                <Sun size={18} />
                                Claro
                            </button>
                        </div>
                        <small>Cambia entre tema oscuro y claro para mejor legibilidad.</small>
                    </div>
                </section>

                <section className="settings-section">
                    <h3>Integraciones API</h3>
                    <div className="form-group">
                        <label>Hevy API Key</label>
                        <input
                            type="password"
                            name="hevy_api_key"
                            value={formData.hevy_api_key}
                            onChange={handleChange}
                            placeholder="Empieza por 'hv_...'"
                        />
                        <small>Necesaria para obtener tus entrenamientos.</small>
                    </div>
                    <div className="form-group">
                        <label>AI API Key (Gemini, OpenAI, Grok)</label>
                        <input
                            type="password"
                            name="openai_api_key"
                            value={formData.openai_api_key}
                            onChange={handleChange}
                            placeholder="Introduce tu clave..."
                        />
                        <small>Auto-detecta automáticamente el proveedor (Gemini, ChatGPT o Grok).</small>
                    </div>
                </section>

                <section className="settings-section">
                    <h3>Datos Personales</h3>
                    <div className="row">
                        <div className="form-group">
                            <label>Edad</label>
                            <input type="number" name="age" value={formData.age} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Género</label>
                            <select name="gender" value={formData.gender} onChange={handleChange}>
                                <option value="male">Masculino</option>
                                <option value="female">Femenino</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Altura (cm)</label>
                            <input type="number" step="0.1" name="height" value={formData.height} onChange={handleChange} placeholder="cm" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Objetivo</label>
                        <textarea
                            name="goal"
                            value={formData.goal}
                            onChange={handleChange}
                            rows="3"
                            placeholder="ej. Aumentar press de banca a 100kg, perder 5kg de grasa corporal..."
                        />
                    </div>
                </section>

                <button type="submit" className="save-btn" disabled={saving}>
                    <Save size={18} />
                    {saving ? 'Guardando...' : 'Guardar Ajustes'}
                </button>
            </form>
        </div>
    );
};

export default Settings;
