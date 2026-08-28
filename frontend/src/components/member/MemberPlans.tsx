import { useEffect, useState } from 'react';
import { Dumbbell, Utensils, Activity, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import MemberPageIntro from './MemberPageIntro';
import { memberCard, memberPage } from './memberStyles';
import { memberApi } from '../../api/member';
import { WORKOUT_CATALOG, findWorkoutCatalogItem, type WorkoutCatalogItem } from '../../data/workoutCatalog';
import WorkoutLibraryCard from '../workouts/WorkoutLibraryCard';
import WorkoutDetailModal from '../workouts/WorkoutDetailModal';
import WorkoutPosterImage from '../workouts/WorkoutPosterImage';
import SectionHeader from '../ui/SectionHeader';

interface Workout {
  id: number;
  workout_name: string;
  trainer?: string;
  schedule?: string;
  category?: string;
}

interface DietPlan {
  id: number;
  meal_plan: string;
  calories?: string;
  notes?: string;
}

interface MemberPlansProps {
  mode: 'workout' | 'diet';
}

export default function MemberPlans({ mode }: MemberPlansProps) {
  const [items, setItems] = useState<Array<Workout | DietPlan>>([]);
  const [loading, setLoading] = useState(true);
  const [viewingWorkout, setViewingWorkout] = useState<WorkoutCatalogItem | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const response = mode === 'workout' ? await memberApi.getWorkout() : await memberApi.getDiet();
        setItems(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [mode]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-apex-primary" />
      </div>
    );
  }

  if (mode === 'diet') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={memberPage}>
        <MemberPageIntro description="Recommended nutrition plans available for your membership." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`${memberCard} relative overflow-hidden`}
            >
              <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-apex-primary/5 blur-[40px]" />
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-2xl bg-apex-primary/10 p-3">
                  <Utensils className="h-6 w-6 text-apex-primary" />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-apex-body">
                  {(item as DietPlan).calories || 'Diet'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{(item as DietPlan).meal_plan}</h3>
              <p className="mt-1 text-sm text-apex-body">{(item as DietPlan).notes || 'Diet plan'}</p>
              <div className="mt-6 flex items-center gap-2">
                <Activity className="h-4 w-4 text-apex-primary" />
                <span className="text-sm font-bold text-apex-body">Personalized Plan</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={memberPage}>
      <WorkoutDetailModal workout={viewingWorkout} onClose={() => setViewingWorkout(null)} />

      <MemberPageIntro description="Explore muscle-group workouts and view programs assigned by your trainer." />

      {items.length > 0 && (
        <section className="space-y-3" data-reveal="visible">
          <SectionHeader title="Your Assigned Programs" description="Plans currently linked to your membership." />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {items.map((item, index) => {
              const workout = item as Workout;
              const catalogMatch = findWorkoutCatalogItem(workout.workout_name) ?? findWorkoutCatalogItem(workout.category);
              return (
                <motion.div
                  key={workout.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className={`${memberCard} overflow-hidden p-0`}
                >
                  {catalogMatch ? (
                    <button
                      type="button"
                      onClick={() => setViewingWorkout(catalogMatch)}
                      className="click-effect relative block w-full overflow-hidden"
                      aria-label={`View ${workout.workout_name} workout image`}
                    >
                      <WorkoutPosterImage src={catalogMatch.image} alt={workout.workout_name} variant="thumb" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent px-4 pb-3 pt-12">
                        <span className="rounded-pill bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-apex-primary">
                          Assigned
                        </span>
                        <h3 className="mt-1 text-lg font-bold text-white">{workout.workout_name}</h3>
                      </div>
                    </button>
                  ) : (
                    <div className="border-b border-apex-border bg-apex-primary-light/40 p-4">
                      <Dumbbell className="h-6 w-6 text-apex-primary" />
                      <h3 className="mt-2 text-lg font-bold text-slate-900">{workout.workout_name}</h3>
                    </div>
                  )}
                  <div className="space-y-2 p-4">
                    <p className="text-sm text-apex-body">{workout.schedule || 'Schedule not set'}</p>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-apex-primary" />
                      <span className="text-sm font-bold text-apex-body">{workout.trainer || 'Trainer not assigned'}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3" data-reveal="visible">
        <SectionHeader
          title="Workout Library"
          description="Browse training sessions by muscle group with exercise guidance."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {WORKOUT_CATALOG.map((workout, index) => (
            <motion.div
              key={workout.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              data-reveal="visible"
            >
              <WorkoutLibraryCard workout={workout} onView={setViewingWorkout} />
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
