import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Legend, CartesianGrid, PieChart, Pie, Cell,
    AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, LineChart
} from 'recharts';
import {
    AlertTriangle, Lightbulb, TrendingUp, Info, CheckCircle2,
    Activity, Scale, Zap, Target, BarChart3, Binary
} from 'lucide-react';
import SegmentedControl from '../components/SegmentedControl';

const FlipCard = ({ title, icon, chart, infoTitle, infoMethod, infoMeaning, footerText }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    return (
        <div className={`flip-card ${isFlipped ? 'is-flipped' : ''}`}>
            <div className="flip-card-inner">
                <div className="flip-card-front glass-panel" style={{ padding: '32px' }}>
                    <button className="info-icon-btn" onClick={() => setIsFlipped(true)}>
                        <Info size={18} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        {icon}
                        <h3 style={{ margin: 0, border: 'none', padding: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {title}
                        </h3>
                    </div>
                    {chart}
                    {footerText && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '16px' }}>
                            {footerText}
                        </p>
                    )}
                </div>
                <div className="flip-card-back glass-panel">
                    <h4>{infoTitle}</h4>
                    <div className="info-section">
                        <span className="info-label">Cómo se obtiene:</span>
                        <p className="info-text">{infoMethod}</p>
                    </div>
                    <div className="info-section">
                        <span className="info-label">Qué significa:</span>
                        <p className="info-text">{infoMeaning}</p>
                    </div>
                    <button className="close-flip-btn" onClick={() => setIsFlipped(false)}>
                        Volver a Gráfica
                    </button>
                </div>
            </div>
        </div>
    );
};

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

    // 2. Relative Strength Process (Radar Chart)
    const radarData = useMemo(() => {
        if (!data || !data.relativeStrength) return [];
        const mapping = {
            'horizontal_push': 'Empuje Horiz.',
            'vertical_push': 'Empuje Vert.',
            'horizontal_pull': 'Tracción Horiz.',
            'vertical_pull': 'Tracción Vert.',
            'knee_dominant': 'Rodilla Dom.',
            'hip_dominant': 'Cadera Dom.'
        };
        return Object.entries(data.relativeStrength).map(([key, val]) => ({
            name: mapping[key] || key,
            value: val,
            fullMark: 2.0 // reference for scale
        }));
    }, [data]);

    // 3. Antagonistic Suggestion Logic (Enhanced)
    const suggestions = useMemo(() => {
        if (!data || !data.muscleSplit) return [];
        const split = {};
        data.muscleSplit.forEach(m => split[m.name] = m.value);

        const insights = [];

        // Push vs Pull
        const push = (split['Pecho'] || 0) + (split['Hombros'] || 0);
        const pull = (split['Espalda'] || 0) + (split['Dorsales'] || 0) + (split['Trapecio'] || 0);

        if (push > 0 && pull > 0) {
            const ratio = push / pull;
            if (ratio > 1.3) {
                insights.push({
                    type: 'warning',
                    title: 'Exceso de Empuje vs Tracción',
                    text: `Tu ratio de empuje (${push}) frente a tracción (${pull}) es de ${ratio.toFixed(2)}.`,
                    suggestion: 'Prioriza ejercicios de tirón horizontal (remos) para equilibrar la salud escapular.'
                });
            }
        }

        // ACWR Check
        if (data.acwr && data.acwr.length > 0) {
            const latestACWR = data.acwr[data.acwr.length - 1].value;
            if (latestACWR > 1.3) {
                insights.push({
                    type: 'warning',
                    title: 'Riesgo de Sobreentrenamiento (ACWR)',
                    text: `Tu ratio de carga aguda:crónica es de ${latestACWR}, indicando un incremento brusco de fatiga.`,
                    suggestion: 'Considera una semana de descarga (deload) para asimilar el volumen acumulado.'
                });
            } else if (latestACWR < 0.8 && latestACWR > 0) {
                insights.push({
                    type: 'info',
                    title: 'Volumen por debajo de capacidad',
                    text: `Tu ACWR (${latestACWR}) sugiere que estás entrenando significativamente menos de lo habitual.`,
                    suggestion: 'Es un buen momento para incrementar la intensidad o el volumen si no estás en fase de descarga.'
                });
            }
        }

        return insights;
    }, [data]);

    if (loading) return <div className="loading" style={{ height: '400px' }}>Calculando métricas avanzadas...</div>;
    if (!data) return <div className="empty-state">No hay datos suficientes para generar el análisis.</div>;

    const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', '#64748b'];

    const PATTERN_COLORS = {
        'horizontal_push': '#ef4444',
        'vertical_push': '#f97316',
        'horizontal_pull': '#3b82f6',
        'vertical_pull': '#06b6d4',
        'knee_dominant': '#10b981',
        'hip_dominant': '#8b5cf6'
    };

    return (
        <div className="analytics-page" style={{ padding: '0 0 80px 0' }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '40px' }}>
                <div>
                    <h2 className="text-gradient">Panel de Inteligencia</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Métricas estratégicas para recomposición y fuerza estructural.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <div style={{
                            padding: '12px 24px',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            minWidth: '160px'
                        }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Hipertrofia Score</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>{data.hypertrophyScore}</span>
                                <small style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>/ 100</small>
                            </div>
                        </div>
                        {data.hypertrophyBreakdown && (
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0, maxWidth: '200px', lineHeight: '1.4' }}>
                                <strong>Cálculo:</strong> Multiplicador de volumen, intensidad y frecuencia frente a meta (20 sets, RPE 9, 5 días).<br />
                                <span style={{ color: 'var(--text-dim)' }}>
                                    Basado en tus <strong>{data.hypertrophyBreakdown.avgSets} sets</strong>, <strong>RPE {data.hypertrophyBreakdown.avgRPE}</strong> y <strong>{data.hypertrophyBreakdown.avgFrequency} entrenos</strong>/semana de media.
                                </span>
                            </p>
                        )}
                    </div>
                    <SegmentedControl
                        small
                        name="analytics_period"
                        options={periodOptions}
                        value={timePeriod}
                        onChange={setTimePeriod}
                    />
                </div>
            </div>

            <div className="analytics-grid">

                {/* section: VOLUME & EFFORT */}
                <div className="analytics-section-title">
                    <TrendingUp size={20} />
                    <span>Progreso y Eficiencia</span>
                </div>

                {/* 1. Volume & RPE Trend */}
                <FlipCard
                    title="Volumen vs Esfuerzo (RPE)"
                    icon={<Activity style={{ color: 'var(--primary)' }} size={24} />}
                    infoTitle="Indice de Carga Peribida"
                    infoMethod="Suma de sets efectivos (RPE > 6) y media aritmética del RPE reportado por semana."
                    infoMeaning="Visualiza si tu incremento de volumen va acompañado de un esfuerzo sostenible o si estás acumulando fatiga excesiva."
                    chart={
                        <div style={{ height: '350px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={data.weeklyVolume}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis yAxisId="right" orientation="right" domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: 'var(--error)', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)' }}
                                        cursor={{ fill: 'var(--chart-grid)' }}
                                    />
                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingBottom: 20 }} />
                                    <Bar yAxisId="left" dataKey="effectiveSets" name="Sets Efectivos" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={30} />
                                    <Line yAxisId="right" type="monotone" dataKey="avgRPE" name="RPE Medio" stroke="var(--error)" strokeWidth={3} dot={{ r: 4, fill: 'var(--error)' }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    }
                />

                {/* New: Movement Pattern Progression */}
                <FlipCard
                    title="Progresión por Patrón (e1RM)"
                    icon={<TrendingUp style={{ color: 'var(--chart-2)' }} size={24} />}
                    infoTitle="Fuerza Estructural"
                    infoMethod="Basado en la fórmula de Brzycki aplicada al mejor set de cada patrón de movimiento semanal."
                    infoMeaning="Indica si estás ganando fuerza real en los movimientos básicos, eliminando la variable del volumen acumulado."
                    chart={
                        <div style={{ height: '350px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.weeklyVolume.map((w, i) => {
                                    const entry = { name: w.name };
                                    Object.keys(data.patternData || {}).forEach(pattern => {
                                        entry[pattern] = data.patternData[pattern][i]?.value || null;
                                    });
                                    return entry;
                                })}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}
                                    />
                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10 }} />
                                    <Line type="monotone" dataKey="horizontal_push" name="Empuje Horiz" stroke={PATTERN_COLORS.horizontal_push} strokeWidth={2} dot={false} connectNulls />
                                    <Line type="monotone" dataKey="horizontal_pull" name="Tracción Horiz" stroke={PATTERN_COLORS.horizontal_pull} strokeWidth={2} dot={false} connectNulls />
                                    <Line type="monotone" dataKey="knee_dominant" name="Rodilla Dom" stroke={PATTERN_COLORS.knee_dominant} strokeWidth={2} dot={false} connectNulls />
                                    <Line type="monotone" dataKey="hip_dominant" name="Cadera Dom" stroke={PATTERN_COLORS.hip_dominant} strokeWidth={2} dot={false} connectNulls />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    }
                />

                {/* 2. Stimulus/Fatigue Ratio (Efficiency Index) */}
                <FlipCard
                    title="Ratio Estímulo / Fatiga"
                    icon={<Zap style={{ color: 'var(--warning)' }} size={24} />}
                    infoTitle="Indice de Eficiencia"
                    infoMethod="Ratio entre Sets Efectivos realizados y el RPE Medio reportado."
                    infoMeaning="Mide cuánto estímulo real generas por cada unidad de fatiga percibida. Un ratio ascendente indica una programación muy eficiente."
                    footerText="Indica cuánto estímulo (sets) generas por cada punto de fatiga (RPE). Mayor es mejor."
                    chart={
                        <div style={{ height: '350px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.weeklyVolume}>
                                    <defs>
                                        <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--warning)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--warning)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)' }}
                                    />
                                    <Area type="monotone" dataKey="efficiencyIndex" name="Indice Eficiencia" stroke="var(--warning)" fillOpacity={1} fill="url(#colorEff)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    }
                />

                {/* New: Training Density */}
                <FlipCard
                    title="Densidad de Entrenamiento"
                    icon={<Activity style={{ color: 'var(--chart-4)' }} size={24} />}
                    infoTitle="Productividad Temporal"
                    infoMethod="Sets efectivos totales realizados divididos por la duración acumulada de las sesiones en minutos."
                    infoMeaning="Mide tu capacidad de trabajo por unidad de tiempo. Mejorar densidad manteniendo rendimiento indica mejoría en la eficiencia metabólica."
                    footerText="Si mejoras densidad manteniendo rendimiento, eres más eficiente metabólicamente."
                    chart={
                        <div style={{ height: '350px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.weeklyVolume}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}
                                    />
                                    <Bar dataKey="density" name="Sets / Minuto" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    }
                />


                {/* section: BODY RECOMP */}
                <div className="analytics-section-title">
                    <Scale size={20} />
                    <span>Recomposición Corporal</span>
                </div>

                {/* 3. Volume vs Body Weight */}
                <FlipCard
                    title="Volumen vs Peso Corporal"
                    icon={<Binary style={{ color: 'var(--success)' }} size={24} />}
                    infoTitle="Correlación de Recomposición"
                    infoMethod="Correlación entre el peso registrado y el volumen total (tonelaje) movilizado semanalmente."
                    infoMeaning="Vital para recomposición. Si el peso baja y el volumen se mantiene o sube, indica que estás perdiendo grasa manteniendo o ganando masa muscular."
                    chart={
                        <div style={{ height: '350px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={data.weeklyVolume}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis yAxisId="left" orientation="left" domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'var(--success)', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)' }}
                                    />
                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingBottom: 20 }} />
                                    <Line yAxisId="left" type="step" dataKey="bodyWeight" name="Peso (kg)" stroke="var(--text-main)" strokeWidth={2} dot={false} />
                                    <Bar yAxisId="right" dataKey="volumeLoad" name="Carga Total (ton)" fill="var(--success)" opacity={0.6} radius={[4, 4, 0, 0]} barSize={20} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    }
                />

                {/* 4. Relative Strength Radar */}
                <FlipCard
                    title="Fuerza Estructural Relativa (e1RM/Peso)"
                    icon={<Target style={{ color: 'var(--chart-5)' }} size={24} />}
                    infoTitle="Potencia Relativa"
                    infoMethod="Tu e1RM calculado dividido por tu peso corporal más reciente en cada patrón de movimiento."
                    infoMeaning="Permite comparar tu fuerza real eliminando la variable del peso. Un ratio de 1.5 en un patrón significa que eres capaz de movilizar 1.5 veces tu peso corporal."
                    chart={
                        <div style={{ height: '350px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid stroke="var(--border-subtle)" />
                                    <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                    <Radar
                                        name="Ratio Fuerza/Peso"
                                        dataKey="value"
                                        stroke="var(--chart-5)"
                                        fill="var(--chart-5)"
                                        fillOpacity={0.6}
                                    />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    }
                />

                {/* section: VOLUME DISTRIBUTION */}
                <div className="analytics-section-title">
                    <BarChart3 size={20} />
                    <span>Distribución de Estímulo</span>
                </div>

                {/* 5. Rep Range Dist (Stacked Bar) */}
                <FlipCard
                    title="Volumen por Rango de Reps"
                    icon={<BarChart3 size={20} style={{ color: 'var(--text-muted)' }} />}
                    infoTitle="Sesgo de Entrenamiento"
                    infoMethod="Agrupación de todas las series realizadas según el número de repeticiones completadas en cada una."
                    infoMeaning="Identifica el enfoque de tu entrenamiento. Fuerza (5-8), Hipertrofia (8-12) o Resistencia Metabólica (12-20)."
                    chart={
                        <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.weeklyVolume}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}
                                        formatter={(value, name) => [value, name]}
                                    />
                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11, paddingBottom: 20 }} />
                                    <Bar dataKey="repRanges.5-8" name="5-8 reps (Fuerza)" stackId="a" fill="#3b82f6" />
                                    <Bar dataKey="repRanges.8-12" name="8-12 reps (Hipertrofia)" stackId="a" fill="#10b981" />
                                    <Bar dataKey="repRanges.12-20" name="12-20 reps (Metabólico)" stackId="a" fill="#f59e0b" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    }
                />

                {/* 6. RIR Distribution */}
                <FlipCard
                    title="Intensidad por Proximidad al Fallo (RIR)"
                    icon={<Target size={20} style={{ color: 'var(--text-muted)' }} />}
                    infoTitle="Proximidad al Fallo"
                    infoMethod="Clasificación de series basada en RPE (RIR 0 = RPE 10, RIR 1-2 = RPE 8-9, RIR 3+ = RPE < 8)."
                    infoMeaning="Muestra cuántas series estás llevando realmente cerca del fallo muscular. Es fundamental para asegurar que el estímulo sea suficiente para el crecimiento."
                    chart={
                        <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.weeklyVolume}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}
                                    />
                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11, paddingBottom: 20 }} />
                                    <Bar dataKey="rirDist.RIR 0" name="Fallo (RIR 0)" stackId="b" fill="#ef4444" />
                                    <Bar dataKey="rirDist.RIR 1-2" name="Efectivo (RIR 1-2)" stackId="b" fill="#3b82f6" />
                                    <Bar dataKey="rirDist.RIR 3+" name="Mantenimiento (3+)" stackId="b" fill="#94a3b8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    }
                />

                {/* section: FATIGUE & RECOVERY */}
                <div className="analytics-section-title">
                    <Activity size={20} />
                    <span>Fatiga y Recuperación</span>
                </div>

                {/* 7. ACWR */}
                <FlipCard
                    title="Ratio de Carga Aguda:Crónica (ACWR)"
                    icon={<Activity size={20} style={{ color: 'var(--text-muted)' }} />}
                    infoTitle="Gestión de Fatiga Profunda"
                    infoMethod="Carga de trabajo de la última semana (Aguda) frente a la media de las últimas 4 semanas (Crónica)."
                    infoMeaning="El 'sweet spot' está entre 0.8 y 1.3. Por encima de 1.5 el riesgo de lesión se multiplica exponencialmente por incapacidad de recuperación."
                    chart={
                        <div style={{ height: '350px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.acwr}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[0.5, 2]} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px' }} />
                                    <Area type="monotone" dataKey="value" name="Ratio ACWR" stroke="var(--error)" fill="var(--error)" fillOpacity={0.1} strokeWidth={3} />
                                    {/* Reference lines for ACWR sweet spot (0.8 - 1.3) */}
                                    <line x1="0%" y1="60%" x2="100%" y2="60%" stroke="#10b981" strokeDasharray="5 5" strokeWidth={1} />
                                    <line x1="0%" y1="40%" x2="100%" y2="40%" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    }
                />

                {/* 8. Anterior vs Posterior Symmetry */}
                <FlipCard
                    title="Simetría Anterior / Posterior (Volumen)"
                    icon={<Activity size={20} style={{ color: 'var(--text-muted)' }} />}
                    infoTitle="Equilibrio de Cadenas"
                    infoMethod="Comparativa del volumen total entre músculos de la cadena anterior (pecho, cuádriceps, hombro ant) vs posterior (espalda, femoral, glúteo)."
                    infoMeaning="Previene desequilibrios posturales y lesiones crónicas por dominancia de una cadena sobre otra. Se busca un balance equilibrado ajustado a tus objetivos."
                    chart={
                        <div style={{ height: '350px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.weeklyVolume}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px' }} />
                                    <Legend verticalAlign="top" height={36} />
                                    <Bar dataKey="anterior" name="Cadena Anterior" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="posterior" name="Cadena Posterior" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    }
                />


                {/* section: MUSCLE SPLIT */}
                <div className="analytics-section-title">
                    <CheckCircle2 size={20} />
                    <span>Balance de Grupos Musculares</span>
                </div>

                {/* 9. Muscle Distribution Pie */}
                <div style={{ gridColumn: 'span 2' }}>
                    <FlipCard
                        title="Balance de Grupos Musculares"
                        icon={<CheckCircle2 size={24} style={{ color: 'var(--chart-1)' }} />}
                        infoTitle="Especialización Muscular"
                        infoMethod="Distribución porcentual del volumen total realizado entre los diferentes grupos musculares."
                        infoMeaning="Muestra qué músculos están recibiendo la mayor atención. Útil para ajustar la carga y priorizar puntos débiles en tu estética corporal."
                        chart={
                            <div style={{ display: 'flex', flexDirection: window.innerWidth < 1000 ? 'column' : 'row', alignItems: 'center', gap: '48px' }}>
                                <div style={{ height: '320px', width: window.innerWidth < 1000 ? '100%' : '50%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={muscleData.chart}
                                                cx="50%" cy="50%"
                                                innerRadius={70}
                                                outerRadius={105}
                                                paddingAngle={4}
                                                dataKey="value"
                                                onClick={(entry) => entry.isOthers && setExpandedOthers(!expandedOthers)}
                                            >
                                                {muscleData.chart.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ outline: 'none' }} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div style={{ width: window.innerWidth < 1000 ? '100%' : '50%', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                    {muscleData.chart.map((item, i) => (
                                        <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', backgroundColor: 'var(--bg-card-hover)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length] }}></div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{item.name}</span>
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>{item.value} <small style={{ fontWeight: 400, opacity: 0.6 }}>sets</small></span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        }
                    />
                </div>

            </div>

            {/* Sugestiones */}
            <div style={{ marginTop: '64px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <Lightbulb style={{ color: 'var(--warning)' }} size={24} />
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 800 }}>Feedback de Biomecánica y Rendimiento</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                    {suggestions.map((s, i) => (
                        <div key={i} className="glass-panel" style={{ padding: '32px', borderLeft: `8px solid ${s.type === 'warning' ? '#ef4444' : 'var(--primary)'}` }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <p style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0, color: 'var(--text-main)' }}>{s.title}</p>
                                <p style={{ fontSize: '1rem', lineHeight: 1.6, margin: 0, color: 'var(--text-muted)' }}>{s.text}</p>
                                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '8px' }}>Plan de Acción</p>
                                    <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', opacity: 0.9 }}>{s.suggestion}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {suggestions.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '40px', border: '2px dashed var(--border-subtle)' }}>
                            <CheckCircle2 color="var(--success)" size={48} style={{ marginBottom: '16px' }} />
                            <h3>Programación Equilibrada</h3>
                            <p color="var(--text-muted)">No hemos detectado riesgos biomecánicos o de sobrecarga fatiga en este periodo.</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .analytics-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 32px;
                }
                .analytics-section-title {
                    grid-column: span 2;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-top: 48px;
                    margin-bottom: 24px;
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: var(--text-main);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                @media (max-width: 1100px) {
                    .analytics-grid { grid-template-columns: 1fr; }
                    .analytics-section-title { grid-column: span 1; }
                    .glass-panel { grid-column: span 1 !important; }
                }
            `}</style>
        </div>
    );
};

export default Analytics;

