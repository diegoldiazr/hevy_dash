import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import axios from 'axios';
import { LayoutDashboard, Dumbbell, TrendingUp, Notebook, BarChart2, MessageSquare, Settings as SettingsIcon, ChevronLeft, Ruler, LogOut } from 'lucide-react';

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

import Login from './pages/Login';

import { SyncProvider, useSyncContext } from './context/SyncContext';
import SyncProgressBar from './components/SyncProgressBar';

// Placeholder Components
// const DashboardPlaceholder = () => <h2>Dashboard</h2>;
// const WorkoutsPlaceholder = () => <h2>Workouts</h2>;
// const ProgressionPlaceholder = () => <h2>Progression</h2>;
// const RoutinesPlaceholder = () => <h2>Rutinas</h2>;
// const AnalyticsPlaceholder = () => <h2>Analytics</h2>;
const CoachAI = Coach;

const AutoSyncHandler = ({ isAuthenticated }) => {
    const { startSync, endSync } = useSyncContext();

    useEffect(() => {
        const autoSync = async () => {
            // Check if we've already synced this session
            const hasAutoSynced = sessionStorage.getItem('hasAutoSynced');
            if (hasAutoSynced) return;

            try {
                console.log('Auto-syncing Hevy data (incremental)...');
                startSync('Buscando nuevos entrenamientos...');

                // Use incremental sync for automatic startup
                const response = await axios.post('/api/hevy/sync?fullSync=false');

                sessionStorage.setItem('hasAutoSynced', 'true');
                console.log('Auto-sync completed successfully');

                // Only reload if we actually found new workouts to avoid page flickering
                if (response.data && response.data.workouts && response.data.workouts.synced > 0) {
                    console.log(`Synced ${response.data.workouts.synced} new workouts, reloading...`);
                    window.location.reload();
                }
            } catch (err) {
                console.error('Auto-sync failed:', err);
                // Mark as attempted even on failure to avoid infinite loops if it fails persistently
                sessionStorage.setItem('hasAutoSynced', 'true');
            } finally {
                endSync();
            }
        };

        if (isAuthenticated) {
            autoSync();
        }
    }, [isAuthenticated, startSync, endSync]);

    return null;
};

function App() {
    // Start with sidebar collapsed on mobile devices
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return window.innerWidth <= 768;
    });
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('auth') === 'true';
    });

    const handleLogin = () => {
        localStorage.setItem('auth', 'true');
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('auth');
        setIsAuthenticated(false);
    };

    // Close sidebar when clicking overlay on mobile
    const handleOverlayClick = () => {
        if (window.innerWidth <= 768 && !isCollapsed) {
            setIsCollapsed(true);
        }
    };

    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <SyncProvider>
            <AutoSyncHandler isAuthenticated={isAuthenticated} />
            <SyncProgressBar />
            <Router>
                <div className={`app-container ${isCollapsed ? 'collapsed' : ''}`}>
                    {/* Mobile overlay */}
                    {!isCollapsed && window.innerWidth <= 768 && (
                        <div className="mobile-overlay" onClick={handleOverlayClick}></div>
                    )}
                    <nav className="sidebar">
                        <div className="logo-container">
                            <div className="logo-text">{isCollapsed ? 'HD' : 'HEVY DASH'}</div>
                            <div className="version-text">v8.0.0</div>
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

                            <div className="sidebar-footer" style={{ marginTop: 'auto' }}>
                                <div className="sidebar-big-logo-container">
                                    <img src="/logo.png" alt="Logo" className="sidebar-big-logo" />
                                </div>
                                <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Ajustes">
                                    <SettingsIcon className="nav-icon" size={22} />
                                    <span className="nav-text">Ajustes</span>
                                </NavLink>
                                <button onClick={handleLogout} className="nav-item logout-btn" title="Cerrar Sesión">
                                    <LogOut className="nav-icon" size={22} />
                                    {!isCollapsed && <span className="nav-text">Salida</span>}
                                </button>
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
        </SyncProvider>
    );
}

export default App;
