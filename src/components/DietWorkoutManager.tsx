import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Dumbbell,
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  Utensils,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import PageHero from './ui/PageHero';
import Button from './ui/Button';

type AssignmentScope = 'all' | 'specific' | 'group';

interface Member {
  id: number;
  name: string;
  email: string;
  membership_type?: string;
  status: string;
}

interface Workout {
  id: number;
  title: string;
  category: string;
  level: string;
  user_count: number;
  apply_to?: AssignmentScope;
  member_ids?: number[];
  membership_groups?: string[];
  trainer?: string;
  schedule?: string;
  admin_notes?: string;
  duration_weeks?: number;
  difficulty?: string;
  is_active?: boolean;
}

interface DietPlan {
  id: number;
  title: string;
  calories: string;
  user_count: number;
  apply_to?: AssignmentScope;
  member_ids?: number[];
  membership_groups?: string[];
  admin_notes?: string;
  duration_weeks?: number;
  difficulty?: string;
  macros?: string;
  is_active?: boolean;
}

interface AssignmentHistory {
  id: string;
  plan_type: 'workout' | 'diet';
  plan_name: string;
  action: string;
  scope: string;
  assigned_count: number;
  created_at: string;
}

export default function DietWorkoutManager() {
  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [diets, setDiets] = useState<DietPlan[]>([]);
  const [history, setHistory] = useState<AssignmentHistory[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
  const [editingDietId, setEditingDietId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const [filters, setFilters] = useState({
    status: 'all',
    membership_type: 'all',
    age_group: 'all',
    gender: 'all',
    trainer_assigned: 'all',
  });

  const [assignment, setAssignment] = useState<{
    apply_to: AssignmentScope;
    member_ids: number[];
    membership_groups: string[];
  }>({
    apply_to: 'all',
    member_ids: [],
    membership_groups: [],
  });

  const [workoutForm, setWorkoutForm] = useState({
    title: '',
    category: '',
    level: 'Beginner',
    trainer: '',
    schedule: '',
    admin_notes: '',
    duration_weeks: '',
    difficulty: 'Beginner',
  });

  const [dietForm, setDietForm] = useState({
    title: '',
    calories: '',
    meal_plan: '',
    notes: '',
    admin_notes: '',
    duration_weeks: '',
    difficulty: 'Beginner',
    macros: '',
  });

  useEffect(() => {
    fetchData();
    fetchMembers();
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [filters]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workoutRes, dietRes, historyRes] = await Promise.all([
        api.get('/workouts'),
        api.get('/diet-plans'),
        api.get('/plan-assignments/history'),
      ]);
      setWorkouts(workoutRes.data);
      setDiets(dietRes.data);
      setHistory(historyRes.data || []);
    } catch (err) {
      console.error(err);
      setToast({ kind: 'error', message: 'Failed to load plan data.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await api.get('/admin/members/assignment-candidates', {
        params: {
          search: memberSearch,
          status_filter: filters.status,
          membership_type: filters.membership_type,
          age_group: filters.age_group,
          gender: filters.gender,
          trainer_assigned: filters.trainer_assigned,
        },
      });
      setMembers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const resetForms = () => {
    setWorkoutForm({
      title: '',
      category: '',
      level: 'Beginner',
      trainer: '',
      schedule: '',
      admin_notes: '',
      duration_weeks: '',
      difficulty: 'Beginner',
    });
    setDietForm({
      title: '',
      calories: '',
      meal_plan: '',
      notes: '',
      admin_notes: '',
      duration_weeks: '',
      difficulty: 'Beginner',
      macros: '',
    });
    setAssignment({ apply_to: 'all', member_ids: [], membership_groups: [] });
    setEditingWorkoutId(null);
    setEditingDietId(null);
  };

  const selectedMembersCount = assignment.member_ids.length;

  const visibleMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const term = memberSearch.toLowerCase();
    return members.filter((member) =>
      `${member.name} ${member.email} ${member.membership_type || ''}`.toLowerCase().includes(term)
    );
  }, [members, memberSearch]);

  const toggleMember = (id: number) => {
    setAssignment((prev) => ({
      ...prev,
      member_ids: prev.member_ids.includes(id) ? prev.member_ids.filter((item) => item !== id) : [...prev.member_ids, id],
    }));
  };

  const toggleGroup = (group: string) => {
    setAssignment((prev) => ({
      ...prev,
      membership_groups: prev.membership_groups.includes(group)
        ? prev.membership_groups.filter((item) => item !== group)
        : [...prev.membership_groups, group],
    }));
  };

  const startEditWorkout = (plan: Workout) => {
    setActiveTab('workout');
    setEditingWorkoutId(plan.id);
    setEditingDietId(null);
    setWorkoutForm({
      title: plan.title,
      category: plan.category,
      level: plan.level,
      trainer: plan.trainer || '',
      schedule: plan.schedule || '',
      admin_notes: plan.admin_notes || '',
      duration_weeks: plan.duration_weeks ? String(plan.duration_weeks) : '',
      difficulty: plan.difficulty || plan.level,
    });
    setAssignment({
      apply_to: plan.apply_to || 'all',
      member_ids: plan.member_ids || [],
      membership_groups: plan.membership_groups || [],
    });
  };

  const startEditDiet = (plan: DietPlan) => {
    setActiveTab('diet');
    setEditingDietId(plan.id);
    setEditingWorkoutId(null);
    setDietForm({
      title: plan.title,
      calories: plan.calories,
      meal_plan: plan.title,
      notes: '',
      admin_notes: plan.admin_notes || '',
      duration_weeks: plan.duration_weeks ? String(plan.duration_weeks) : '',
      difficulty: plan.difficulty || 'Beginner',
      macros: plan.macros || '',
    });
    setAssignment({
      apply_to: plan.apply_to || 'all',
      member_ids: plan.member_ids || [],
      membership_groups: plan.membership_groups || [],
    });
  };

  const buildCommonAssignmentPayload = () => ({
    apply_to: assignment.apply_to,
    member_ids: assignment.member_ids,
    membership_groups: assignment.membership_groups,
    filters,
  });

  const saveWorkout = async () => {
    if (!workoutForm.title.trim() || !workoutForm.category.trim()) return;
    if (assignment.apply_to === 'specific' && assignment.member_ids.length === 0) {
      setToast({ kind: 'error', message: 'Select at least one member for specific assignment.' });
      return;
    }
    if (assignment.apply_to === 'group' && assignment.membership_groups.length === 0) {
      setToast({ kind: 'error', message: 'Select at least one membership group.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...buildCommonAssignmentPayload(),
        title: workoutForm.title,
        category: workoutForm.category,
        level: workoutForm.level,
        workout_name: workoutForm.title,
        trainer: workoutForm.trainer || null,
        schedule: workoutForm.schedule || null,
        admin_notes: workoutForm.admin_notes || null,
        duration_weeks: workoutForm.duration_weeks ? Number(workoutForm.duration_weeks) : null,
        difficulty: workoutForm.difficulty,
      };

      if (editingWorkoutId) {
        await api.put(`/workouts/${editingWorkoutId}`, payload);
        setToast({ kind: 'success', message: 'Workout updated and assignments synced.' });
      } else {
        await api.post('/workouts', payload);
        setToast({ kind: 'success', message: 'Workout created and assigned.' });
      }

      resetForms();
      fetchData();
    } catch (err) {
      console.error(err);
      setToast({ kind: 'error', message: 'Failed to save workout.' });
    } finally {
      setSubmitting(false);
      setConfirmAll(false);
    }
  };

  const saveDiet = async () => {
    if (!dietForm.title.trim() || !dietForm.calories.trim()) return;
    if (assignment.apply_to === 'specific' && assignment.member_ids.length === 0) {
      setToast({ kind: 'error', message: 'Select at least one member for specific assignment.' });
      return;
    }
    if (assignment.apply_to === 'group' && assignment.membership_groups.length === 0) {
      setToast({ kind: 'error', message: 'Select at least one membership group.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...buildCommonAssignmentPayload(),
        title: dietForm.title,
        calories: dietForm.calories,
        meal_plan: dietForm.meal_plan || dietForm.title,
        notes: dietForm.notes || null,
        admin_notes: dietForm.admin_notes || null,
        duration_weeks: dietForm.duration_weeks ? Number(dietForm.duration_weeks) : null,
        difficulty: dietForm.difficulty,
        macros: dietForm.macros || null,
      };

      if (editingDietId) {
        await api.put(`/diet-plans/${editingDietId}`, payload);
        setToast({ kind: 'success', message: 'Diet plan updated and assignments synced.' });
      } else {
        await api.post('/diet-plans', payload);
        setToast({ kind: 'success', message: 'Diet plan created and assigned.' });
      }

      resetForms();
      fetchData();
    } catch (err) {
      console.error(err);
      setToast({ kind: 'error', message: 'Failed to save diet plan.' });
    } finally {
      setSubmitting(false);
      setConfirmAll(false);
    }
  };

  const handlePrimarySave = () => {
    if (assignment.apply_to === 'all' && !confirmAll) {
      setConfirmAll(true);
      return;
    }
    if (activeTab === 'workout') saveWorkout();
    else saveDiet();
  };

  const handleDeleteWorkout = async (id: number) => {
    try {
      await api.delete(`/workouts/${id}`);
      setToast({ kind: 'success', message: 'Workout removed.' });
      fetchData();
    } catch (err) {
      console.error(err);
      setToast({ kind: 'error', message: 'Failed to remove workout.' });
    }
  };

  const handleDeleteDiet = async (id: number) => {
    try {
      await api.delete(`/diet-plans/${id}`);
      setToast({ kind: 'success', message: 'Diet plan removed.' });
      fetchData();
    } catch (err) {
      console.error(err);
      setToast({ kind: 'error', message: 'Failed to remove diet plan.' });
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      if (activeTab === 'workout') await api.post(`/workouts/${id}/duplicate`);
      else await api.post(`/diet-plans/${id}/duplicate`);
      setToast({ kind: 'success', message: 'Plan duplicated.' });
      fetchData();
    } catch (err) {
      console.error(err);
      setToast({ kind: 'error', message: 'Failed to duplicate plan.' });
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      if (activeTab === 'workout') await api.patch(`/workouts/${id}/toggle`);
      else await api.patch(`/diet-plans/${id}/toggle`);
      fetchData();
    } catch (err) {
      console.error(err);
      setToast({ kind: 'error', message: 'Failed to toggle status.' });
    }
  };

  const groupOptions = ['Basic', 'Premium', 'VIP', 'Elite'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHero
        badge="Programming"
        title="Diet & Workout Plans"
        description="Create, assign, and manage personalized nutrition and training programs."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-btn border border-apex-border bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('workout')}
            className={`flex items-center gap-2 rounded-btn px-5 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'workout' ? 'bg-apex-primary text-white shadow-btn' : 'text-apex-body hover:text-apex-heading'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Workouts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diet')}
            className={`flex items-center gap-2 rounded-btn px-5 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'diet' ? 'bg-apex-primary text-white shadow-btn' : 'text-apex-body hover:text-apex-heading'
            }`}
          >
            <Utensils className="w-4 h-4" />
            Diet Plans
          </button>
        </div>
        <div className="flex items-center gap-3">
          {(editingWorkoutId || editingDietId) && (
            <Button variant="secondary" onClick={resetForms}>
              Cancel Edit
            </Button>
          )}
          <Button onClick={handlePrimarySave} disabled={submitting || loading} loading={submitting}>
            <Plus className="w-4 h-4" />
            {editingWorkoutId || editingDietId ? 'Update Plan' : `Create ${activeTab === 'workout' ? 'Workout' : 'Diet'} Plan`}
          </Button>
        </div>
      </div>

      {toast && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 border ${toast.kind === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-blue-600/10 border-blue-600/30 text-blue-400'}`}>
          {toast.kind === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="apex-card space-y-4 p-5 md:p-6">
        {activeTab === 'workout' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={workoutForm.title}
              onChange={(e) => setWorkoutForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Workout title"
              className="w-full px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <input
              value={workoutForm.category}
              onChange={(e) => setWorkoutForm((prev) => ({ ...prev, category: e.target.value }))}
              placeholder="Category"
              className="w-full px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <select
              value={workoutForm.level}
              onChange={(e) => setWorkoutForm((prev) => ({ ...prev, level: e.target.value }))}
              className="w-full px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="Beginner" className="bg-white">Beginner</option>
              <option value="Intermediate" className="bg-white">Intermediate</option>
              <option value="Advanced" className="bg-white">Advanced</option>
            </select>
            <input
              value={workoutForm.trainer}
              onChange={(e) => setWorkoutForm((prev) => ({ ...prev, trainer: e.target.value }))}
              placeholder="Trainer"
              className="w-full px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <input
              value={workoutForm.schedule}
              onChange={(e) => setWorkoutForm((prev) => ({ ...prev, schedule: e.target.value }))}
              placeholder="Schedule"
              className="w-full px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <input
              value={workoutForm.duration_weeks}
              onChange={(e) => setWorkoutForm((prev) => ({ ...prev, duration_weeks: e.target.value }))}
              type="number"
              placeholder="Duration in weeks"
              className="w-full px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <textarea
              value={workoutForm.admin_notes}
              onChange={(e) => setWorkoutForm((prev) => ({ ...prev, admin_notes: e.target.value }))}
              placeholder="Admin notes"
              className="md:col-span-3 min-h-[90px] px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={dietForm.title}
              onChange={(e) => setDietForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Diet title"
              className="w-full px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <input
              value={dietForm.calories}
              onChange={(e) => setDietForm((prev) => ({ ...prev, calories: e.target.value }))}
              placeholder="Calories (e.g., 2200 kcal)"
              className="w-full px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <input
              value={dietForm.meal_plan}
              onChange={(e) => setDietForm((prev) => ({ ...prev, meal_plan: e.target.value }))}
              placeholder="Meal plan name"
              className="w-full px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <input
              value={dietForm.duration_weeks}
              onChange={(e) => setDietForm((prev) => ({ ...prev, duration_weeks: e.target.value }))}
              type="number"
              placeholder="Duration in weeks"
              className="w-full px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <input
              value={dietForm.macros}
              onChange={(e) => setDietForm((prev) => ({ ...prev, macros: e.target.value }))}
              placeholder="Macros (optional)"
              className="w-full px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <textarea
              value={dietForm.admin_notes}
              onChange={(e) => setDietForm((prev) => ({ ...prev, admin_notes: e.target.value }))}
              placeholder="Admin notes"
              className="md:col-span-3 min-h-[90px] px-4 py-3 bg-[#F5F5F5]/40 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
        )}

        <div className="border-t border-slate-200 pt-4 space-y-4">
          <div className="text-xs uppercase tracking-wider text-gray-400">Assignment Scope</div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'specific', 'group'] as AssignmentScope[]).map((scope) => (
              <button
                key={scope}
                onClick={() => setAssignment((prev) => ({ ...prev, apply_to: scope }))}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${assignment.apply_to === scope ? 'bg-blue-600/20 border-blue-600/40 text-blue-300' : 'bg-slate-100 border-slate-200 text-gray-300 hover:border-slate-300'}`}
              >
                {scope === 'all' ? 'All Members' : scope === 'specific' ? 'Specific Members' : 'Membership Groups'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} className="px-3 py-2 bg-[#F5F5F5]/40 border border-slate-200 rounded-lg text-sm text-slate-600">
              <option value="all" className="bg-white">Status: All</option>
              <option value="active" className="bg-white">Active</option>
              <option value="inactive" className="bg-white">Inactive</option>
            </select>
            <select value={filters.membership_type} onChange={(e) => setFilters((prev) => ({ ...prev, membership_type: e.target.value }))} className="px-3 py-2 bg-[#F5F5F5]/40 border border-slate-200 rounded-lg text-sm text-slate-600">
              <option value="all" className="bg-white">Membership: All</option>
              <option value="basic" className="bg-white">Basic</option>
              <option value="premium" className="bg-white">Premium</option>
              <option value="vip" className="bg-white">VIP</option>
            </select>
            <select value={filters.age_group} onChange={(e) => setFilters((prev) => ({ ...prev, age_group: e.target.value }))} className="px-3 py-2 bg-[#F5F5F5]/40 border border-slate-200 rounded-lg text-sm text-slate-600">
              <option value="all" className="bg-white">Age: All</option>
              <option value="under_18" className="bg-white">Under 18</option>
              <option value="18_25" className="bg-white">18-25</option>
              <option value="26_40" className="bg-white">26-40</option>
              <option value="41_plus" className="bg-white">41+</option>
            </select>
            <select value={filters.gender} onChange={(e) => setFilters((prev) => ({ ...prev, gender: e.target.value }))} className="px-3 py-2 bg-[#F5F5F5]/40 border border-slate-200 rounded-lg text-sm text-slate-600">
              <option value="all" className="bg-white">Gender: All</option>
              <option value="male" className="bg-white">Male</option>
              <option value="female" className="bg-white">Female</option>
              <option value="other" className="bg-white">Other</option>
            </select>
            <input value={filters.trainer_assigned} onChange={(e) => setFilters((prev) => ({ ...prev, trainer_assigned: e.target.value || 'all' }))} placeholder="Trainer" className="px-3 py-2 bg-[#F5F5F5]/40 border border-slate-200 rounded-lg text-sm text-slate-600" />
          </div>

          {assignment.apply_to === 'specific' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">Selected Members: <span className="text-blue-400 font-semibold">{selectedMembersCount}</span></div>
                <button
                  onClick={() => setAssignment((prev) => ({ ...prev, member_ids: visibleMembers.map((m) => m.id) }))}
                  className="text-xs px-3 py-1 rounded-md border border-slate-200 text-gray-300 hover:text-slate-900"
                >
                  Select Visible
                </button>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members"
                  className="w-full pl-9 pr-4 py-2 bg-[#F5F5F5]/40 border border-slate-200 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div className="max-h-44 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-2">
                {loadingMembers ? (
                  <div className="text-sm text-gray-400">Loading members...</div>
                ) : (
                  visibleMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className={`text-left p-3 rounded-lg border ${assignment.member_ids.includes(member.id) ? 'border-blue-600/40 bg-blue-600/10' : 'border-slate-200 bg-white/80'} transition-all`}
                    >
                      <div className="text-sm font-semibold text-slate-900">{member.name}</div>
                      <div className="text-xs text-gray-400">{member.email} • {member.membership_type || 'N/A'}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {assignment.apply_to === 'group' && (
            <div className="flex flex-wrap gap-2">
              {groupOptions.map((group) => (
                <button
                  key={group}
                  onClick={() => toggleGroup(group)}
                  className={`px-3 py-2 rounded-lg border text-sm ${assignment.membership_groups.includes(group) ? 'border-blue-600/40 bg-blue-600/10 text-blue-300' : 'border-slate-200 bg-white/80 text-gray-300'}`}
                >
                  {group}
                </button>
              ))}
            </div>
          )}

          {confirmAll && assignment.apply_to === 'all' && (
            <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <div className="flex items-center gap-2 text-amber-200 text-sm">
                <AlertTriangle className="w-4 h-4" />
                This will assign this plan to all members matching your filters.
              </div>
              <button onClick={() => setConfirmAll(false)} className="text-xs px-3 py-1 rounded-md border border-amber-500/40 text-amber-100">Dismiss</button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="wait">
            {activeTab === 'workout' ? (
              workouts.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white border border-slate-200 rounded-3xl p-6 hover:border-blue-600/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[40px] rounded-full -mr-16 -mt-16" />
                  <div className="flex justify-between items-start mb-4 gap-2">
                    <div className="p-3 bg-blue-600/10 rounded-2xl">
                      <Dumbbell className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-slate-100 px-3 py-1 rounded-full">{plan.level}</span>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${plan.is_active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-gray-500/20 text-gray-300'}`}>{plan.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-500 transition-colors">{plan.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">{plan.category}</p>
                  <p className="text-gray-500 text-xs mt-2 uppercase tracking-wide">Scope: {plan.apply_to || 'all'}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-gray-300 text-sm font-bold">{plan.user_count} Members</div>
                    <div className="flex gap-1">
                      <button onClick={() => startEditWorkout(plan)} className="p-2 hover:bg-slate-100 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDuplicate(plan.id)} className="p-2 hover:bg-slate-100 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleStatus(plan.id)} className="px-2 text-[10px] rounded-lg border border-slate-200 text-gray-300 hover:text-slate-900">{plan.is_active ? 'Disable' : 'Enable'}</button>
                      <button onClick={() => handleDeleteWorkout(plan.id)} className="p-2 hover:bg-slate-100 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              diets.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white border border-slate-200 rounded-3xl p-6 hover:border-blue-600/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[40px] rounded-full -mr-16 -mt-16" />
                  <div className="flex justify-between items-start mb-4 gap-2">
                    <div className="p-3 bg-blue-600/10 rounded-2xl">
                      <Utensils className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-slate-100 px-3 py-1 rounded-full">{plan.calories}</span>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${plan.is_active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-gray-500/20 text-gray-300'}`}>{plan.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-500 transition-colors">{plan.title}</h3>
                  <p className="text-gray-500 text-xs mt-2 uppercase tracking-wide">Scope: {plan.apply_to || 'all'}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-gray-300 text-sm font-bold">{plan.user_count} Members</div>
                    <div className="flex gap-1">
                      <button onClick={() => startEditDiet(plan)} className="p-2 hover:bg-slate-100 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDuplicate(plan.id)} className="p-2 hover:bg-slate-100 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleStatus(plan.id)} className="px-2 text-[10px] rounded-lg border border-slate-200 text-gray-300 hover:text-slate-900">{plan.is_active ? 'Disable' : 'Enable'}</button>
                      <button onClick={() => handleDeleteDiet(plan.id)} className="p-2 hover:bg-slate-100 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="bg-[#F5F5F5] border border-slate-200 rounded-2xl p-4">
        <h3 className="text-slate-900 font-semibold mb-3">Recent Assignment History</h3>
        <div className="space-y-2 max-h-52 overflow-auto">
          {history.length === 0 ? (
            <div className="text-sm text-gray-500">No assignment actions yet.</div>
          ) : (
            history.slice(0, 12).map((event) => (
              <div key={event.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
                <div>
                  <div className="text-sm text-slate-900">{event.plan_name}</div>
                  <div className="text-xs text-gray-400 uppercase">{event.plan_type} • {event.scope}</div>
                </div>
                <div className="text-xs text-blue-300">{event.assigned_count} assigned</div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
