import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Target, Activity, Edit3, Save, X } from 'lucide-react';

const Progression = () => {
    const [exercises, setExercises] = useState([]);
    const [selectedExercise, setSelectedExercise] = useState('');
    const [history, setHistory] = useState([]);
    const [exerciseDetails, setExerciseDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [timePeriod, setTimePeriod] = useState('all'); // 'month', 'year', 'all'
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [editForm, setEditForm] = useState({
        technique: '',
        muscle_image_url: '',
        execution_video_url: ''
    });

    useEffect(() => {
        const fetchExercises = async () => {
            try {
                const res = await axios.get(`/api/exercises?period=${timePeriod}`);
                setExercises(res.data);

                // If there are exercises and the currently selected one is not in the new list,
                // or if no exercise was selected yet, select the first one.
                if (res.data.length > 0) {
                    if (!res.data.includes(selectedExercise)) {
                        setSelectedExercise(res.data[0]);
                    }
                } else {
                    setSelectedExercise('');
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to fetch exercises", err);
                setLoading(false);
            }
        };
        fetchExercises();
    }, [timePeriod]);

    useEffect(() => {
        if (!selectedExercise) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/exercises/${encodeURIComponent(selectedExercise)}/history?period=${timePeriod}`);
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

        const fetchDetails = async () => {
            setDetailsLoading(true);
            try {
                const res = await axios.get(`/api/exercises/${encodeURIComponent(selectedExercise)}/details`);
                setExerciseDetails(res.data);
            } catch (err) {
                console.error("Failed to fetch exercise details", err);
            } finally {
                setDetailsLoading(false);
            }
        }

        fetchHistory();
        fetchDetails();
        setIsEditingDetails(false);
    }, [selectedExercise, timePeriod]);

    const handleEditClick = () => {
        setIsEditingDetails(true);
        setEditForm({
            technique: exerciseDetails?.technique?.join('\n') || '',
            muscle_image_url: exerciseDetails?.muscle_image_url || '',
            execution_video_url: exerciseDetails?.execution_video_url || ''
        });
    };

    const handleSaveDetails = async () => {
        try {
            const techniqueArray = editForm.technique.split('\n').map(s => s.trim()).filter(s => s.length > 0);
            await axios.post(`/api/exercises/${encodeURIComponent(selectedExercise)}/details`, {
                technique: techniqueArray,
                muscle_image_url: editForm.muscle_image_url,
                execution_video_url: editForm.execution_video_url
            });

            setExerciseDetails({
                ...exerciseDetails,
                technique: techniqueArray,
                muscle_image_url: editForm.muscle_image_url,
                execution_video_url: editForm.execution_video_url
            });
            setIsEditingDetails(false);
        } catch (err) {
            console.error("Save error:", err);
            alert("No se pudo guardar la información.");
        }
    };

    return (
        <div className="progression-page">
            <div className="page-header">
                <h2>Análisis de Progresión</h2>
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
                {exercises.length > 0 && (
                    <span className="exercise-count-badge">
                        {exercises.length} ejercicios
                    </span>
                )}
            </div>

            {loading ? (
                <div className="loading">Cargando datos...</div>
            ) : history.length === 0 ? (
                <div className="empty-state">No hay historial disponible para este ejercicio.</div>
            ) : (
                <div className="analysis-content">
                    {/* Last Session Info */}
                    {history.length > 0 && (
                        <div className="last-session-card">
                            <h3><Activity size={20} color="var(--primary)" /> Última Sesión</h3>
                            <div className="last-session-header">
                                <div className="session-info-item">
                                    <span className="label">Fecha</span>
                                    <span className="value">{history[history.length - 1].date}</span>
                                </div>
                                <div className="session-info-item">
                                    <span className="label">Entrenamiento</span>
                                    <span className="value">{history[history.length - 1].workoutTitle}</span>
                                </div>
                                <div className="session-info-item">
                                    <span className="label">Carpeta</span>
                                    <span className="value">{history[history.length - 1].routineTitle}</span>
                                </div>
                                <div className="session-info-item">
                                    <span className="label">E1RM</span>
                                    <span className="value">{history[history.length - 1].e1rm} kg</span>
                                </div>
                                <div className="session-info-item">
                                    <span className="label">Reps Totales</span>
                                    <span className="value">{history[history.length - 1].totalReps}</span>
                                </div>
                            </div>

                            <div className="sets-summary">
                                {history[history.length - 1].sets?.map((set, idx) => (
                                    <div key={idx} className="set-badge">
                                        <span className="set-number">S{idx + 1}</span>
                                        <span className="set-weight">{set.weight_kg} kg</span>
                                        <span className="set-reps">{set.reps} reps</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="chart-section">
                        <h3>Progresión de 1RM Estimado</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                                    <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'var(--text-main)' }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="e1rm"
                                        stroke="var(--chart-1)"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: 'var(--chart-1)' }}
                                        activeDot={{ r: 8, stroke: '#FFFFFF', strokeWidth: 2 }}
                                        name="1RM Estimado (kg)"
                                        connectNulls={true}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="chart-section">
                        <h3>Progresión de Volumen (Peso × Reps)</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                                    <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'var(--text-main)' }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="volume"
                                        stroke="var(--chart-2)"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: 'var(--chart-2)' }}
                                        activeDot={{ r: 8, stroke: '#FFFFFF', strokeWidth: 2 }}
                                        name="Volumen Total (kg)"
                                        connectNulls={true}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="chart-section">
                        <h3>Progresión de Repeticiones Totales</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                                    <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'var(--text-main)' }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="totalReps"
                                        stroke="var(--chart-3)"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: 'var(--chart-3)' }}
                                        activeDot={{ r: 8, stroke: '#FFFFFF', strokeWidth: 2 }}
                                        name="Repeticiones Totales"
                                        connectNulls={true}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="muscle-guide" style={{ marginTop: '30px' }}>
                        <div className="muscle-guide-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Técnica y Compromiso Muscular</h3>
                            {!detailsLoading && exerciseDetails && !isEditingDetails && (
                                <button className="edit-details-btn" onClick={handleEditClick}>
                                    <Edit3 size={16} /> Editar
                                </button>
                            )}
                        </div>
                        {detailsLoading ? (
                            <div className="loading">Cargando técnica...</div>
                        ) : exerciseDetails ? (
                            <div className="muscle-card">
                                {exerciseDetails.execution_video_url ? (
                                    <div className="exercise-media">
                                        <video
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            className="exercise-video"
                                            src={exerciseDetails.execution_video_url}
                                        />
                                    </div>
                                ) : (
                                    <Target size={40} className="muscle-icon" />
                                )}
                                {isEditingDetails ? (
                                    <div className="edit-details-form">
                                        <div className="form-group">
                                            <label>URL Vídeo/GIF Ejecución:</label>
                                            <input
                                                type="text"
                                                value={editForm.execution_video_url}
                                                onChange={(e) => setEditForm({ ...editForm, execution_video_url: e.target.value })}
                                                placeholder="https://ejemplo.com/ejercicio.mp4"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>URL Imagen Grupo Muscular:</label>
                                            <input
                                                type="text"
                                                value={editForm.muscle_image_url}
                                                onChange={(e) => setEditForm({ ...editForm, muscle_image_url: e.target.value })}
                                                placeholder="https://ejemplo.com/musculo.png"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Técnica (un paso por línea):</label>
                                            <textarea
                                                rows={6}
                                                value={editForm.technique}
                                                onChange={(e) => setEditForm({ ...editForm, technique: e.target.value })}
                                                placeholder="1. Paso uno\n2. Paso dos..."
                                            />
                                        </div>
                                        <div className="edit-actions">
                                            <button className="save-btn" onClick={handleSaveDetails}>
                                                <Save size={16} /> Guardar
                                            </button>
                                            <button className="cancel-btn" onClick={() => setIsEditingDetails(false)}>
                                                <X size={16} /> Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="muscle-info">
                                        <h4>{selectedExercise}</h4>

                                        <div className="technique-section">
                                            <h5>Técnica Paso a Paso:</h5>
                                            <ol className="technique-list">
                                                {exerciseDetails.technique.map((step, idx) => (
                                                    <li key={idx}>{step}</li>
                                                ))}
                                            </ol>
                                        </div>

                                        {exerciseDetails.muscle_image_url && (
                                            <div className="muscle-map-section">
                                                <h5>Compromiso Muscular:</h5>
                                                <img
                                                    src={exerciseDetails.muscle_image_url}
                                                    alt="Mapa Muscular"
                                                    className="muscle-map-img"
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state">No se pudo cargar la información técnica.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Progression;
