import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Target } from 'lucide-react';

const Progression = () => {
    const [exercises, setExercises] = useState([]);
    const [selectedExercise, setSelectedExercise] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExercises = async () => {
            try {
                const res = await axios.get('/api/exercises');
                setExercises(res.data);
                if (res.data.length > 0) {
                    setSelectedExercise(res.data[0]);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to fetch exercises", err);
                setLoading(false);
            }
        };
        fetchExercises();
    }, []);

    useEffect(() => {
        if (!selectedExercise) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/exercises/${encodeURIComponent(selectedExercise)}/history`);
                setHistory(res.data.map(h => ({
                    ...h,
                    date: new Date(h.date).toLocaleDateString()
                })));
            } catch (err) {
                console.error("Failed to fetch history", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [selectedExercise]);

    return (
        <div className="progression-page">
            <h2>Análisis de Progresión</h2>

            <div className="controls">
                <label>Seleccionar Ejercicio:</label>
                <select
                    value={selectedExercise}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    disabled={exercises.length === 0}
                >
                    {exercises.length === 0 && <option>No se encontraron ejercicios</option>}
                    {exercises.map(ex => (
                        <option key={ex} value={ex}>{ex}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="loading">Cargando datos...</div>
            ) : history.length === 0 ? (
                <div className="empty-state">No hay historial disponible para este ejercicio.</div>
            ) : (
                <div className="analysis-content">
                    <div className="chart-section">
                        <h3>Progresión de 1RM / Peso Máximo</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis dataKey="date" stroke="var(--text-secondary)" />
                                    <YAxis stroke="var(--text-secondary)" />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="maxWeight" stroke="var(--accent-color)" strokeWidth={2} activeDot={{ r: 6 }} name="Peso Máximo (kg)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="chart-section">
                        <h3>Progresión de Volumen</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis dataKey="date" stroke="var(--text-secondary)" />
                                    <YAxis stroke="var(--text-secondary)" />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={2} name="Volumen Total (kg)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="muscle-guide" style={{ marginTop: '30px' }}>
                        <h3>Técnica y Compromiso Muscular</h3>
                        <div className="muscle-card">
                            <Target size={40} className="muscle-icon" />
                            <div className="muscle-info">
                                <h4>{selectedExercise}</h4>
                                <p>Para realizar este ejercicio correctamente, mantén el núcleo estable y un movimiento controlado. Concéntrate en el grupo muscular objetivo.</p>
                                {/* Placeholder for real muscle map */}
                                <div className="muscle-map-placeholder">
                                    [Visualización del Mapa Muscular]
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Progression;
