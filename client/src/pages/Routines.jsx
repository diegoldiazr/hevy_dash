import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Play, BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';

const Routines = () => {
    const [data, setData] = useState({ folders: [], routines: [] });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [analyzing, setAnalyzing] = useState(null);
    const [analyses, setAnalyses] = useState({});
    const [expanded, setExpanded] = useState({});

    useEffect(() => {
        fetchRoutines();
    }, []);

    const fetchRoutines = async () => {
        try {
            const res = await axios.get('/api/routines');
            setData(res.data);
        } catch (err) {
            console.error("Failed to fetch routines", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await axios.post('/api/routines/sync');
            fetchRoutines();
        } catch (err) {
            console.error("Sync failed", err);
        } finally {
            setSyncing(false);
        }
    };

    const handleAnalyze = async (id) => {
        setAnalyzing(id);
        try {
            const res = await axios.post(`/api/routines/${id}/analyze`);
            setAnalyses(prev => ({ ...prev, [id]: res.data.analysis }));
            setExpanded(prev => ({ ...prev, [id]: true }));
        } catch (err) {
            console.error("Analysis failed", err);
            alert("Error al analizar la rutina. Revisa la OpenAI Key en Ajustes.");
        } finally {
            setAnalyzing(null);
        }
    };

    const toggleExpand = (id) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Group routines by folder
    const groupedRoutines = {};
    const unsortedRoutines = [];

    data.routines.forEach(routine => {
        if (routine.folder_id) {
            if (!groupedRoutines[routine.folder_id]) {
                groupedRoutines[routine.folder_id] = [];
            }
            groupedRoutines[routine.folder_id].push(routine);
        } else {
            unsortedRoutines.push(routine);
        }
    });

    const renderRoutineCard = (routine) => (
        <div key={routine.id} className="routine-card">
            <div className="routine-header">
                <div className="title-section">
                    <h3>{routine.title}</h3>
                    <div className="meta-info">
                        <span className="exercise-count">
                            {routine.raw_data.exercises ? routine.raw_data.exercises.length : 0} Ejercicios
                        </span>
                        <span className="last-modified">
                            Modificado: {formatDate(routine.updated_at)}
                        </span>
                    </div>
                </div>
                <div className="actions">
                    <button
                        className="analyze-btn"
                        onClick={() => handleAnalyze(routine.id)}
                        disabled={analyzing === routine.id}
                    >
                        <BrainCircuit size={16} />
                        {analyzing === routine.id ? 'Pensando...' : 'Analizar'}
                    </button>
                    <button className="expand-btn" onClick={() => toggleExpand(routine.id)}>
                        {expanded[routine.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>

            {expanded[routine.id] && (
                <div className="routine-details">
                    <div className="exercises-list">
                        <h4>Ejercicios</h4>
                        <ul>
                            {routine.raw_data.exercises && routine.raw_data.exercises.map((ex, idx) => (
                                <li key={idx} className="exercises-item">
                                    {ex.title}
                                    <span className="sets-info">{ex.sets.length} series</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {analyses[routine.id] && (
                        <div className="ai-analysis">
                            <h4><BrainCircuit size={16} /> Análisis de IA</h4>
                            <p>{analyses[routine.id]}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="routines-page">
            <div className="routines-header">
                <h2>Mis Rutinas</h2>
                <button
                    className={`sync-btn ${syncing ? 'spinning' : ''}`}
                    onClick={handleSync}
                    disabled={syncing}
                >
                    <RefreshCw size={18} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>
            </div>

            {loading ? <div className="loading">Cargando rutinas...</div> : (
                <div className="routines-list">
                    {data.folders.map(folder => (
                        groupedRoutines[folder.id] && groupedRoutines[folder.id].length > 0 && (
                            <div key={folder.id} className="routine-folder">
                                <div className="folder-header">
                                    <h3>{folder.title}</h3>
                                    <span className="folder-count">{groupedRoutines[folder.id].length}</span>
                                </div>
                                <div className="folder-routines">
                                    {groupedRoutines[folder.id].map(renderRoutineCard)}
                                </div>
                            </div>
                        )
                    ))}

                    {unsortedRoutines.length > 0 && (
                        <div className="routine-folder">
                            <div className="folder-header">
                                <h3>Sin carpeta</h3>
                                <span className="folder-count">{unsortedRoutines.length}</span>
                            </div>
                            <div className="folder-routines">
                                {unsortedRoutines.map(renderRoutineCard)}
                            </div>
                        </div>
                    )}

                    {data.routines.length === 0 && (
                        <div className="empty-state">No se encontraron rutinas. Sincroniza para importar desde Hevy.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Routines;
