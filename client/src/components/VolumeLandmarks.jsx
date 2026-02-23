import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Cell, LabelList
} from 'recharts';

const VolumeLandmarks = ({ effectiveVolumeData, period, onPeriodChange }) => {
    // Process data based on period
    const chartData = useMemo(() => {
        if (!effectiveVolumeData || effectiveVolumeData.length === 0) return [];

        const muscleGroups = ['Pecho', 'Espalda', 'Cuádriceps', 'Isquios', 'Deltoides'];
        let relevantWeeks = [];

        if (period === 'month') {
            // Last 4 weeks
            relevantWeeks = effectiveVolumeData.slice(-4);
        } else if (period === 'year') {
            // All weeks of current year
            const currentYear = new Date().getFullYear().toString();
            relevantWeeks = effectiveVolumeData.filter(w => w.date.startsWith(currentYear));
        } else {
            // All historical data
            relevantWeeks = effectiveVolumeData;
        }

        if (relevantWeeks.length === 0) return [];

        // Calculate average per muscle group across relevant weeks
        return muscleGroups.map(muscle => {
            const sum = relevantWeeks.reduce((acc, week) => acc + (week[muscle] || 0), 0);
            return {
                name: muscle,
                value: Math.round((sum / relevantWeeks.length) * 10) / 10
            };
        });
    }, [effectiveVolumeData, period]);

    const MEV = 8;
    const MRV = 20;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const val = payload[0].value;
            let status = 'Mantenimiento';
            let statusColor = 'var(--text-muted)';

            if (val >= MRV) {
                status = 'RIESGO SOBREENTRENAMIENTO';
                statusColor = '#ff5c5c';
            } else if (val >= MEV) {
                status = 'Volumen Efectivo';
                statusColor = '#3dd68c';
            } else if (val > 0) {
                status = 'Bajo el MEV';
                statusColor = '#ffc940';
            }

            return (
                <div className="glass-panel" style={{ padding: '12px', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{label}</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 800, margin: '4px 0', color: payload[0].fill }}>
                        {val} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>sets/semanales (media)</span>
                    </p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor, textTransform: 'uppercase' }}>
                        {status}
                    </p>
                </div>
            );
        }
        return null;
    };

    const PeriodSelector = ({ current, onChange }) => (
        <div className="period-selector mini" style={{ marginBottom: 0 }}>
            <button className={`period-btn ${current === 'month' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onChange('month'); }}>Mes</button>
            <button className={`period-btn ${current === 'year' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onChange('year'); }}>Año</button>
            <button className={`period-btn ${current === 'all' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onChange('all'); }}>Todo</button>
        </div>
    );

    return (
        <div className="volume-landmarks-card glass-panel" style={{ padding: '24px', height: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Hitos de Volumen Semanal</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Media de series efectivas por semana en el periodo seleccionado.
                    </p>
                </div>
                <PeriodSelector current={period} onChange={onPeriodChange} />
            </div>

            {chartData.length === 0 ? (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p className="text-muted">No hay datos para este periodo.</p>
                </div>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height="70%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                domain={[0, Math.max(25, ...chartData.map(d => d.value + 5))]}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />

                            <ReferenceLine
                                y={MEV}
                                stroke="#3dd68c"
                                strokeDasharray="5 5"
                                label={{ value: 'MEV', position: 'right', fill: '#3dd68c', fontSize: 10, fontWeight: 700 }}
                            />

                            <ReferenceLine
                                y={MRV}
                                stroke="#ff5c5c"
                                strokeDasharray="5 5"
                                label={{ value: 'MRV', position: 'right', fill: '#ff5c5c', fontSize: 10, fontWeight: 700 }}
                            />

                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.value >= MRV ? '#ef4444' : 'var(--primary)'}
                                        style={{
                                            filter: entry.value >= MRV ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))' : 'none'
                                        }}
                                    />
                                ))}
                                <LabelList dataKey="value" position="top" fill="var(--text-muted)" fontSize={11} offset={10} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }}></div>
                            <span>Volumen Normal</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}></div>
                            <span>Riesgo Sobreentrenamiento (&gt;MRV)</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default VolumeLandmarks;
