import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#bb86fc', '#cf6679', '#03dac6'];

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await axios.get('/api/analytics');
                setData(res.data);
            } catch (err) {
                console.error("Failed to load analytics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="loading">Cargando Análisis...</div>;

    if (!data) return <div className="empty-state">No hay datos disponibles.</div>;

    return (
        <div className="analytics-page">
            <h2>Análisis Detallado</h2>

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
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
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
                                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                                <Legend />
                                <Bar dataKey="value" name="Volumen (kg)" fill="var(--accent-color)" radius={[4, 4, 0, 0]} />
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
