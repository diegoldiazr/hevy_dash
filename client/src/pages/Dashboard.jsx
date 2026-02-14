import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Dumbbell, Activity, Calendar, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalWorkouts: 0,
        yearWorkouts: 0,
        totalVolume: 0,
        yearVolume: 0,
        recentWorkouts: []
    });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [showAllWorkouts, setShowAllWorkouts] = useState(false);
    const [showAllVolume, setShowAllVolume] = useState(false);

    const currentYear = new Date().getFullYear();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get('/api/stats');
                setStats(res.data);
            } catch (error) {
                console.error("Failed to fetch stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await axios.post('/api/hevy/sync');
            const res = await axios.get('/api/stats');
            console.log("Stats updated:", res.data);
            setStats(res.data);
        } catch (error) {
            console.error("Failed to sync", error);
        } finally {
            setSyncing(false);
        }
    };

    if (loading) return <div className="loading">Cargando Panel...</div>;

    // Mock data for the chart if no real data
    const chartData = stats.recentWorkouts.length > 0
        ? stats.recentWorkouts.map(w => ({ name: new Date(w.start_time).toLocaleDateString(), volume: w.volume_kg })).reverse()
        : [
            { name: 'Lun', volume: 4000 },
            { name: 'Mié', volume: 3000 },
            { name: 'Vie', volume: 5000 },
        ];

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <h2>Panel de Control</h2>
                <button
                    className={`sync-btn ${syncing ? 'spinning' : ''}`}
                    onClick={handleSync}
                    disabled={syncing}
                >
                    <RefreshCw size={18} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar Hevy'}
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="icon-wrapper"><Dumbbell size={24} /></div>
                    <div className="stat-info">
                        <h3>{showAllWorkouts ? stats.totalWorkouts : stats.yearWorkouts}</h3>
                        <p>{showAllWorkouts ? 'Entrenamientos Totales' : `Entrenamientos ${currentYear}`}</p>
                        <label className="stat-toggle">
                            <input
                                type="checkbox"
                                checked={showAllWorkouts}
                                onChange={(e) => setShowAllWorkouts(e.target.checked)}
                            />
                            <span>Ver histórico</span>
                        </label>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-wrapper"><Activity size={24} /></div>
                    <div className="stat-info">
                        <h3>{((showAllVolume ? stats.totalVolume : stats.yearVolume) / 1000).toFixed(1)}k kg</h3>
                        <p>{showAllVolume ? 'Volumen Total' : `Volumen ${currentYear}`}</p>
                        <label className="stat-toggle">
                            <input
                                type="checkbox"
                                checked={showAllVolume}
                                onChange={(e) => setShowAllVolume(e.target.checked)}
                            />
                            <span>Ver histórico</span>
                        </label>
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
                <h3>Volumén Reciente</h3>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <XAxis dataKey="name" stroke="#888" />
                            <YAxis stroke="#888" />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                            />
                            <Bar dataKey="volume" fill="#2563eb" radius={[4, 4, 0, 0]}>
                                <LabelList
                                    dataKey="volume"
                                    position="inside"
                                    fill="white"
                                    formatter={(value) => `${value} kg`}
                                    style={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="recent-list">
                <h3>Actividad Reciente</h3>
                {stats.recentWorkouts.length === 0 ? (
                    <p className="no-data">No hay entrenamientos registrados. ¡Sincroniza con Hevy para ver tus datos!</p>
                ) : (
                    <ul>
                        {stats.recentWorkouts.map(w => (
                            <li key={w.id} className="workout-item">
                                <span className="title">{w.title}</span>
                                <span className="date">{new Date(w.start_time).toLocaleDateString()}</span>
                                <span className="volume">{w.volume_kg} kg</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
