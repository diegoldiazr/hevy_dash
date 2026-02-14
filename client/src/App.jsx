import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, TrendingUp, Notebook, BarChart2, MessageSquare, Settings as SettingsIcon } from 'lucide-react';

import Settings from './pages/Settings';
import './pages/Settings.css';

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

// Placeholder Components
// const DashboardPlaceholder = () => <h2>Dashboard</h2>;
// const WorkoutsPlaceholder = () => <h2>Workouts</h2>;
// const ProgressionPlaceholder = () => <h2>Progression</h2>;
// const RoutinesPlaceholder = () => <h2>Routines</h2>;
// const AnalyticsPlaceholder = () => <h2>Analytics</h2>;
const CoachAI = Coach;

function App() {
    return (
        <Router>
            <div className="app-container">
                <nav className="sidebar">
                    <div className="logo">HevyDash</div>
                    <ul className="nav-links">
                        <li><Link to="/"><LayoutDashboard size={20} /> Dashboard</Link></li>
                        <li><Link to="/workouts"><Dumbbell size={20} /> Workouts</Link></li>
                        <li><Link to="/progression"><TrendingUp size={20} /> Progression</Link></li>
                        <li><Link to="/routines"><Notebook size={20} /> Routines</Link></li>
                        <li><Link to="/analytics"><BarChart2 size={20} /> Analytics</Link></li>
                        <li><Link to="/coach"><MessageSquare size={20} /> Coach AI</Link></li>
                        <li className="settings-link"><Link to="/settings"><SettingsIcon size={20} /> Settings</Link></li>
                    </ul>
                </nav>
                <main className="content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/workouts" element={<Workouts />} />
                        <Route path="/progression" element={<Progression />} />
                        <Route path="/routines" element={<Routines />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/coach" element={<CoachAI />} />
                        <Route path="/settings" element={<Settings />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
