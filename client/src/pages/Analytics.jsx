import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#bb86fc', '#cf6679', '#03dac6'];

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await axios.get('/api/analytics');
                setData(res.data);
            } catch (err) {
                console.error("Failed to load analytics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="loading">Loading Analytics...</div>;

    if (!data) return <div className="empty-state">No data available.</div>;

    return (
        <div className="analytics-page">
            <h2>Deep Dive Analytics</h2>

            <div className="analytics-grid">
                <div className="chart-card">
                    <h3>Muscle Group Split (Sets)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={data.muscleSplit}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label
                                >
                                    {data.muscleSplit.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <h3>Weekly Volume Trend</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={data.weeklyVolume}>
                                <XAxis dataKey="name" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none' }} />
                                <Legend />
                                <Bar dataKey="value" name="Volume (kg)" fill="#03dac6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="insight-section">
                <h3>Trainer Insights</h3>
                <p>
                    Based on your split, you seem to favor {data.muscleSplit.length > 0 ? data.muscleSplit.sort((a, b) => b.value - a.value)[0].name : '...'} exercises.
                    Consider balancing with more opposing muscle groups to prevent injury.
                </p>
            </div>
        </div>
    );
};

export default Analytics;
