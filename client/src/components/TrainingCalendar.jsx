import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    startOfYear,
    endOfYear,
    subYears,
    isWithinInterval
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import './TrainingCalendar.css';

const TrainingCalendar = () => {
    const [view, setView] = useState('month'); // 'month', 'year', 'lastYear'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [workoutDates, setWorkoutDates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCalendarData = async () => {
            try {
                const res = await axios.get('/api/stats/calendar');
                setWorkoutDates(res.data.map(d => ({
                    date: new Date(d.date),
                    count: d.count
                })));
            } catch (error) {
                console.error("Failed to fetch calendar data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCalendarData();
    }, []);

    const hasWorkout = (day) => {
        return workoutDates.some(wd => isSameDay(wd.date, day));
    };

    const renderMonthView = (date) => {
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="month-grid">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                    <div key={d} className="weekday-label">{d}</div>
                ))}
                {calendarDays.map((day, i) => {
                    const active = hasWorkout(day);
                    const isInMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={i}
                            className={`calendar-day ${!isInMonth ? 'outside' : ''} ${active ? 'has-workout' : ''} ${isToday ? 'today' : ''}`}
                            title={active ? `Entrenamiento el ${format(day, 'PP', { locale: es })}` : ''}
                        >
                            <span className="day-number">{format(day, 'd')}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderYearHeatmap = (yearDate) => {
        const yearStart = startOfYear(yearDate);
        const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

        return (
            <div className="year-heatmap">
                {months.map((month, idx) => {
                    const days = eachDayOfInterval({
                        start: startOfMonth(month),
                        end: endOfMonth(month)
                    });
                    const workoutCount = workoutDates.filter(wd => isSameMonth(wd.date, month)).length;

                    return (
                        <div key={idx} className="month-mini-card">
                            <span className="month-name">{format(month, 'MMM', { locale: es })}</span>
                            <div className="mini-grid">
                                {days.map((day, di) => (
                                    <div
                                        key={di}
                                        className={`mini-day ${hasWorkout(day) ? 'active' : ''}`}
                                    />
                                ))}
                            </div>
                            {workoutCount > 0 && <span className="workout-badge">{workoutCount}</span>}
                        </div>
                    );
                })}
            </div>
        );
    };

    const next = () => {
        if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    };

    const prev = () => {
        if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    };

    return (
        <div className="training-calendar-card">
            <div className="calendar-header">
                <div className="header-left">
                    <CalendarIcon size={18} className="icon" />
                    <h3>Frecuencia de Entrenamiento</h3>
                </div>
                <div className="view-switcher">
                    <button
                        className={view === 'month' ? 'active' : ''}
                        onClick={() => { setView('month'); setCurrentDate(new Date()); }}
                    >Mes</button>
                    <button
                        className={view === 'year' ? 'active' : ''}
                        onClick={() => { setView('year'); setCurrentDate(new Date()); }}
                    >Año</button>
                    <button
                        className={view === 'lastYear' ? 'active' : ''}
                        onClick={() => { setView('lastYear'); setCurrentDate(subYears(new Date(), 1)); }}
                    >Año Pasado</button>
                </div>
            </div>

            <div className="calendar-body">
                {view === 'month' && (
                    <div className="month-navigator">
                        <button onClick={prev}><ChevronLeft size={20} /></button>
                        <span className="current-month-label">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button onClick={next}><ChevronRight size={20} /></button>
                    </div>
                )}

                {view === 'month' ? renderMonthView(currentDate) : renderYearHeatmap(currentDate)}
            </div>

            <div className="calendar-footer">
                <div className="legend">
                    <div className="legend-item">
                        <span className="dot active"></span>
                        <span>Entrenado</span>
                    </div>
                    <div className="legend-item">
                        <span className="dot today"></span>
                        <span>Hoy</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrainingCalendar;
