import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Legend, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { AlertTriangle, Lightbulb, TrendingUp, Info, CheckCircle2 } from 'lucide-react';

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timePeriod, setTimePeriod] = useState('all');
    const [expandedOthers, setExpandedOthers] = useState(false);

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

    if (loading) return <div className="flex items-center justify-center min-h-[400px] text-zinc-500 font-medium">Cargando Análisis de Biomecánica...</div>;
    if (!data) return <div className="p-8 text-center text-zinc-400">No hay datos suficientes para generar el análisis detallado.</div>;

    const COLORS = ['#5865f2', '#3dd68c', '#ffc940', '#ff5c5c', '#a78bfa', '#3f3f46'];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        Análisis de Hipertrofia
                    </h2>
                    <p className="mt-2 text-zinc-400">Optimización de volumen y prevención de desequilibrios.</p>
                </div>
                <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-start">
                    {['month', 'year', 'all'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setTimePeriod(p)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${timePeriod === p
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-zinc-500 hover:text-white'
                                }`}
                        >
                            {p === 'month' ? 'Mes' : p === 'year' ? 'Año' : 'Historial'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Volume & RPE Trend */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-xl shadow-indigo-500/5 border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <TrendingUp className="text-indigo-600 dark:text-indigo-400" size={20} />
                        </div>
                        <h3 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Tendencia: Volumen vs Esfuerzo</h3>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.weeklyVolume}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717a', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    yAxisId="left"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717a', fontSize: 12 }}
                                    label={{ value: 'Sets Efectivos', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#71717a', fontSize: 10, fontWeight: 700 } }}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    domain={[5, 10]}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#ff5c5c', fontSize: 12 }}
                                    label={{ value: 'RPE Medio', angle: 90, position: 'insideRight', offset: 10, style: { fill: '#ff5c5c', fontSize: 10, fontWeight: 700 } }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingBottom: 20 }} />
                                <Bar
                                    yAxisId="left"
                                    dataKey="effectiveSets"
                                    name="Sets Efectivos"
                                    fill="#5865f2"
                                    radius={[6, 6, 0, 0]}
                                    barSize={40}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="avgRPE"
                                    name="Esfuerzo (RPE)"
                                    stroke="#ff5c5c"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#ff5c5c', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Muscle Distribution */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-xl shadow-indigo-500/5 border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                                <Info className="text-emerald-600 dark:text-emerald-400" size={20} />
                            </div>
                            <h3 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Balance Muscular (Sets)</h3>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="h-[300px] w-full md:w-1/2">
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
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val, name, props) => [
                                            `${val} sets`,
                                            props.payload.isOthers && expandedOthers ? 'Ver desglose abajo' : name
                                        ]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="w-full md:w-1/2 space-y-4">
                            {muscleData.chart.map((item, i) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{item.value} <small className="text-zinc-400">sets</small></span>
                                </div>
                            ))}
                            {expandedOthers && (
                                <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700 space-y-2 animate-in slide-in-from-top-2">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Desglose de Grupos Menores</p>
                                    {muscleData.others.map(m => (
                                        <div key={m.name} className="flex justify-between text-xs">
                                            <span className="text-zinc-500">{m.name}</span>
                                            <span className="font-bold">{m.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Suggestion Engine */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                        <Lightbulb className="text-amber-600 dark:text-amber-400" size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">Feedback de Biomecánica</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suggestions.length > 0 ? suggestions.map((s, i) => (
                        <div
                            key={i}
                            className={`p-6 rounded-3xl border transition-all hover:scale-[1.02] ${s.type === 'warning'
                                    ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-700/30 text-amber-900 dark:text-amber-100'
                                    : 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200/50 dark:border-indigo-700/30 text-indigo-900 dark:text-indigo-100'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                {s.type === 'warning' ? <AlertTriangle className="flex-shrink-0 text-amber-600 mt-1" size={18} /> : <Info className="flex-shrink-0 text-indigo-600 mt-1" size={18} />}
                                <div className="space-y-2">
                                    <p className="font-bold text-sm tracking-tight">{s.title}</p>
                                    <p className="text-sm opacity-80 leading-relaxed">{s.text}</p>
                                    <div className="mt-4 pt-4 border-t border-current/10">
                                        <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Recomendación</p>
                                        <p className="text-sm font-semibold italic">"{s.suggestion}"</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full p-12 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-[40px] border border-dashed border-zinc-200 dark:border-zinc-800">
                            <div className="p-4 bg-emerald-100 dark:bg-emerald-900/20 rounded-full inline-flex mb-4">
                                <CheckCircle2 className="text-emerald-600" size={40} />
                            </div>
                            <h4 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Arquitectura Muscular Equilibrada</h4>
                            <p className="text-zinc-400 max-w-sm mx-auto mt-2">No hemos detectado desequilibrios significativos entre grupos antagonistas. ¡Sigue así!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
