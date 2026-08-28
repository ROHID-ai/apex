import { useCallback, useRef, useState } from 'react';

export interface HeatmapDay {
  date: string;
  count: number;
}

interface AttendanceHeatmapProps {
  days: HeatmapDay[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  dateLabel: string;
  count: number;
}

const LEVEL_COLORS = [
  '#E8F5E9', // 0 — no check-ins
  '#A5D6A7', // 1 — low
  '#66BB6A', // 2 — medium
  '#43A047', // 3 — high
  '#1B5E20', // 4 — peak
] as const;

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function levelForCount(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildWeeks(days: HeatmapDay[]): { date: Date; count: number }[][] {
  const countByDate = new Map(days.map((d) => [d.date, d.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const start = new Date(end);
  start.setDate(start.getDate() - 7 * 52 + 1);
  start.setDate(start.getDate() - start.getDay());

  const weeks: { date: Date; count: number }[][] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const week: { date: Date; count: number }[] = [];
    for (let i = 0; i < 7; i += 1) {
      const key = toDateKey(cursor);
      const isFuture = cursor > today;
      week.push({
        date: new Date(cursor),
        count: isFuture ? -1 : countByDate.get(key) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

const CELL_SIZE = 14; // 11px square + 3px gap
const MONTH_LABEL_MIN_GAP = 28; // enough room for "Aug" / "Sep"

function monthLabels(
  weeks: { date: Date; count: number }[][]
): { label: string; index: number; left: number }[] {
  const candidates: { label: string; index: number }[] = [];
  let lastMonth = -1;

  weeks.forEach((week, index) => {
    const firstOfMonth = week.find((cell) => cell.date.getDate() === 1);
    if (firstOfMonth) {
      candidates.push({
        label: firstOfMonth.date.toLocaleString('en-US', { month: 'short' }),
        index,
      });
      lastMonth = firstOfMonth.date.getMonth();
      return;
    }

    // Leading partial month (grid starts mid-month, before the 1st appears)
    if (index === 0) {
      const month = week[0].date.getMonth();
      if (month !== lastMonth) {
        candidates.push({
          label: week[0].date.toLocaleString('en-US', { month: 'short' }),
          index: 0,
        });
        lastMonth = month;
      }
    }
  });

  const labels: { label: string; index: number; left: number }[] = [];
  let lastLeft = -MONTH_LABEL_MIN_GAP;

  candidates.forEach((item) => {
    const left = Math.max(item.index * CELL_SIZE, lastLeft + MONTH_LABEL_MIN_GAP);
    labels.push({ ...item, left });
    lastLeft = left;
  });

  return labels;
}

export default function AttendanceHeatmap({ days }: AttendanceHeatmapProps) {
  const weeks = buildWeeks(days);
  const months = monthLabels(weeks);
  const max = Math.max(...days.map((d) => d.count), 1);
  const rootRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    dateLabel: '',
    count: 0,
  });

  const showTooltip = useCallback((clientX: number, clientY: number, date: Date, count: number) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const pad = 12;
    const x = Math.min(Math.max(clientX - rect.left, pad), rect.width - pad);
    const y = Math.min(Math.max(clientY - rect.top, pad), rect.height - pad);
    setTooltip({
      visible: true,
      x,
      y,
      dateLabel: formatDateLabel(date),
      count,
    });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div ref={rootRef} className="relative space-y-3 select-none">
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-full flex-col gap-1.5">
          <div className="relative ml-8 h-4 text-[10px] font-medium text-apex-muted">
            {months.map((m) => (
              <span
                key={`${m.label}-${m.index}`}
                className="absolute whitespace-nowrap"
                style={{ left: `${m.left}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-1.5">
            <div className="flex w-7 flex-col gap-[3px] text-[10px] leading-[11px] text-apex-muted">
              {WEEKDAY_LABELS.map((label, i) => (
                <span key={label} className={`h-[11px] ${i % 2 === 1 ? '' : 'invisible'}`}>
                  {label.slice(0, 3)}
                </span>
              ))}
            </div>

            <div
              className="flex gap-[3px] touch-none"
              onMouseLeave={hideTooltip}
              onTouchEnd={hideTooltip}
              onTouchCancel={hideTooltip}
            >
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((cell) => {
                    if (cell.count < 0) {
                      return (
                        <div
                          key={toDateKey(cell.date)}
                          className="h-[11px] w-[11px] rounded-[2px] bg-transparent"
                        />
                      );
                    }

                    const level = levelForCount(cell.count, max);

                    return (
                      <div
                        key={toDateKey(cell.date)}
                        role="img"
                        aria-label={`${formatDateLabel(cell.date)}: ${cell.count} members logged in`}
                        className="h-[11px] w-[11px] cursor-pointer rounded-[2px] transition-transform hover:scale-125 hover:ring-1 hover:ring-apex-heading/30"
                        style={{ backgroundColor: LEVEL_COLORS[level] }}
                        onMouseEnter={(e) => showTooltip(e.clientX, e.clientY, cell.date, cell.count)}
                        onMouseMove={(e) => showTooltip(e.clientX, e.clientY, cell.date, cell.count)}
                        onTouchStart={(e) => {
                          const touch = e.touches[0];
                          if (!touch) return;
                          showTooltip(touch.clientX, touch.clientY, cell.date, cell.count);
                        }}
                        onTouchMove={(e) => {
                          const touch = e.touches[0];
                          if (!touch) return;
                          const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
                          const dayKey = el?.dataset?.heatmapDay;
                          if (!dayKey) return;
                          const [y, m, d, countStr] = dayKey.split('|');
                          const date = new Date(Number(y), Number(m) - 1, Number(d));
                          showTooltip(touch.clientX, touch.clientY, date, Number(countStr));
                        }}
                        data-heatmap-day={`${cell.date.getFullYear()}|${cell.date.getMonth() + 1}|${cell.date.getDate()}|${cell.count}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[11px] text-apex-muted">
        <span>Less</span>
        {LEVEL_COLORS.map((color) => (
          <span
            key={color}
            className="inline-block h-[11px] w-[11px] rounded-[2px]"
            style={{ backgroundColor: color }}
          />
        ))}
        <span>More</span>
      </div>

      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-left shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="text-[11px] font-medium text-white/80">{tooltip.dateLabel}</p>
          <p className="text-xs font-semibold text-white">
            {tooltip.count} member{tooltip.count === 1 ? '' : 's'} logged in
          </p>
          <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}
