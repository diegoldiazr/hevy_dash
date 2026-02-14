const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const settingsRoutes = require('./routes/settings');
const hevyRoutes = require('./routes/hevy');
const chatRoutes = require('./routes/chat');
const statsRoutes = require('./routes/stats');
const workoutRoutes = require('./routes/workouts');
const exerciseRoutes = require('./routes/exercises');
const routineRoutes = require('./routes/routines');
const analyticsRoutes = require('./routes/analytics');

app.use('/api/settings', settingsRoutes);
app.use('/api/hevy', hevyRoutes);
app.use('/api/ai', chatRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Hevy Dashboard API is running' });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
