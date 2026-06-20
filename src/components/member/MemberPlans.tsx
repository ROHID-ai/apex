import { useEffect, useState } from 'react';
import { Dumbbell, Utensils, Activity, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { memberApi } from '../../api/member';

interface Workout {
  id: number;
  workout_name: string;
  trainer?: string;
  schedule?: string;
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
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-apex-primary animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{mode === 'workout' ? 'My Workout Plan' : 'My Diet Plan'}</h1>
        <p className="text-apex-body mt-1">Recommended plans available for your membership.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((item, index) => {
          const isWorkout = mode === 'workout';
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${isWorkout ? 'bg-apex-primary/5' : 'bg-apex-primary/5'} blur-[40px] rounded-full -mr-16 -mt-16`} />
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 ${isWorkout ? 'bg-apex-primary/10' : 'bg-apex-primary/10'} rounded-2xl`}>
                  {isWorkout ? <Dumbbell className="w-6 h-6 text-apex-primary" /> : <Utensils className="w-6 h-6 text-apex-primary" />}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-apex-body bg-slate-100 px-3 py-1 rounded-full">
                  {isWorkout ? 'Assigned' : ((item as DietPlan).calories || 'Diet')}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{isWorkout ? (item as Workout).workout_name : (item as DietPlan).meal_plan}</h3>
              <p className="text-apex-body text-sm mt-1">
                {isWorkout ? ((item as Workout).schedule || 'Schedule not set') : ((item as DietPlan).notes || 'Diet plan')}
              </p>
              <div className="mt-6 flex items-center gap-2">
                <Activity className={`w-4 h-4 ${isWorkout ? 'text-apex-primary' : 'text-apex-primary'}`} />
                <span className="text-apex-body text-sm font-bold">
                  {isWorkout ? ((item as Workout).trainer || 'Trainer not assigned') : 'Personalized Plan'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}