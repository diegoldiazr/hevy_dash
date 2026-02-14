import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Dumbbell, Activity, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalWorkouts: 0,
        totalVolume: 0,
        recentWorkouts: []
    });
    const [loading, setLoading] = useState(true);

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

    if (loading) return <div className="loading">Loading Dashboard...</div>;

    // Mock data for the chart if no real data
    const chartData = stats.recentWorkouts.length > 0
        ? stats.recentWorkouts.map(w => ({ name: new Date(w.start_time).toLocaleDateString(), volume: w.volume_kg })).reverse()
        : [
            { name: 'Mon', volume: 4000 },
            { name: 'Wed', volume: 3000 },
            { name: 'Fri', volume: 5000 },
        ];

    return (
        <div className="dashboard-page">
            <h2>Dashboard</h2>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="icon-wrapper"><Dumbbell size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats.totalWorkouts}</h3>
                        <p>Total Workouts</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-wrapper"><Activity size={24} /></div>
                    <div className="stat-info">
                        <h3>{(stats.totalVolume / 1000).toFixed(1)}k kg</h3>
                        <p>Total Volume</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-wrapper"><Calendar size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats.recentWorkouts.length > 0 ? new Date(stats.recentWorkouts[0].start_time).toLocaleDateString() : 'N/A'}</h3>
                        <p>Last Workout</p>
                    </div>
                </div>
            </div>

            <div className="chart-section">
                <h3>Recent Volume</h3>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <XAxis dataKey="name" stroke="#888" />
                            <YAxis stroke="#888" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#333', border: 'none' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="volume" fill="#bb86fc" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="recent-list">
                <h3>Recent Activity</h3>
                {stats.recentWorkouts.length === 0 ? (
                    <p className="no-data">No workouts recorded yet. Sync with Hevy to see your data!</p>
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
