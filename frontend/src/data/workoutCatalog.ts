export interface WorkoutCatalogItem {
  id: string;
  title: string;
  image: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  focus: string;
  description: string;
  exercises: string[];
  aliases: string[];
}

function workoutImage(filename: string) {
  return `/workouts/${filename.split('/').map(encodeURIComponent).join('/')}`;
}

export const WORKOUT_CATALOG: WorkoutCatalogItem[] = [
  {
    id: 'chest',
    title: 'Chest',
    image: workoutImage('chest.png'),
    level: 'Intermediate',
    duration: '45–55 min',
    focus: 'Pectorals, anterior delts, triceps',
    description:
      'Build a stronger, fuller chest with pressing and fly movements. This session targets the upper, mid, and lower chest for balanced development and pushing power.',
    exercises: ['Bench press', 'Incline dumbbell press', 'Cable flyes', 'Push-ups'],
    aliases: ['chest', 'pec', 'push'],
  },
  {
    id: 'back',
    title: 'Back',
    image: workoutImage('back.png'),
    level: 'Intermediate',
    duration: '50–60 min',
    focus: 'Lats, rhomboids, rear delts, traps',
    description:
      'Develop width and thickness through rows and pulldowns. A strong back improves posture, pulling strength, and overall upper-body balance.',
    exercises: ['Lat pulldown', 'Barbell row', 'Seated cable row', 'Face pulls'],
    aliases: ['back', 'lat', 'pull'],
  },
  {
    id: 'shoulder',
    title: 'Shoulders',
    image: workoutImage('shoulder.png'),
    level: 'Intermediate',
    duration: '40–50 min',
    focus: 'Deltoids, rotator cuff stability',
    description:
      'Sculpt strong, mobile shoulders with overhead pressing and lateral raises. Emphasis on controlled reps to protect the joint while building size.',
    exercises: ['Overhead press', 'Lateral raises', 'Arnold press', 'Rear delt fly'],
    aliases: ['shoulder', 'delt', 'overhead'],
  },
  {
    id: 'biceps',
    title: 'Biceps',
    image: workoutImage('biceps.png'),
    level: 'Beginner',
    duration: '35–45 min',
    focus: 'Biceps brachii, brachialis',
    description:
      'Isolate the arms with curls and hammer variations for peak contraction. Pair with back training or use as a dedicated arm day finisher.',
    exercises: ['Barbell curl', 'Incline dumbbell curl', 'Hammer curls', 'Cable curls'],
    aliases: ['bicep', 'biceps', 'arm curl'],
  },
  {
    id: 'forearm',
    title: 'Forearms',
    image: workoutImage('forearm.png'),
    level: 'Beginner',
    duration: '25–35 min',
    focus: 'Forearm flexors, extensors, grip',
    description:
      'Improve grip strength and forearm endurance for better lifts and daily function. Short, high-rep sets with wrist curls and holds.',
    exercises: ['Wrist curls', 'Reverse wrist curls', 'Farmer carries', 'Dead hangs'],
    aliases: ['forearm', 'grip', 'wrist'],
  },
  {
    id: 'abs-core',
    title: 'Abs & Core',
    image: workoutImage('abs and core.png'),
    level: 'Beginner',
    duration: '30–40 min',
    focus: 'Rectus abdominis, obliques, deep core',
    description:
      'Strengthen the entire core for stability, posture, and athletic performance. Mix anti-extension, rotation, and flexion patterns.',
    exercises: ['Planks', 'Cable crunches', 'Hanging leg raises', 'Pallof press'],
    aliases: ['abs', 'core', 'abdominal'],
  },
  {
    id: 'leg',
    title: 'Legs',
    image: workoutImage('leg.png'),
    level: 'Advanced',
    duration: '55–70 min',
    focus: 'Quads, hamstrings, adductors',
    description:
      'A complete lower-body session for strength and muscle. Squat and hinge patterns build powerful legs and support total-body performance.',
    exercises: ['Back squat', 'Romanian deadlift', 'Leg press', 'Walking lunges'],
    aliases: ['leg', 'legs', 'quad', 'hamstring'],
  },
  {
    id: 'glutes',
    title: 'Glutes',
    image: workoutImage('glutes.png'),
    level: 'Intermediate',
    duration: '40–50 min',
    focus: 'Glute max, medius, hip extension',
    description:
      'Activate and grow the glutes with hip thrusts, bridges, and unilateral work. Great for aesthetics, running power, and lower-back support.',
    exercises: ['Hip thrust', 'Bulgarian split squat', 'Cable kickbacks', 'Glute bridge'],
    aliases: ['glute', 'glutes', 'hip'],
  },
  {
    id: 'calves',
    title: 'Calves',
    image: workoutImage('calves.png'),
    level: 'Beginner',
    duration: '20–30 min',
    focus: 'Gastrocnemius, soleus',
    description:
      'Target both standing and seated calf raises for complete lower-leg development. Consistent volume helps ankle stability and sprint mechanics.',
    exercises: ['Standing calf raise', 'Seated calf raise', 'Single-leg calf raise', 'Jump rope'],
    aliases: ['calf', 'calves'],
  },
  {
    id: 'lower-back',
    title: 'Lower Back',
    image: workoutImage('lower back.png'),
    level: 'Beginner',
    duration: '30–40 min',
    focus: 'Erector spinae, spinal stability',
    description:
      'Build a resilient lower back with extensions and bracing drills. Focus on form and progressive loading to reduce injury risk.',
    exercises: ['Back extensions', 'Bird dogs', 'Superman holds', 'Good mornings'],
    aliases: ['lower back', 'erector', 'spine'],
  },
  {
    id: 'cardio',
    title: 'Cardio',
    image: workoutImage('cardio.png'),
    level: 'Beginner',
    duration: '25–45 min',
    focus: 'Heart rate, endurance, fat burn',
    description:
      'Boost cardiovascular fitness with treadmill, bike, or HIIT intervals. Improves stamina, recovery between sets, and overall health.',
    exercises: ['Treadmill intervals', 'Rowing', 'Battle ropes', 'Stair climber'],
    aliases: ['cardio', 'hiit', 'endurance', 'conditioning'],
  },
];

export function findWorkoutCatalogItem(query?: string | null): WorkoutCatalogItem | undefined {
  if (!query) return undefined;
  const normalized = query.trim().toLowerCase();
  return WORKOUT_CATALOG.find(
    (item) =>
      item.id === normalized ||
      item.title.toLowerCase() === normalized ||
      item.aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized)),
  );
}

export function getWorkoutImageForPlan(title?: string, category?: string): string | undefined {
  return findWorkoutCatalogItem(category)?.image ?? findWorkoutCatalogItem(title)?.image;
}
