import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Dumbbell, Clock, ChevronRight, X, Lightbulb, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const Workouts = () => {
    const [workouts, setWorkouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [error, setError] = useState(null);
    const [selectedWorkout, setSelectedWorkout] = useState(null);
    const [analysis, setAnalysis] = useState({});
    const [analysisLoading, setAnalysisLoading] = useState(false);

    useEffect(() => {
        fetchWorkouts();
    }, [page]);

    useEffect(() => {
        if (selectedWorkout) {
            fetchAnalysis(selectedWorkout.id);
        } else {
            setAnalysis({});
        }
    }, [selectedWorkout]);

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

    const fetchAnalysis = async (id) => {
        setAnalysisLoading(true);
        try {
            const res = await axios.get(`/api/workouts/${id}/analysis`);
            setAnalysis(res.data);
        } catch (err) {
            console.error("Failed to fetch analysis", err);
        } finally {
            setAnalysisLoading(false);
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

    const calculateRadarData = (workout) => {
        if (!workout || !workout.raw_data.exercises) return [];

        const mapping = {
            'chest': 'Torso', 'abs': 'Torso', 'abdominals': 'Torso',
            'legs': 'Piernas', 'quads': 'Piernas', 'hamstrings': 'Piernas', 'glutes': 'Piernas', 'calves': 'Piernas', 'quadriceps': 'Piernas',
            'biceps': 'Brazos', 'triceps': 'Brazos', 'forearms': 'Brazos',
            'back': 'Espalda', 'traps': 'Espalda', 'lats': 'Espalda', 'lower_back': 'Espalda',
            'shoulders': 'Hombros'
        };

        const categories = { 'Torso': 0, 'Piernas': 0, 'Brazos': 0, 'Espalda': 0, 'Hombros': 0 };

        workout.raw_data.exercises.forEach(ex => {
            const muscle = (ex.primary_muscle_group || 'other').toLowerCase();
            const cat = mapping[muscle];
            if (cat) categories[cat] += (ex.sets ? ex.sets.length : 0);
        });

        return Object.entries(categories).map(([name, count]) => ({
            subject: name,
            A: Math.min(10, count), // 10 sets in one session is a "10" intensity focus
            fullMark: 10
        }));
    };
    const getExerciseImage = (exercise) => {
        if (!exercise) return null;

        // 1. Database / Scraped Images (Prioritize GIFs for motion, then static images)
        if (exercise.execution_video_url && exercise.execution_video_url.endsWith('.gif')) {
            return exercise.execution_video_url;
        }
        if (exercise.muscle_image_url) {
            return exercise.muscle_image_url;
        }

        // 2. Hevy Synced URLs
        if (exercise.thumbnail_url) return exercise.thumbnail_url;
        if (exercise.image_url) return exercise.image_url;

        let id = exercise.exercise_template_id;
        const muscle = exercise.primary_muscle_group;

        if (!id || !muscle) return null;

        // Map muscle to the capitalized version used in CloudFront
        const muscleMap = {
            'chest': 'Chest',
            'shoulders': 'Shoulders',
            'back': 'Back',
            'triceps': 'Triceps',
            'biceps': 'Biceps',
            'abs': 'Abs',
            'legs': 'Legs',
            'quads': 'Quads',
            'hamstrings': 'Hamstrings',
            'glutes': 'Hips', // Hevy uses 'Hips' for glutes in thumbnails
            'calves': 'Calves',
            'traps': 'Shoulders',
            'forearms': 'Arms',
            'lower_back': 'Back'
        };

        const capitalizedMuscle = muscleMap[muscle.toLowerCase()] || 'Chest';

        // Mapping Hex API IDs (e.g. 79D0BB3A) to 8-digit Numeric CDN IDs (e.g. 00251201)
        const hexToNumeric = {
            '79D0BB3A': { id: '00251201', slug: 'Barbell-Bench-Press' },
            '9237BAD1': { id: '14541201', slug: 'Lever-Seated-Shoulder-Press' },
            'D04AC939': { id: '00151201', slug: 'Barbell-Back-Squat' },
            'C6272009': { id: '22111201', slug: 'Barbell-Deadlift' },
            '6A6C31A5': { id: '21251201', slug: 'Lat-Pulldown-Cable' },
            '3601968B': { id: '01201201', slug: 'Dumbbell-Bench-Press' },
            '878CD1D0': { id: '03921201', slug: 'Dumbbell-Shoulder-Press' },
            'F1E57334': { id: '21201201', slug: 'Dumbbell-Row' },
            '7B8D84E8': { id: '06511201', slug: 'Overhead-Press-Barbell' },
            'A5AC6449': { id: '03931201', slug: 'Barbell-Curl' },
            '7EB3F7C3': { id: '05761201', slug: 'Iso-Lateral-Chest-Press-Machine' },
            '75A4F6C4': { id: '10211201', slug: 'Leg-Extension-Machine' },
            'C3BCABB3': { id: '21301201', slug: 'Seated-Cable-Row' },
            '10301201': { id: '10301201', slug: 'Lever-Pec-Deck-Fly' }
        };

        let slug = '';
        const mapped = hexToNumeric[id];

        if (mapped) {
            id = mapped.id;
            slug = mapped.slug;
        } else {
            // Attempt to guess slug: "Title (Equip)" -> "Equip-Title" or "Title"
            // Hevy usually does Equip-Title
            let cleanTitle = exercise.title.replace(/[()]/g, '').trim();
            slug = cleanTitle.split(' ').join('-');
        }

        return `https://d2l9nsnmtah87f.cloudfront.net/exercise-thumbnails/${id}-${slug}_${capitalizedMuscle}_thumbnail@3x.jpg`;
    };

    return (
        <div className="workouts-page">
            <div className="workouts-header">
                <h2>Entrenamientos</h2>
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
                                                <span>{Math.round(workout.volume_kg)} kg</span>
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
                                <div className="detail-meta-container">
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
                                            <span>{Math.round(selectedWorkout.volume_kg)} kg</span>
                                        </div>
                                    </div>

                                    <div className="workout-radar-container">
                                        <ResponsiveContainer width="100%" height={220}>
                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={calculateRadarData(selectedWorkout)}>
                                                <PolarGrid gridType="polygon" stroke="var(--chart-grid)" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                                                <Radar
                                                    name="Enfoque"
                                                    dataKey="A"
                                                    stroke="var(--primary)"
                                                    fill="var(--primary)"
                                                    fillOpacity={0.6}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="exercise-list">
                                {selectedWorkout.raw_data.exercises?.map((exercise, idx) => (
                                    <div key={idx} className="exercise-item">
                                        <div className="exercise-header-row">
                                            <div className="exercise-image-container">
                                                <img
                                                    src={getExerciseImage(exercise)}
                                                    alt={exercise.title}
                                                    className="exercise-thumb"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.classList.add('fallback');
                                                    }}
                                                />
                                                <div className="muscle-fallback-icon">
                                                    <Dumbbell size={24} />
                                                </div>
                                            </div>
                                            <div className="exercise-info">
                                                <div className="exercise-title-row">
                                                    <h4>{exercise.title}</h4>
                                                    {analysis[exercise.title] && (
                                                        <span className={`analysis-badge ${analysis[exercise.title].status}`}>
                                                            {analysisLoading ? '...' : (
                                                                <>
                                                                    {analysis[exercise.title].status === 'evolved' && <TrendingUp size={12} />}
                                                                    {analysis[exercise.title].status === 'stagnant' && <AlertTriangle size={12} />}
                                                                    {analysis[exercise.title].status === 'new' && <Zap size={12} />}
                                                                    {analysis[exercise.title].status === 'evolved' ? 'En Evolución' : (analysis[exercise.title].status === 'stagnant' ? 'Estancado' : 'Nuevo')}
                                                                </>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="muscle-label">{exercise.primary_muscle_group || 'Otros'}</span>
                                            </div>
                                        </div>

                                        {analysis[exercise.title] && (
                                            <div className={`proposal-box ${analysis[exercise.title].type}`}>
                                                <div className="proposal-header">
                                                    <Lightbulb size={16} />
                                                    <span>Propuesta de Mejora</span>
                                                </div>
                                                <p>{analysis[exercise.title].proposal}</p>
                                                {analysis[exercise.title].diff && (
                                                    <div className="proposal-diff">
                                                        {analysis[exercise.title].diff.weight !== '0.0' && (
                                                            <span className={parseFloat(analysis[exercise.title].diff.weight) >= 0 ? 'pos' : 'neg'}>
                                                                Peso: {analysis[exercise.title].diff.weight > 0 ? '+' : ''}{analysis[exercise.title].diff.weight}kg
                                                            </span>
                                                        )}
                                                        {analysis[exercise.title].diff.reps !== 0 && (
                                                            <span className={analysis[exercise.title].diff.reps >= 0 ? 'pos' : 'neg'}>
                                                                Reps: {analysis[exercise.title].diff.reps > 0 ? '+' : ''}{analysis[exercise.title].diff.reps}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

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
