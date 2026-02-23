import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Legend, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { AlertTriangle, Lightbulb, TrendingUp, Info, CheckCircle2 } from 'lucide-react';
import SegmentedControl from '../components/SegmentedControl';

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timePeriod, setTimePeriod] = useState('all');
    const [expandedOthers, setExpandedOthers] = useState(false);

    const periodOptions = [
        { label: 'Mes', value: 'month' },
        { label: 'Año', value: 'year' },
        { label: 'Historial', value: 'all' }
    ];

    useEffect(() => {
        fetchAnalytics();
    }, [timePeriod]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/analytics?period=${timePeriod}`);
            setData(res.data);
        } catch (err) {
            console.error("Failed to load analytics", err);
        } finally {
            setLoading(false);
        }
    };

    // 1. Process Muscle Split Grouping
    const muscleData = useMemo(() => {
        if (!data || !data.muscleSplit) return { chart: [], others: [] };

        const sorted = [...data.muscleSplit];
        const top5 = sorted.slice(0, 5);
        const others = sorted.slice(5);

        const chart = [...top5];
        if (others.length > 0) {
            chart.push({
                name: 'Otros',
                value: others.reduce((acc, curr) => acc + curr.value, 0),
                isOthers: true
            });
        }

        return { chart, others };
    }, [data]);

    // 2. Antagonistic Suggestion Logic
    const suggestions = useMemo(() => {
        if (!data || !data.muscleSplit) return [];
        const split = {};
        data.muscleSplit.forEach(m => split[m.name] = m.value);

        const insights = [];

        // Push vs Pull (Simplified as Chest+Shoulders vs Back)
        const push = (split['Pecho'] || 0) + (split['Hombros'] || 0);
        const pull = (split['Espalda'] || 0) + (split['Dorsales'] || 0) + (split['Trapecio'] || 0);

        if (push > 0 && pull > 0) {
            const ratio = push / pull;
            if (ratio > 1.25) {
                insights.push({
                    type: 'warning',
                    title: 'Desequilibrio Empuje/Tracción',
                    text: `Has acumulado ${push} series de empuje y solo ${pull} de tracción (Ratio ${ratio.toFixed(2)}).`,
                    suggestion: 'Añade 3-4 series de Face Pulls o Remos en tu próximo entrenamiento para prevenir lesiones de hombro y mejorar la postura.'
                });
            } else if (pull > 1.25 * push) {
                insights.push({
                    type: 'info',
                    title: 'Dominancia Posterior',
                    text: 'Buen trabajo en la cadena posterior. Relativamente, tu volumen de tracción es muy superior al de empuje.',
                    suggestion: 'Si tu objetivo es estético, asegúrate de no estar descuidando el progreso en press de banca o press militar.'
                });
            }
        }

        // Quads vs Hams
        const quads = split['Cuádriceps'] || 0;
        const hams = split['Isquios'] || 0;
        if (quads > 0 && hams > 0 && quads > 1.3 * hams) {
            insights.push({
                type: 'warning',
                title: 'Desequilibrio en Piernas',
                text: `El volumen de Cuádriceps (${quads}) es significativamente mayor que el de Isquios (${hams}).`,
                suggestion: 'Añade un ejercicio adicional de flexión de rodilla (Leg Curl) o Peso Muerto Rumano para equilibrar la articulación de la rodilla.'
            });
        }

        return insights;
    }, [data]);

    if (loading) return <div className="loading" style={{ height: '400px' }}>Cargando Análisis de Biomecánica...</div>;
    if (!data) return <div className="empty-state">No hay datos suficientes para generar el análisis detallado.</div>;

    // Use app-wide chart colors
    const COLORS = [
        'var(--chart-1)',
        'var(--chart-2)',
        'var(--chart-3)',
        'var(--chart-4)',
        'var(--chart-5)',
        'var(--chart-6)',
        '#64748b' // Neutral color for "Others"
    ];

    return (
        <div className="analytics-page" style={{ padding: '0 0 40px 0' }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '32px' }}>
                <div>
                    <h2 className="text-gradient">Análisis de Hipertrofia</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Optimización de volumen y prevención de desequilibrios.</p>
                </div>
                <SegmentedControl
                    options={periodOptions}
                    value={timePeriod}
                    onChange={setTimePeriod}
                />
            </div>

            <div className="analytics-grid">
                {/* 1. Volume & RPE Trend */}
                <div className="glass-panel" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <TrendingUp style={{ color: 'var(--primary)' }} size={24} />
                        <h3 style={{ margin: 0, border: 'none', padding: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Tendencia: Volumen vs Esfuerzo
                        </h3>
                    </div>

                    <div style={{ height: '350px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.weeklyVolume}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    yAxisId="left"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    label={{ value: 'Sets Efectivos', angle: -90, position: 'insideLeft', offset: 10, style: { fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 } }}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    domain={[5, 10]}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--error)', fontSize: 12 }}
                                    label={{ value: 'RPE Medio', angle: 90, position: 'insideRight', offset: 10, style: { fill: 'var(--error)', fontSize: 10, fontWeight: 700 } }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border-subtle)',
                                        boxShadow: 'var(--shadow-lg)'
                                    }}
                                    itemStyle={{ color: 'var(--text-main)' }}
                                    labelStyle={{ color: 'var(--text-main)' }}
                                    cursor={{ fill: 'var(--chart-grid)' }}
                                />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingBottom: 20 }} />
                                <Bar
                                    yAxisId="left"
                                    dataKey="effectiveSets"
                                    name="Sets Efectivos"
                                    fill="var(--primary)"
                                    radius={[6, 6, 0, 0]}
                                    barSize={40}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="avgRPE"
                                    name="Esfuerzo (RPE)"
                                    stroke="var(--error)"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: 'var(--error)', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Muscle Distribution */}
                <div className="glass-panel" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <Info style={{ color: 'var(--success)' }} size={24} />
                        <h3 style={{ margin: 0, border: 'none', padding: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Balance Muscular (Sets)
                        </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', alignItems: 'center', gap: '32px' }}>
                        <div style={{ height: '300px', width: window.innerWidth < 768 ? '100%' : '50%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={muscleData.chart}
                                        cx="50%" cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={4}
                                        dataKey="value"
                                        onClick={(entry) => entry.isOthers && setExpandedOthers(!expandedOthers)}
                                    >
                                        {muscleData.chart.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                                className={entry.isOthers ? 'cursor-pointer' : ''}
                                                style={{ outline: 'none' }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--bg-card)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-subtle)',
                                            boxShadow: 'var(--shadow-lg)'
                                        }}
                                        itemStyle={{ color: 'var(--text-main)' }}
                                        labelStyle={{ color: 'var(--text-main)' }}
                                        formatter={(val, name, props) => [
                                            `${val} sets`,
                                            props.payload.isOthers && expandedOthers ? 'Ver desglose lateral' : name
                                        ]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ width: window.innerWidth < 768 ? '100%' : '50%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {muscleData.chart.map((item, i) => (
                                <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>{item.name}</span>
                                    </div>
                                    <span style={{ fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: 'var(--text-main)' }}>
                                        {item.value} <small style={{ color: 'var(--text-dim)', fontWeight: 400 }}>sets</small>
                                    </span>
                                </div>
                            ))}
                            {expandedOthers && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '16px',
                                    backgroundColor: 'var(--bg-card-hover)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                                        Grupos Menores
                                    </p>
                                    {muscleData.others.map(m => (
                                        <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{m.name}</span>
                                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{m.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Suggestion Engine */}
            <div style={{ marginTop: '48px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <Lightbulb style={{ color: 'var(--warning)' }} size={24} />
                    <h3 style={{ margin: 0, border: 'none', padding: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1rem', color: 'var(--text-main)', fontWeight: 800 }}>
                        Feedback de Biomecánica
                    </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                    {suggestions.length > 0 ? suggestions.map((s, i) => (
                        <div
                            key={i}
                            className="glass-panel"
                            style={{
                                padding: '24px',
                                borderLeft: `4px solid ${s.type === 'warning' ? 'var(--warning)' : 'var(--primary)'}`,
                                transition: 'transform 0.2s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                {s.type === 'warning' ? <AlertTriangle style={{ color: 'var(--warning)', flexShrink: 0 }} size={20} /> : <Info style={{ color: 'var(--primary)', flexShrink: 0 }} size={20} />}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <p style={{ fontWeight: 800, fontSize: '1rem', margin: 0, color: 'var(--text-main)' }}>{s.title}</p>
                                    <p style={{ fontSize: '0.95rem', lineHeight: 1.5, margin: 0, color: 'var(--text-muted)' }}>{s.text}</p>
                                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                                        <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '4px' }}>Recomendación</p>
                                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', fontStyle: 'italic' }}>
                                            "{s.suggestion}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{
                            gridColumn: '1 / -1',
                            padding: '48px',
                            textAlign: 'center',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '32px',
                            border: '1px dashed var(--border-subtle)'
                        }}>
                            <div style={{ display: 'inline-flex', padding: '16px', backgroundColor: 'rgba(61, 214, 140, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
                                <CheckCircle2 style={{ color: 'var(--success)' }} size={40} />
                            </div>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px 0' }}>Equilibrio Muscular Óptimo</h4>
                            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto', fontSize: '0.95rem' }}>
                                No hemos detectado desequilibrios significativos entre grupos antagonistas. ¡Buen trabajo con la programación!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
