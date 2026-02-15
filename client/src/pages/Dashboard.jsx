import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Dumbbell, Activity, Calendar, RefreshCw, Clock } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid, BarChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const Dashboard = () => {
    const [stats, setStats] = useState({
        workouts: { month: 0, year: 0, all: 0 },
        volume: { month: 0, year: 0, all: 0 },
        duration: { month: 0, year: 0, all: 0 },
        recentWorkouts: []
    });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Independent periods
    const [workoutsPeriod, setWorkoutsPeriod] = useState('year');
    const [totalVolumePeriod, setTotalVolumePeriod] = useState('year');

    const [volumeChartData, setVolumeChartData] = useState([]);
    const [volumePeriod, setVolumePeriod] = useState('month');

    const [durationChartData, setDurationChartData] = useState([]);
    const [durationPeriod, setDurationPeriod] = useState('month');

    const [recentMuscleStats, setRecentMuscleStats] = useState([]);
    const [musclePeriod, setMusclePeriod] = useState('month');
    const [radarData, setRadarData] = useState([]);

    const currentYear = new Date().getFullYear();

    const fetchCoreStats = async () => {
        try {
            const res = await axios.get('/api/stats');
            setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch core stats", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChartData = async (metric, period, setter) => {
        try {
            const res = await axios.get(`/api/stats/chart?metric=${metric}&period=${period}`);
            // Calculate average
            const data = res.data || [];
            if (data.length > 0) {
                const avg = data.reduce((acc, curr) => acc + curr.value, 0) / data.length;
                setter(data.map(item => ({ ...item, average: Math.round(avg) })));
            } else {
                setter([]);
            }
        } catch (error) {
            console.error(`Failed to fetch ${metric} chart data`, error);
        }
    };

    const fetchMuscleStats = async (period) => {
        try {
            const res = await axios.get(`/api/stats/muscles?period=${period}`);
            const data = res.data;
            setRecentMuscleStats(data);

            // Group for Radar Chart
            // Categories: Torso, Legs, Arms, Back, Shoulders
            const mapping = {
                'Pecho': 'Torso', 'Abdominales': 'Torso', 'Abdominals': 'Torso', 'Chest': 'Torso', 'Abs': 'Torso',
                'Cuádriceps': 'Piernas', 'Isquios': 'Piernas', 'Glúteos': 'Piernas', 'Gemelos': 'Piernas', 'Quadriceps': 'Piernas', 'Hamstrings': 'Piernas', 'Glutes': 'Piernas', 'Calves': 'Piernas', 'Legs': 'Piernas',
                'Bíceps': 'Brazos', 'Tríceps': 'Brazos', 'Antebrazos': 'Brazos', 'Biceps': 'Brazos', 'Triceps': 'Brazos', 'Forearms': 'Brazos',
                'Espalda': 'Espalda', 'Trapecio': 'Espalda', 'Dorsales': 'Espalda', 'Lumbar': 'Espalda', 'Back': 'Espalda', 'Traps': 'Espalda', 'Lats': 'Espalda', 'Lower_back': 'Espalda',
                'Hombros': 'Hombros', 'Shoulders': 'Hombros'
            };

            const categories = { 'Torso': 0, 'Piernas': 0, 'Brazos': 0, 'Espalda': 0, 'Hombros': 0 };
            data.forEach(m => {
                const cat = mapping[m.name];
                if (cat) categories[cat] += m.count;
            });

            // Normalize to 1-10 scale
            // Target: Number of sets per group to reach "10" intensity
            // Monthly: 70 sets, Year: 840, All: 4000
            const targets = { month: 70, year: 840, all: 4000 };
            const target = targets[period] || 100;

            const radar = Object.entries(categories).map(([name, count]) => ({
                subject: name,
                A: Math.min(10, Math.max(0, (count / target) * 10)),
                fullMark: 10
            }));

            setRadarData(radar);
        } catch (error) {
            console.error("Failed to fetch muscle stats", error);
        }
    };

    useEffect(() => { fetchCoreStats(); }, []);
    useEffect(() => { fetchChartData('volume', volumePeriod, setVolumeChartData); }, [volumePeriod]);
    useEffect(() => { fetchChartData('duration', durationPeriod, setDurationChartData); }, [durationPeriod]);
    useEffect(() => { fetchMuscleStats(musclePeriod); }, [musclePeriod]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await axios.post('/api/hevy/sync?fullSync=true');
            await fetchCoreStats();
            await fetchChartData('volume', volumePeriod, setVolumeChartData);
            await fetchChartData('duration', durationPeriod, setDurationChartData);
            await fetchMuscleStats(musclePeriod);
        } catch (error) {
            console.error("Failed to sync", error);
        } finally {
            setSyncing(false);
        }
    };

    const PeriodSelector = ({ current, onChange }) => (
        <div className="period-selector mini">
            <button className={`period-btn ${current === 'month' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onChange('month'); }}>Mes</button>
            <button className={`period-btn ${current === 'year' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onChange('year'); }}>Año</button>
            <button className={`period-btn ${current === 'all' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onChange('all'); }}>Todo</button>
        </div>
    );

    if (loading) return <div className="loading">Cargando Panel...</div>;

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <h2>Panel de Control</h2>
                <button className={`sync-btn ${syncing ? 'spinning' : ''}`} onClick={handleSync} disabled={syncing}>
                    <RefreshCw size={18} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar Hevy'}
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="icon-wrapper"><Dumbbell size={24} /></div>
                    <div className="stat-info">
                        <h3>{workoutsPeriod === 'month' ? stats.workouts.month : (workoutsPeriod === 'year' ? stats.workouts.year : stats.workouts.all)}</h3>
                        <p>{workoutsPeriod === 'month' ? 'Este Mes' : (workoutsPeriod === 'year' ? `Año ${currentYear}` : 'Histórico')}</p>
                        <div className="stat-period-wrapper"><PeriodSelector current={workoutsPeriod} onChange={setWorkoutsPeriod} /></div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-wrapper"><Activity size={24} /></div>
                    <div className="stat-info">
                        <h3>{((totalVolumePeriod === 'month' ? stats.volume.month : (totalVolumePeriod === 'year' ? stats.volume.year : stats.volume.all)) / 1000).toFixed(1)}k kg</h3>
                        <p>{totalVolumePeriod === 'month' ? 'Este Mes' : (totalVolumePeriod === 'year' ? `Año ${currentYear}` : 'Histórico')}</p>
                        <div className="stat-period-wrapper"><PeriodSelector current={totalVolumePeriod} onChange={setTotalVolumePeriod} /></div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-wrapper"><Calendar size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats.recentWorkouts.length > 0 ? new Date(stats.recentWorkouts[0].start_time).toLocaleDateString() : 'N/A'}</h3>
                        <p>Último Entrenamiento</p>
                    </div>
                </div>
            </div>

            <div className="chart-section">
                <div className="chart-header">
                    <h3>Volumen Reciente (kg)</h3>
                    <PeriodSelector current={volumePeriod} onChange={setVolumePeriod} />
                </div>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={volumeChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-main)' }} />
                            <Bar dataKey="value" fill="#5865f2" radius={[4, 4, 0, 0]} barSize={volumePeriod === 'month' ? 30 : 40}>
                                <LabelList dataKey="value" position="top" fill="#888" formatter={(v) => `${v}`} style={{ fontSize: '10px' }} />
                            </Bar>
                            <Line type="monotone" dataKey="average" stroke="#ff4757" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Media" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="chart-section">
                <div className="chart-header">
                    <h3>Tiempo de Sesión (min)</h3>
                    <PeriodSelector current={durationPeriod} onChange={setDurationPeriod} />
                </div>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={durationChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-main)' }} />
                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={durationPeriod === 'month' ? 30 : 40}>
                                <LabelList dataKey="value" position="top" fill="#888" formatter={(v) => `${v}`} style={{ fontSize: '10px' }} />
                            </Bar>
                            <Line type="monotone" dataKey="average" stroke="#eccc68" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Media" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="chart-grid">
                <div className="chart-section">
                    <div className="chart-header">
                        <h3>Enfoque Muscular (Radar)</h3>
                        <PeriodSelector current={musclePeriod} onChange={setMusclePeriod} />
                    </div>
                    <div className="chart-container radar-container">
                        <ResponsiveContainer width="100%" height={350}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.05)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
                                <Radar
                                    name="Nivel"
                                    dataKey="A"
                                    stroke="var(--primary)"
                                    fill="var(--primary)"
                                    fillOpacity={0.6}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-main)' }}
                                    formatter={(value) => [`${value.toFixed(1)}/10`, 'Intensidad']}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-section">
                    <div className="chart-header">
                        <h3>Top 10 Músculos</h3>
                        <PeriodSelector current={musclePeriod} onChange={setMusclePeriod} />
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={recentMuscleStats} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#888" width={100} fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-main)' }} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                                    <LabelList dataKey="count" position="right" style={{ fill: 'var(--text-muted)', fontSize: '12px' }} formatter={(v) => `${v} series`} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="recent-list">
                <h3>Actividad Reciente</h3>
                <ul>
                    {stats.recentWorkouts.map(w => (
                        <li key={w.id} className="workout-item">
                            <span className="title">{w.title}</span>
                            <span className="date">{new Date(w.start_time).toLocaleDateString()}</span>
                            <span className="volume">{w.volume_kg} kg</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Dashboard;
