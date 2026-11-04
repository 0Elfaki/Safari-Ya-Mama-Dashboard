import clsx from 'clsx';
import { Check, ChevronRight, ClipboardCheck, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { categoryLabel } from '@/features/dashboard/checklist';
import { useTodayChecklist } from '@/hooks/useChecklist';
import type { ChecklistTask } from '@/types';
import { CardHeader } from '../common/Card';
import { ProgressBar } from '../common/ProgressBar';
import { EmptyState } from '../common/StateViews';

/** One checklist row: a real checkbox, the task, why it is there, and where it leads. */
export function ReminderRow({ task, done, onToggle }: { task: ChecklistTask; done: boolean; onToggle: () => void }) {
  const id = `task-${task.id.replace(/[^a-z0-9-]/gi, '-')}`;
  return (
    <li className={clsx('flex items-start gap-3 rounded-md border px-3 py-3 transition-colors', done ? 'border-success/20 bg-success-soft' : 'border-line bg-surface')}>
      <span className="relative mt-0.5 inline-flex h-6 w-6 shrink-0">
        <input id={id} type="checkbox" checked={done} onChange={onToggle} className="peer h-6 w-6 cursor-pointer appearance-none rounded-sm border-2 border-line bg-surface checked:border-success checked:bg-success focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
        <Check className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-white opacity-0 peer-checked:opacity-100" aria-hidden strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className={clsx('block cursor-pointer font-semibold', done ? 'text-ink-2 line-through' : 'text-ink')}>
          {task.title}
        </label>
        <p className="t-caption mt-1">
          <span className="font-semibold">{categoryLabel[task.category]}</span> · {task.basis}
        </p>
      </div>
      {task.to && (
        <Link to={task.to} className="-mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-primary-soft hover:text-primary" aria-label={`Open: ${task.title}`}>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      )}
    </li>
  );
}

/** Today's care checklist with completion progress. Ticks are saved on this device per day. */
export function ReminderCard({ className }: { className?: string }) {
  const { tasks, isDone, toggle, doneCount, progress } = useTodayChecklist();
  return (
    <section aria-labelledby="todays-care" className={clsx('min-w-0 rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6', className)}>
      <CardHeader
        id="todays-care"
        icon={ClipboardCheck}
        title="Today's care"
        subtitle={tasks.length ? `${doneCount} of ${tasks.length} done` : undefined}
        action={
          <Link to="/care#reminders" className="inline-flex min-h-11 items-center text-small font-semibold text-primary hover:underline">
            History
          </Link>
        }
      />
      {tasks.length === 0 ? (
        <EmptyState compact icon={ClipboardCheck} title="Nothing on your list today" text="Tasks appear here from your profile, appointments and lessons." />
      ) : (
        <>
          <ProgressBar value={progress} label="Today's care completed" tone={progress === 1 ? 'success' : 'primary'} />
          <ul className="mt-4 flex flex-col gap-2" aria-label="Today's care tasks">
            {tasks.map((t) => (
              <ReminderRow key={t.id} task={t} done={isDone(t.id)} onToggle={() => toggle(t.id)} />
            ))}
          </ul>
          {progress === 1 && (
            <p role="status" className="mt-3 text-small font-semibold text-success">
              All done for today.
            </p>
          )}
        </>
      )}
      <p className="t-caption mt-4 flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        This list helps with routines. Ticking it does not show that you or your baby are healthy. If you notice a danger sign, seek care now.
      </p>
    </section>
  );
}
