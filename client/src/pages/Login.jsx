import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (email === 'admin' && password === '(MipFirst,,.1)') {
            onLogin();
        } else {
            setError('Credenciales incorrectas');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-logo-container">
                    <img src="/logo.png" alt="Hevy Dash Logo" className="login-logo" />
                </div>
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Usuario</label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Usuario"
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                        />
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    <button type="submit" className="login-btn">
                        Acceder
                    </button>
                    <div className="login-footer">
                        <small>v9.0.0 - Acceso Restringido</small>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
