import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Dumbbell, Target, X } from 'lucide-react';
import type { WorkoutCatalogItem } from '../../data/workoutCatalog';
import Button from '../ui/Button';

interface WorkoutDetailModalProps {
  workout: WorkoutCatalogItem | null;
  onClose: () => void;
  onUseTemplate?: (workout: WorkoutCatalogItem) => void;
}

export default function WorkoutDetailModal({ workout, onClose, onUseTemplate }: WorkoutDetailModalProps) {
  useEffect(() => {
    if (!workout) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [workout, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {workout && (
        <motion.div
          key={workout.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${workout.title} workout`}
        >
          <button
            type="button"
            aria-label="Close workout preview"
            className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-apex-border bg-white shadow-2xl sm:max-w-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="click-effect absolute right-3 top-3 z-30 rounded-full border border-white/20 bg-black/60 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="smooth-scroll overflow-y-auto">
              <div className="relative flex items-center justify-center bg-slate-950 p-3 sm:p-4">
                <img
                  src={workout.image}
                  alt={workout.title}
                  className="mx-auto block w-full max-w-full object-contain"
                  style={{ maxHeight: 'min(68vh, 720px)' }}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/95 via-slate-900/50 to-transparent px-4 pb-4 pt-16 sm:px-5 sm:pb-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 className="text-xl font-bold text-white sm:text-2xl">{workout.title}</h2>
                    <span className="rounded-pill bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-apex-primary">
                      {workout.level}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <p className="text-sm leading-relaxed text-apex-body">{workout.description}</p>

                <div className="flex flex-wrap gap-2 text-xs font-medium sm:text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-apex-primary-light px-3 py-1.5 text-apex-primary">
                    <Clock className="h-4 w-4" />
                    {workout.duration}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-slate-100 px-3 py-1.5 text-apex-heading">
                    <Target className="h-4 w-4" />
                    {workout.focus}
                  </span>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-apex-muted">Key exercises</p>
                  <div className="flex flex-wrap gap-2">
                    {workout.exercises.map((exercise) => (
                      <span
                        key={exercise}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-apex-border bg-apex-surface px-3 py-1.5 text-sm text-apex-heading"
                      >
                        <Dumbbell className="h-3.5 w-3.5 text-apex-primary" />
                        {exercise}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-apex-border pt-4">
                  <Button type="button" variant="secondary" onClick={onClose}>
                    Close
                  </Button>
                  {onUseTemplate && (
                    <Button
                      type="button"
                      onClick={() => {
                        onUseTemplate(workout);
                        onClose();
                      }}
                    >
                      Use as Template
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
