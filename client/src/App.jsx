import React from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, TrendingUp, Notebook, BarChart2, MessageSquare, Settings as SettingsIcon, ChevronLeft, Ruler } from 'lucide-react';

import Settings from './pages/Settings';
import './pages/Settings.css';
import './App.css'; // Global Layout Styles

import Coach from './pages/Coach';
import './pages/Coach.css';

import Dashboard from './pages/Dashboard';
import './pages/Dashboard.css';

import Workouts from './pages/Workouts';
import './pages/Workouts.css';

import Progression from './pages/Progression';
import './pages/Progression.css';

import Routines from './pages/Routines';
import './pages/Routines.css';

import Analytics from './pages/Analytics';
import './pages/Analytics.css';

import Measurements from './pages/Measurements';
import './pages/Measurements.css';

// Placeholder Components
// const DashboardPlaceholder = () => <h2>Dashboard</h2>;
// const WorkoutsPlaceholder = () => <h2>Workouts</h2>;
// const ProgressionPlaceholder = () => <h2>Progression</h2>;
// const RoutinesPlaceholder = () => <h2>Rutinas</h2>;
// const AnalyticsPlaceholder = () => <h2>Analytics</h2>;
const CoachAI = Coach;

function App() {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return (
        <Router>
            <div className={`app-container ${isCollapsed ? 'collapsed' : ''}`}>
                <nav className="sidebar">
                    <div className="logo-container">
                        <div className="logo-text">{isCollapsed ? 'HD' : 'HEVY DASH'}</div>
                        {!isCollapsed && <div className="version-text">v4.0.1</div>}
                    </div>

                    <div className="sidebar-nav">
                        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Panel de Control">
                            <LayoutDashboard className="nav-icon" size={22} />
                            {!isCollapsed && <span className="nav-text">Panel de Control</span>}
                        </NavLink>

                        <NavLink to="/workouts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Entrenamientos">
                            <Dumbbell className="nav-icon" size={22} />
                            {!isCollapsed && <span className="nav-text">Entrenamientos</span>}
                        </NavLink>

                        <NavLink to="/progression" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Progresión">
                            <TrendingUp className="nav-icon" size={22} />
                            {!isCollapsed && <span className="nav-text">Progresión</span>}
                        </NavLink>

                        <NavLink to="/routines" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Rutinas">
                            <Notebook className="nav-icon" size={22} />
                            {!isCollapsed && <span className="nav-text">Rutinas</span>}
                        </NavLink>

                        <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Análisis">
                            <BarChart2 className="nav-icon" size={22} />
                            {!isCollapsed && <span className="nav-text">Análisis</span>}
                        </NavLink>

                        <NavLink to="/coach" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Entrenador AI">
                            <MessageSquare className="nav-icon" size={22} />
                            {!isCollapsed && <span className="nav-text">Entrenador AI</span>}
                        </NavLink>

                        <NavLink to="/measurements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Registro">
                            <Ruler className="nav-icon" size={22} />
                            {!isCollapsed && <span className="nav-text">Registro</span>}
                        </NavLink>

                        <div style={{ marginTop: 'auto' }}>
                            <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Ajustes">
                                <SettingsIcon className="nav-icon" size={22} />
                                {!isCollapsed && <span className="nav-text">Ajustes</span>}
                            </NavLink>
                        </div>
                    </div>
                </nav>
                <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
                    <ChevronLeft size={14} />
                </button>
                <main className="content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/workouts" element={<Workouts />} />
                        <Route path="/progression" element={<Progression />} />
                        <Route path="/routines" element={<Routines />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/coach" element={<CoachAI />} />
                        <Route path="/measurements" element={<Measurements />} />
                        <Route path="/settings" element={<Settings />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
