import clsx from 'clsx';
import { BookOpen, Clock, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { content, tr } from '@/data/content';
import { usePrefs } from '@/store/prefs';
import type { Lesson } from '@/types';
import { buttonClass } from '../common/Button';
import { Illustration } from '../common/Illustration';
import { StatusBadge } from '../common/StatusBadge';

export const formatInfo: Record<Lesson['format'], { label: string; icon: typeof BookOpen }> = {
  // This dashboard shows every lesson as steps with pictures and can read it aloud.
  // Films stay in the phone app, so no lesson here claims to be a film.
  guide: { label: 'Picture guide', icon: BookOpen },
  audio: { label: 'Listen along', icon: Headphones },
  video: { label: 'Picture guide', icon: BookOpen },
};

export const categoryName = (key: string, lang: 'en' | 'sw' = 'en') => tr(content.libraryCategories.find((c) => c.key === key), lang);

/** Review status straight from the content pack. Never claims a review that has not happened. */
export function ReviewBadge({ lesson }: { lesson: Lesson }) {
  return lesson.review ? (
    <StatusBadge tone="success">Clinically reviewed</StatusBadge>
  ) : (
    <StatusBadge tone="neutral" icon={Clock}>
      Clinical review pending
    </StatusBadge>
  );
}

/** Lesson card: thumbnail, category, reading time, title and a read action. */
export function ArticleCard({ lesson, featured, className }: { lesson: Lesson; featured?: boolean; className?: string }) {
  const lang = usePrefs((s) => s.contentLang);
  const f = formatInfo[lesson.format];
  const title = tr(lesson.title, lang);
  return (
    <article className={clsx('flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card', featured && 'sm:flex-row', className)}>
      <div className={clsx('flex shrink-0 items-center justify-center bg-accent-soft', featured ? 'h-40 sm:h-auto sm:w-64' : 'h-32')}>
        <Illustration name={lesson.art[0] ?? 'mother_baby'} className={featured ? 'h-28 w-40 sm:h-32 sm:w-48' : 'h-24 w-32'} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <p className="t-label truncate">{categoryName(lesson.category)}</p>
        <h3 className={clsx('mt-2 font-display font-bold text-ink', featured ? 'text-h3' : 'text-body')}>{title}</h3>
        <div className="t-small mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden /> {lesson.minutes} min
          </span>
          <span className="inline-flex items-center gap-1">
            <f.icon className="h-4 w-4" aria-hidden /> {f.label}
          </span>
        </div>
        {featured && <p className="t-small mt-3 line-clamp-2">{lesson.steps[lang][0]}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <ReviewBadge lesson={lesson} />
          <Link to={`/library/${lesson.id}`} className={buttonClass({ variant: featured ? 'primary' : 'outline', size: 'sm' })} aria-label={`Read article: ${title}`}>
            Read article
          </Link>
        </div>
      </div>
    </article>
  );
}
