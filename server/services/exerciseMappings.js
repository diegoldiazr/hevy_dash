const MOVEMENT_PATTERNS = {
    // HORIZONTAL PUSH
    'Bench Press (Barbell)': 'horizontal_push',
    'Bench Press (Dumbbell)': 'horizontal_push',
    'Incline Bench Press (Barbell)': 'horizontal_push',
    'Incline Bench Press (Dumbbell)': 'horizontal_push',
    'Chest Press (Machine)': 'horizontal_push',
    'Incline Chest Press (Machine)': 'horizontal_push',
    'Chest Fly (Machine)': 'horizontal_push',
    'Chest Fly (Dumbbell)': 'horizontal_push',
    'Incline Chest Fly (Dumbbell)': 'horizontal_push',
    'Chest Dip (Assisted)': 'horizontal_push',
    'Chest Dip': 'horizontal_push',
    'Push Up': 'horizontal_push',

    // VERTICAL PUSH
    'Overhead Press (Barbell)': 'vertical_push',
    'Overhead Press (Dumbbell)': 'vertical_push',
    'Shoulder Press (Dumbbell)': 'vertical_push',
    'Shoulder Press (Machine)': 'vertical_push',
    'Seated Shoulder Press (Machine)': 'vertical_push',
    'Arnold Press (Dumbbell)': 'vertical_push',
    'Military Press (Barbell)': 'vertical_push',
    'Lateral Raise (Dumbbell)': 'vertical_push',
    'Lateral Raise (Machine)': 'vertical_push',
    'Front Raise (Dumbbell)': 'vertical_push',

    // HORIZONTAL PULL
    'Bent Over Row (Barbell)': 'horizontal_pull',
    'Dumbbell Row': 'horizontal_pull',
    'Seated Row (Machine)': 'horizontal_pull',
    'Seated Cable Row - Bar Wide Grip': 'horizontal_pull',
    'Seated Cable Row - V Grip (Cable)': 'horizontal_pull',
    'Iso-Lateral Row (Machine)': 'horizontal_pull',
    'One Arm Dumbbell Row': 'horizontal_pull',
    'T-Bar Row': 'horizontal_pull',
    'Face Pull': 'horizontal_pull',
    'Rear Delt Reverse Fly (Machine)': 'horizontal_pull',
    'Rear Delt Fly (Dumbbell)': 'horizontal_pull',

    // VERTICAL PULL
    'Lat Pulldown (Cable)': 'vertical_pull',
    'Lat Pulldown (Machine)': 'vertical_pull',
    'Lat Pulldown - Close Grip (Cable)': 'vertical_pull',
    'Pull Up': 'vertical_pull',
    'Chin Up': 'vertical_pull',
    'Chin Up (Assisted)': 'vertical_pull',
    'Pull Up (Assisted)': 'vertical_pull',

    // KNEE DOMINANT
    'Squat (Barbell)': 'knee_dominant',
    'Squat (Dumbbell)': 'knee_dominant',
    'Leg Press': 'knee_dominant',
    'Leg Press Horizontal (Machine)': 'knee_dominant',
    'Hack Squat': 'knee_dominant',
    'Goblet Squat': 'knee_dominant',
    'Leg Extension (Machine)': 'knee_dominant',
    'Lunge (Dumbbell)': 'knee_dominant',
    'Bulgarian Split Squat': 'knee_dominant',

    // HIP DOMINANT
    'Deadlift (Barbell)': 'hip_dominant',
    'Romanian Deadlift (Barbell)': 'hip_dominant',
    'Romanian Deadlift (Dumbbell)': 'hip_dominant',
    'Deadlift (Dumbbell)': 'hip_dominant',
    'Seated Leg Curl (Machine)': 'hip_dominant',
    'Lying Leg Curl (Machine)': 'hip_dominant',
    'Hip Thrust (Barbell)': 'hip_dominant',
    'Glute Bridge': 'hip_dominant',
    'Hip Abduction (Machine)': 'hip_dominant',
    'Seated Calf Raise': 'hip_dominant',
};

const MUSCLE_TO_SIDE = {
    'Pecho': 'anterior',
    'Hombros': 'anterior',
    'Bíceps': 'anterior',
    'Cuádriceps': 'anterior',
    'Abdominales': 'anterior',
    'Espalda': 'posterior',
    'Isquios': 'posterior',
    'Glúteos': 'posterior',
    'Gemelos': 'posterior',
    'Trapecio': 'posterior',
    'Dorsales': 'posterior',
    'Tríceps': 'posterior',
    'Lumbar': 'posterior'
};

const ANTAGONISTS = {
    'Pecho': 'Espalda',
    'Espalda': 'Pecho',
    'Bíceps': 'Tríceps',
    'Tríceps': 'Bíceps',
    'Cuádriceps': 'Isquios',
    'Isquios': 'Cuádriceps'
};

const getPattern = (exerciseName) => {
    if (MOVEMENT_PATTERNS[exerciseName]) return MOVEMENT_PATTERNS[exerciseName];

    // Fallback search
    const lower = exerciseName.toLowerCase();
    if (lower.includes('bench press') || lower.includes('chest press')) return 'horizontal_push';
    if (lower.includes('overhead press') || lower.includes('shoulder press')) return 'vertical_push';
    if (lower.includes('row')) return 'horizontal_pull';
    if (lower.includes('pulldown') || lower.includes('pull up') || lower.includes('chin up')) return 'vertical_pull';
    if (lower.includes('squat') || lower.includes('leg press') || lower.includes('leg extension')) return 'knee_dominant';
    if (lower.includes('deadlift') || lower.includes('leg curl') || lower.includes('hip thrust')) return 'hip_dominant';

    return null;
};

module.exports = {
    MOVEMENT_PATTERNS,
    MUSCLE_TO_SIDE,
    ANTAGONISTS,
    getPattern
};
