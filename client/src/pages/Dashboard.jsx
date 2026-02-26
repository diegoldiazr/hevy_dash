import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Dumbbell, Activity, Calendar, Clock } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid, BarChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell } from 'recharts';
import TrainingCalendar from '../components/TrainingCalendar';
import VolumeLandmarks from '../components/VolumeLandmarks';
import SegmentedControl from '../components/SegmentedControl';
import { calculateEffectiveVolume } from '../utils/volumeEngine';

const Dashboard = () => {
    const [stats, setStats] = useState({
        workouts: { month: 0, year: 0, all: 0 },
        volume: { month: 0, year: 0, all: 0 },
        duration: { month: 0, year: 0, all: 0 },
        recentWorkouts: []
    });
    const [loading, setLoading] = useState(true);

    const [globalPeriod, setGlobalPeriod] = useState('month');
    const [volumeChartData, setVolumeChartData] = useState([]);
    const [durationChartData, setDurationChartData] = useState([]);
    const [recentMuscleStats, setRecentMuscleStats] = useState([]);
    const [radarData, setRadarData] = useState([]);
    const [effectiveVolumeData, setEffectiveVolumeData] = useState([]);

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

    const fetchEffectiveVolume = async () => {
        try {
            // Fetch more workouts to have better 1RM history (e.g., last 100)
            const res = await axios.get('/api/workouts?pageSize=100');
            const data = calculateEffectiveVolume(res.data);
            setEffectiveVolumeData(data);
        } catch (error) {
            console.error("Failed to fetch effective volume", error);
        }
    };

    useEffect(() => { fetchCoreStats(); }, []);
    useEffect(() => { fetchChartData('volume', globalPeriod, setVolumeChartData); }, [globalPeriod]);
    useEffect(() => { fetchChartData('duration', globalPeriod, setDurationChartData); }, [globalPeriod]);
    useEffect(() => { fetchMuscleStats(globalPeriod); }, [globalPeriod]);
    useEffect(() => { fetchEffectiveVolume(); }, []);

    const periodOptions = [
        { label: 'Mes', value: 'month' },
        { label: 'Año', value: 'year' },
        { label: 'Historial', value: 'all' }
    ];

    const PeriodSelector = ({ current, onChange, name }) => (
        <SegmentedControl
            small
            name={name}
            options={periodOptions}
            value={current}
            onChange={onChange}
        />
    );

    if (loading) return <div className="loading">Cargando Panel...</div>;

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <h2>Panel de Control</h2>
                <SegmentedControl
                    name="global_dashboard_period"
                    options={periodOptions}
                    value={globalPeriod}
                    onChange={setGlobalPeriod}
                />
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
                        <div className="stat-card-header" style={{ marginBottom: 0 }}>
                            <div className="icon-wrapper"><Dumbbell size={24} /></div>
                            <h3>{globalPeriod === 'month' ? stats.workouts.month : (globalPeriod === 'year' ? stats.workouts.year : stats.workouts.all)}</h3>
                        </div>
                    </div>
                    <div className="stat-info">
                        <p>{globalPeriod === 'month' ? 'Entrenamientos (Mes)' : (globalPeriod === 'year' ? `Entrenamientos (${currentYear})` : 'Entrenamientos (Total)')}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
                        <div className="stat-card-header" style={{ marginBottom: 0 }}>
                            <div className="icon-wrapper"><Activity size={24} /></div>
                            <h3>{((globalPeriod === 'month' ? stats.volume.month : (globalPeriod === 'year' ? stats.volume.year : stats.volume.all)) / 1000).toFixed(1)}k kg</h3>
                        </div>
                    </div>
                    <div className="stat-info">
                        <p>{globalPeriod === 'month' ? 'Volumen (Mes)' : (globalPeriod === 'year' ? `Volumen (${currentYear})` : 'Volumen (Total)')}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header" style={{ marginBottom: 0 }}>
                        <div className="icon-wrapper"><Calendar size={24} /></div>
                        <h3>{stats.recentWorkouts.length > 0 ? new Date(stats.recentWorkouts[0].start_time).toLocaleDateString() : 'N/A'}</h3>
                    </div>
                    <div className="stat-info">
                        <p>Último Entrenamiento</p>
                    </div>
                </div>
            </div>

            <div className="volume-section" style={{ marginBottom: '24px' }}>
                <VolumeLandmarks
                    effectiveVolumeData={effectiveVolumeData}
                    period={globalPeriod}
                />
            </div>

            <div className="chart-section">
                <div className="chart-header">
                    <h3>Volumen Reciente (kg)</h3>
                </div>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={volumeChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                            <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                                itemStyle={{ color: 'var(--text-main)' }}
                                labelStyle={{ color: 'var(--text-main)' }}
                            />
                            <Bar dataKey="value" fill="#5865f2" radius={[4, 4, 0, 0]} barSize={globalPeriod === 'month' ? 30 : 40}>
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
                </div>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={durationChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                            <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                                itemStyle={{ color: 'var(--text-main)' }}
                                labelStyle={{ color: 'var(--text-main)' }}
                            />
                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={globalPeriod === 'month' ? 30 : 40}>
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
                    </div>
                    <div className="chart-container radar-container">
                        <ResponsiveContainer width="100%" height={350}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid gridType="polygon" stroke="var(--chart-grid)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
                                <Radar
                                    name="Nivel"
                                    dataKey="A"
                                    stroke="var(--primary)"
                                    fill="var(--primary)"
                                    fillOpacity={0.6}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-section">
                    <div className="chart-header">
                        <h3>Top 10 Músculos</h3>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={recentMuscleStats} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#888" width={100} fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-main)' }}
                                    labelStyle={{ color: 'var(--text-main)' }}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                                    <LabelList dataKey="count" position="right" style={{ fill: 'var(--text-muted)', fontSize: '12px' }} formatter={(v) => `${v} series`} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bottom-grid">
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

                <div className="dashboard-calendar-wrapper">
                    <TrainingCalendar />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
