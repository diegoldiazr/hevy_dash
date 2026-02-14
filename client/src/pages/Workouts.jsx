import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Calendar, Dumbbell, Clock } from 'lucide-react';

const Workouts = () => {
    const [workouts, setWorkouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [page, setPage] = useState(1);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchWorkouts();
    }, [page]);

    const fetchWorkouts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/workouts?page=${page}`);
            // If page 1, replace. If more, append? For now just replace for simplicity or pagination UI
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
            await axios.post('/api/hevy/sync');
            // Refresh list after sync
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
        return `${hours}h ${mins}m`;
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
                    {syncing ? 'Sincronizando...' : 'Sincronizar datos de Hevy'}
                </button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {loading && workouts.length === 0 ? (
                <div className="loading">Cargando entrenamientos...</div>
            ) : (
                <div className="workouts-list">
                    {workouts.length === 0 ? (
                        <div className="empty-state">No se encontraron entrenamientos. ¡Intenta sincronizar!</div>
                    ) : (
                        workouts.map(workout => (
                            <div key={workout.id} className="workout-card">
                                <div className="workout-header">
                                    <h3>{workout.title}</h3>
                                    <span className="workout-date">
                                        <Calendar size={14} />
                                        {new Date(workout.start_time).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="workout-stats">
                                    <div className="stat">
                                        <Dumbbell size={16} />
                                        <span>{workout.volume_kg} kg de Volumen</span>
                                    </div>
                                    <div className="stat">
                                        <Clock size={16} />
                                        <span>{formatDuration(workout.start_time, workout.end_time)}</span>
                                    </div>
                                    <div className="stat">
                                        <span>{workout.raw_data.exercise_count || workout.raw_data.exercises?.length || 0} Ejercicios</span>
                                    </div>
                                </div>
                                {/* Expandable details could go here */}
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
    );
};

export default Workouts;
