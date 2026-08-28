import { Clock, Dumbbell, Target, ZoomIn } from 'lucide-react';
import type { WorkoutCatalogItem } from '../../data/workoutCatalog';
import WorkoutPosterImage from './WorkoutPosterImage';

interface WorkoutLibraryCardProps {
  workout: WorkoutCatalogItem;
  compact?: boolean;
  onView?: (workout: WorkoutCatalogItem) => void;
  onSelect?: (workout: WorkoutCatalogItem) => void;
}

export default function WorkoutLibraryCard({ workout, compact = false, onView, onSelect }: WorkoutLibraryCardProps) {
  return (
    <article
      className="group apex-card-hover overflow-hidden text-left transition-all duration-300 ease-smooth"
      data-reveal="visible"
    >
      <button
        type="button"
        onClick={() => onView?.(workout)}
        className="click-effect relative block w-full text-left"
        aria-label={`View ${workout.title} workout image`}
      >
        <WorkoutPosterImage src={workout.image} alt={workout.title} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent px-3 pb-3 pt-16">
          <div className="flex items-end justify-between gap-2">
            <h3 className="text-lg font-bold text-white">{workout.title}</h3>
            <span className="shrink-0 rounded-pill bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-apex-primary">
              {workout.level}
            </span>
          </div>
        </div>
        <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/20 bg-black/50 p-2 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <ZoomIn className="h-4 w-4" />
        </div>
      </button>

      <div className={compact ? 'space-y-2 p-4' : 'space-y-3 p-4 sm:p-5'}>
        <p className="text-sm leading-relaxed text-apex-body">{workout.description}</p>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-apex-body">
          <span className="inline-flex items-center gap-1 rounded-pill bg-apex-primary-light px-2.5 py-1 text-apex-primary">
            <Clock className="h-3.5 w-3.5" />
            {workout.duration}
          </span>
          <span className="inline-flex items-center gap-1 rounded-pill bg-slate-100 px-2.5 py-1">
            <Target className="h-3.5 w-3.5" />
            {workout.focus}
          </span>
        </div>

        {!compact && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-apex-muted">Key exercises</p>
            <div className="flex flex-wrap gap-1.5">
              {workout.exercises.map((exercise) => (
                <span
                  key={exercise}
                  className="inline-flex items-center gap-1 rounded-md border border-apex-border bg-apex-surface px-2 py-1 text-xs text-apex-heading"
                >
                  <Dumbbell className="h-3 w-3 text-apex-primary" />
                  {exercise}
                </span>
              ))}
            </div>
          </div>
        )}

        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(workout)}
            className="click-effect w-full rounded-btn border border-apex-primary/20 bg-apex-primary-light px-3 py-2 text-sm font-semibold text-apex-primary transition-all duration-200 ease-smooth hover:bg-apex-primary/10"
          >
            Use as Template
          </button>
        )}
      </div>
    </article>
  );
}
