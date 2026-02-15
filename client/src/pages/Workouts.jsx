import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Calendar, Dumbbell, Clock, ChevronRight, X } from 'lucide-react';

const Workouts = () => {
    const [workouts, setWorkouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [page, setPage] = useState(1);
    const [error, setError] = useState(null);
    const [selectedWorkout, setSelectedWorkout] = useState(null);

    useEffect(() => {
        fetchWorkouts();
    }, [page]);

    const fetchWorkouts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/workouts?page=${page}`);
            setWorkouts(res.data);
            setError(null);
        } catch (err) {
            setError('Error al cargar los entrenamientos');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await axios.post('/api/hevy/sync?fullSync=true');
            setPage(1);
            fetchWorkouts();
        } catch (err) {
            console.error("Sync failed", err);
            setError('Sincronización fallida. Revisa la API Key en Ajustes.');
        } finally {
            setSyncing(false);
        }
    };

    const formatDuration = (start, end) => {
        if (!start || !end) return 'N/A';
        const s = new Date(start);
        const e = new Date(end);
        const diffMs = e - s;
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    return (
        <div className="workouts-page">
            <div className="header">
                <h2>Entrenamientos</h2>
                <button
                    className={`sync-btn ${syncing ? 'spinning' : ''}`}
                    onClick={handleSync}
                    disabled={syncing}
                >
                    <RefreshCw size={18} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar Hevy'}
                </button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className={`workouts-container ${selectedWorkout ? 'has-selection' : ''}`}>
                <div className="workouts-list-section">
                    {loading && workouts.length === 0 ? (
                        <div className="loading">Cargando...</div>
                    ) : (
                        <div className="workouts-list">
                            {workouts.length === 0 ? (
                                <div className="empty-state">No hay entrenamientos.</div>
                            ) : (
                                workouts.map(workout => (
                                    <div
                                        key={workout.id}
                                        className={`workout-card ${selectedWorkout?.id === workout.id ? 'active' : ''}`}
                                        onClick={() => setSelectedWorkout(workout)}
                                    >
                                        <div className="workout-card-main">
                                            <div className="workout-header">
                                                <h3>{workout.title}</h3>
                                                <span className="workout-date">
                                                    <Calendar size={14} />
                                                    {new Date(workout.start_time).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="workout-stats-summary">
                                                <span>{workout.volume_kg} kg</span>
                                                <span className="dot"></span>
                                                <span>{formatDuration(workout.start_time, workout.end_time)}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className="arrow" />
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    <div className="pagination">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                        <span>Página {page}</span>
                        <button onClick={() => setPage(p => p + 1)}>Siguiente</button>
                    </div>
                </div>

                {selectedWorkout && (
                    <div className="workout-detail-section">
                        <div className="detail-header">
                            <button className="close-btn" onClick={() => setSelectedWorkout(null)}>
                                <X size={24} />
                            </button>
                            <h2>Detalles del Entrenamiento</h2>
                        </div>

                        <div className="detail-content">
                            <div className="detail-top-info">
                                <h1>{selectedWorkout.title}</h1>
                                <div className="detail-meta">
                                    <div className="meta-item">
                                        <Calendar size={18} />
                                        <span>{new Date(selectedWorkout.start_time).toLocaleString()}</span>
                                    </div>
                                    <div className="meta-item">
                                        <Clock size={18} />
                                        <span>{formatDuration(selectedWorkout.start_time, selectedWorkout.end_time)}</span>
                                    </div>
                                    <div className="meta-item">
                                        <Dumbbell size={18} />
                                        <span>{selectedWorkout.volume_kg} kg volumen total</span>
                                    </div>
                                </div>
                            </div>

                            <div className="exercise-list">
                                {selectedWorkout.raw_data.exercises?.map((exercise, idx) => (
                                    <div key={idx} className="exercise-item">
                                        <div className="exercise-info">
                                            <h4>{exercise.title}</h4>
                                            <span className="muscle-label">{exercise.primary_muscle_group || 'Otros'}</span>
                                        </div>
                                        <div className="sets-table">
                                            <div className="sets-header">
                                                <span>SET</span>
                                                <span>PESO</span>
                                                <span>REPS</span>
                                                <span>TIPO</span>
                                            </div>
                                            {exercise.sets?.map((set, sIdx) => (
                                                <div key={sIdx} className="set-row">
                                                    <span className="set-num">{sIdx + 1}</span>
                                                    <span className="set-weight">{set.weight_kg} kg</span>
                                                    <span className="set-reps">{set.reps}</span>
                                                    <span className="set-type">{set.type === 'normal' ? 'Normal' : set.type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Workouts;
