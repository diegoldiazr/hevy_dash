import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Save, History, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const Measurements = () => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        weight: '',
        chest: '',
        neck: '',
        waist: '',
        hips: ''
    });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/measurements');
            setHistory(res.data);
        } catch (err) {
            console.error("Failed to fetch measurements", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/measurements', formData);
            fetchHistory();
            // Optional: reset form or show success
        } catch (err) {
            console.error("Failed to save measurements", err);
        }
    };

    const getTrend = (data, key) => {
        if (data.length < 2) return <Minus size={16} />;
        const last = data[data.length - 1][key];
        const prev = data[data.length - 2][key];
        if (last > prev) return <TrendingUp size={16} className="trend-up" />;
        if (last < prev) return <TrendingDown size={16} className="trend-down" />;
        return <Minus size={16} />;
    };

    const renderChart = (title, dataKey, color, unit) => (
        <div className="measurement-chart-card">
            <div className="chart-header">
                <h3>{title} ({unit})</h3>
                <span className="trend-indicator">
                    {getTrend(history, dataKey)}
                </span>
            </div>
            <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                            itemStyle={{ color: 'var(--text-main)' }}
                        />
                        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="measurement-table-mini">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.slice(-5).reverse().map((row, i) => (
                            <tr key={i}>
                                <td>{row.date}</td>
                                <td>{row[dataKey]} {unit}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="measurements-page">
            <div className="measurements-header">
                <h2>Registro de Medidas Corporales</h2>
                <p>Realiza un seguimiento de tu progreso físico más allá de la báscula.</p>
            </div>

            <form className="measurement-form glass-panel" onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="input-group">
                        <label>Fecha</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                        <label>Peso (kg)</label>
                        <input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} placeholder="0.0" />
                    </div>
                    <div className="input-group">
                        <label>Pecho (cm)</label>
                        <input type="number" step="0.1" name="chest" value={formData.chest} onChange={handleChange} placeholder="0.0" />
                    </div>
                    <div className="input-group">
                        <label>Cuello (cm)</label>
                        <input type="number" step="0.1" name="neck" value={formData.neck} onChange={handleChange} placeholder="0.0" />
                    </div>
                    <div className="input-group">
                        <label>Cintura (cm)</label>
                        <input type="number" step="0.1" name="waist" value={formData.waist} onChange={handleChange} placeholder="0.0" />
                    </div>
                    <div className="input-group">
                        <label>Cadera (cm)</label>
                        <input type="number" step="0.1" name="hips" value={formData.hips} onChange={handleChange} placeholder="0.0" />
                    </div>
                </div>
                <button type="submit" className="save-btn">
                    <Save size={18} /> Guardar Registro
                </button>
            </form>

            <div className="measurements-grid">
                {renderChart("Peso", "weight", "#5865f2", "kg")}
                {renderChart("Pecho", "chest", "#10b981", "cm")}
                {renderChart("Cuello", "neck", "#f59e0b", "cm")}
                {renderChart("Cintura", "waist", "#ef4444", "cm")}
                {renderChart("Caderas", "hips", "#8b5cf6", "cm")}
            </div>
        </div>
    );
};

export default Measurements;
