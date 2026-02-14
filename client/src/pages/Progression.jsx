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
            <h2>Progression Analysis</h2>

            <div className="controls">
                <label>Select Exercise:</label>
                <select
                    value={selectedExercise}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    disabled={exercises.length === 0}
                >
                    {exercises.length === 0 && <option>No exercises found</option>}
                    {exercises.map(ex => (
                        <option key={ex} value={ex}>{ex}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="loading">Loading data...</div>
            ) : history.length === 0 ? (
                <div className="empty-state">No history available for this exercise.</div>
            ) : (
                <div className="analysis-content">
                    <div className="chart-section">
                        <h3>1RM / Max Weight Progression</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="date" stroke="#888" />
                                    <YAxis stroke="#888" />
                                    <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="maxWeight" stroke="#03dac6" strokeWidth={2} activeDot={{ r: 6 }} name="Max Weight (kg)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="chart-section">
                        <h3>Volume Progression</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="date" stroke="#888" />
                                    <YAxis stroke="#888" />
                                    <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="volume" stroke="#bb86fc" strokeWidth={2} name="Total Volume (kg)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="muscle-guide" style={{ marginTop: '30px' }}>
                        <h3>Form & Muscle Engagement</h3>
                        <div className="muscle-card">
                            <Target size={40} className="muscle-icon" />
                            <div className="muscle-info">
                                <h4>{selectedExercise}</h4>
                                <p>To perform this exercise correctly, maintain a stable core and controlled movement. Focus on the target muscle group.</p>
                                {/* Placeholder for real muscle map */}
                                <div className="muscle-map-placeholder">
                                    [Muscle Map Visualization Placeholder]
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
