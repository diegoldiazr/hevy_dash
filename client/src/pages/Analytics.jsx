import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timePeriod, setTimePeriod] = useState('all'); // 'month', 'year', 'all'

    useEffect(() => {
        fetchAnalytics();
    }, [timePeriod]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/analytics?period=${timePeriod}`);
            setData(res.data);
        } catch (err) {
            console.error("Failed to load analytics", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Cargando Análisis...</div>;

    if (!data) return <div className="empty-state">No hay datos disponibles.</div>;

    // Define chart colors using CSS variables
    const CHART_COLORS = [
        'var(--chart-1)',
        'var(--chart-2)',
        'var(--chart-3)',
        'var(--chart-4)',
        'var(--chart-5)',
        'var(--chart-6)',
        'var(--chart-7)'
    ];

    return (
        <div className="analytics-page">
            <div className="page-header">
                <h2>Análisis Detallado</h2>
                <div className="time-period-toggle">
                    <button
                        className={`period-btn ${timePeriod === 'month' ? 'active' : ''}`}
                        onClick={() => setTimePeriod('month')}
                    >
                        Mes
                    </button>
                    <button
                        className={`period-btn ${timePeriod === 'year' ? 'active' : ''}`}
                        onClick={() => setTimePeriod('year')}
                    >
                        Año
                    </button>
                    <button
                        className={`period-btn ${timePeriod === 'all' ? 'active' : ''}`}
                        onClick={() => setTimePeriod('all')}
                    >
                        Todos
                    </button>
                </div>
            </div>

            <div className="analytics-grid">
                <div className="chart-card">
                    <h3>Distribución por Grupo Muscular (Series)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={data.muscleSplit}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label
                                >
                                    {data.muscleSplit.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <h3>Tendencia de Volumen Semanal</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={data.weeklyVolume}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" />
                                <YAxis stroke="var(--text-muted)" />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }} />
                                <Legend />
                                <Bar dataKey="value" name="Volumen (kg)" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="insight-section">
                <h3>Sugerencias del Entrenador</h3>
                <p>
                    Basado en tu distribución, pareces favorecer los ejercicios de {data.muscleSplit.length > 0 ? data.muscleSplit.sort((a, b) => b.value - a.value)[0].name : '...'}.
                    Considera equilibrar con más grupos musculares opuestos para prevenir lesiones.
                </p>
            </div>
        </div>
    );
};

export default Analytics;
