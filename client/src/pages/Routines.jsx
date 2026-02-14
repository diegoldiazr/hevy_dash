import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Play, BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';

const Routines = () => {
    const [routines, setRoutines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [analyzing, setAnalyzing] = useState(null); // ID of routine being analyzed
    const [analyses, setAnalyses] = useState({}); // Map routine ID to analysis text
    const [expanded, setExpanded] = useState({}); // Map routine ID to boolean

    useEffect(() => {
        fetchRoutines();
    }, []);

    const fetchRoutines = async () => {
        try {
            const res = await axios.get('/api/routines');
            setRoutines(res.data);
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
            alert("Failed to analyze routine. Check OpenAI Key.");
        } finally {
            setAnalyzing(null);
        }
    };

    const toggleExpand = (id) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="routines-page">
            <div className="header">
                <h2>My Routines</h2>
                <button
                    className={`sync-btn ${syncing ? 'spinning' : ''}`}
                    onClick={handleSync}
                    disabled={syncing}
                >
                    <RefreshCw size={18} />
                    {syncing ? 'Syncing...' : 'Sync Routines'}
                </button>
            </div>

            {loading ? <div className="loading">Loading routines...</div> : (
                <div className="routines-list">
                    {routines.length === 0 ? <div className="empty-state">No routines found. Sync to import from Hevy.</div> : (
                        routines.map(routine => (
                            <div key={routine.id} className="routine-card">
                                <div className="routine-header">
                                    <div className="title-section">
                                        <h3>{routine.title}</h3>
                                        <span className="exercise-count">
                                            {routine.raw_data.exercises ? routine.raw_data.exercises.length : 0} Exercises
                                        </span>
                                    </div>
                                    <div className="actions">
                                        <button
                                            className="analyze-btn"
                                            onClick={() => handleAnalyze(routine.id)}
                                            disabled={analyzing === routine.id}
                                        >
                                            <BrainCircuit size={16} />
                                            {analyzing === routine.id ? 'Thinking...' : 'Analyze'}
                                        </button>
                                        <button className="expand-btn" onClick={() => toggleExpand(routine.id)}>
                                            {expanded[routine.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                    </div>
                                </div>

                                {expanded[routine.id] && (
                                    <div className="routine-details">
                                        <div className="exercises-list">
                                            <h4>Exercises:</h4>
                                            <ul>
                                                {routine.raw_data.exercises && routine.raw_data.exercises.map((ex, idx) => (
                                                    <li key={idx}>{ex.title} <span className="sets-info">({ex.sets.length} sets)</span></li>
                                                ))}
                                            </ul>
                                        </div>
                                        {analyses[routine.id] && (
                                            <div className="ai-analysis">
                                                <h4><BrainCircuit size={16} /> AI Analysis:</h4>
                                                <p>{analyses[routine.id]}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Routines;
