import { startOfWeek, format, parseISO } from 'date-fns';

/**
 * Calculates effective volume per week and muscle group.
 * 
 * @param {Array} workouts Array of workout objects with raw_data
 * @returns {Array} Formatted data for Recharts
 */
export const calculateEffectiveVolume = (workouts) => {
    if (!workouts || !workouts.length) return [];

    // 1. Calculate historical max E1RM per exercise
    const exerciseMaxE1RM = {};

    // Sort workouts oldest to newest to potentially track 1RM over time, 
    // but the request says "historical 1RM", so we'll find the global max first.
    workouts.forEach(workout => {
        const raw = workout.raw_data;
        if (!raw || !raw.exercises) return;

        raw.exercises.forEach(ex => {
            const exerciseTitle = ex.title;
            if (!exerciseMaxE1RM[exerciseTitle]) exerciseMaxE1RM[exerciseTitle] = 0;

            if (ex.sets) {
                ex.sets.forEach(set => {
                    if (set.weight_kg && set.reps) {
                        const e1rm = set.weight_kg * (1 + (set.reps / 30));
                        if (e1rm > exerciseMaxE1RM[exerciseTitle]) {
                            exerciseMaxE1RM[exerciseTitle] = e1rm;
                        }
                    }
                });
            }
        });
    });

    // 2. Muscle Group Mapping
    const muscleMap = {
        'chest': 'Pecho',
        'back': 'Espalda',
        'lats': 'Espalda',
        'traps': 'Espalda',
        'lower_back': 'Espalda',
        'quadriceps': 'Cuádriceps',
        'quads': 'Cuádriceps',
        'hamstrings': 'Isquios',
        'shoulders': 'Deltoides'
    };

    // 3. Process workouts into weekly buckets
    const weeklyData = {}; // key: 'YYYY-WW', value: { weekLabel: '...', Pecho: 0, ... }

    workouts.forEach(workout => {
        const raw = workout.raw_data;
        if (!raw || !raw.exercises) return;

        const date = parseISO(workout.start_time);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd'); // Use start of week date as key

        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
                date: weekKey,
                label: `Semana ${format(weekStart, 'dd/MM')}`,
                Pecho: 0,
                Espalda: 0,
                Cuádriceps: 0,
                Isquios: 0,
                Deltoides: 0
            };
        }

        raw.exercises.forEach(ex => {
            const muscleGroup = muscleMap[ex.primary_muscle_group] || null;
            if (!muscleGroup) return;

            if (ex.sets) {
                ex.sets.forEach(set => {
                    // Discard warmups
                    if (set.type === 'warmup') return;

                    let isEffective = false;

                    // Criteria (a): RPE >= 7
                    if (set.rpe && set.rpe >= 7) {
                        isEffective = true;
                    }
                    // Criteria (b): No RPE + weight > 65% of max E1RM
                    else if (!set.rpe) {
                        const maxE1RM = exerciseMaxE1RM[ex.title] || 0;
                        if (maxE1RM > 0 && set.weight_kg > (maxE1RM * 0.65)) {
                            isEffective = true;
                        }
                    }

                    if (isEffective) {
                        weeklyData[weekKey][muscleGroup]++;
                    }
                });
            }
        });
    });

    // Convert to array and sort by date
    return Object.values(weeklyData).sort((a, b) => a.date.localeCompare(b.date));
};
