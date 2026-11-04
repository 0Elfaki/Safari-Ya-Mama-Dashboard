import clsx from 'clsx';
import { ArrowLeft, BookMarked, Clock, Pause, Play, Square, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArticleCard, categoryName, formatInfo, ReviewBadge } from '@/components/cards/ArticleCard';
import { Button, ButtonLink } from '@/components/common/Button';
import { BaseCard } from '@/components/common/Card';
import { Illustration } from '@/components/common/Illustration';
import { EmptyState } from '@/components/common/StateViews';
import { SectionHeader } from '@/components/layout/PageHeader';
import { content, lessonById, tr } from '@/data/content';
import { usePrefs } from '@/store/prefs';

type Speech = 'idle' | 'playing' | 'paused';

/** Reads the lesson aloud with the device's own text-to-speech, when it has one. */
function useReadAloud(text: string, lang: 'en' | 'sw') {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [state, setState] = useState<Speech>('idle');
  useEffect(() => () => void (supported && window.speechSynthesis.cancel()), [supported, text]);
  const play = () => {
    if (!supported) return;
    const s = window.speechSynthesis;
    if (state === 'paused') {
      s.resume();
      setState('playing');
      return;
    }
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'sw' ? 'sw-TZ' : 'en-GB';
    u.rate = 0.95;
    u.onend = () => setState('idle');
    u.onerror = () => setState('idle');
    s.speak(u);
    setState('playing');
  };
  const pause = () => {
    window.speechSynthesis.pause();
    setState('paused');
  };
  const stop = () => {
    window.speechSynthesis.cancel();
    setState('idle');
  };
  return { supported, state, play, pause, stop };
}

export function LessonPage() {
  const { id = '' } = useParams();
  const lesson = lessonById(id);
  const lang = usePrefs((s) => s.contentLang);
  const steps = lesson ? lesson.steps[lang] : [];
  const title = lesson ? tr(lesson.title, lang) : '';
  const audio = useReadAloud(`${title}. ${steps.join(' ')}`, lang);

  if (!lesson)
    return (
      <BaseCard>
        <EmptyState icon={BookMarked} title="Lesson not found" text="It may have been moved or retired." action={<ButtonLink to="/library" size="sm">Back to Health Library</ButtonLink>} />
      </BaseCard>
    );

  const f = formatInfo[lesson.format];
  const related = content.lessons.filter((l) => l.category === lesson.category && l.id !== lesson.id).slice(0, 3);

  return (
    <article>
      <Link to="/library" className="mb-4 inline-flex min-h-11 items-center gap-2 text-small font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Health Library
      </Link>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <BaseCard padded={false} className="overflow-hidden">
            <div className="flex h-48 items-center justify-center bg-accent-soft sm:h-56">
              <Illustration name={lesson.art[0] ?? 'mother_baby'} className="h-40 w-56 sm:h-48 sm:w-72" />
            </div>
            <div className="p-5 sm:p-8">
              <p className="t-label">{categoryName(lesson.category, lang)}</p>
              <h1 className="t-h1 mt-2 sm:text-display">{title}</h1>
              <div className="t-small mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" aria-hidden /> {lesson.minutes} min
                </span>
                <span className="inline-flex items-center gap-1">
                  <f.icon className="h-4 w-4" aria-hidden /> {f.label}
                </span>
                <ReviewBadge lesson={lesson} />
              </div>

              <ol className="mt-8 flex flex-col gap-4">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-4 rounded-lg border border-line bg-surface-2 p-4">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold text-white" aria-hidden>
                      {i + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                      <p className="t-body min-w-0 flex-1 text-ink">{s}</p>
                      {lesson.art[i] && <Illustration name={lesson.art[i]} className="h-16 w-24 shrink-0 self-start rounded-md bg-accent-soft p-1 sm:self-center" />}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </BaseCard>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <BaseCard aria-labelledby="listen-title">
            <h2 id="listen-title" className="t-h3 flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" aria-hidden /> Listen to this lesson
            </h2>
            {audio.supported ? (
              <>
                <p className="t-small mt-2">Uses your device's voice. Sound quality depends on your phone or browser.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {audio.state === 'playing' ? (
                    <Button icon={Pause} onClick={audio.pause}>
                      Pause
                    </Button>
                  ) : (
                    <Button icon={Play} onClick={audio.play}>
                      {audio.state === 'paused' ? 'Resume' : 'Play'}
                    </Button>
                  )}
                  <Button variant="outline" icon={Square} onClick={audio.stop} disabled={audio.state === 'idle'}>
                    Stop
                  </Button>
                </div>
                <p role="status" className={clsx('t-caption mt-3', audio.state === 'idle' && 'sr-only')}>
                  {audio.state === 'playing' ? 'Playing…' : audio.state === 'paused' ? 'Paused' : 'Stopped'}
                </p>
              </>
            ) : (
              <p className="t-small mt-2">Reading aloud is not available in this browser.</p>
            )}
          </BaseCard>

          <BaseCard aria-labelledby="sources-title">
            <h2 id="sources-title" className="t-h3">
              Sources
            </h2>
            {lesson.sources.length ? (
              <ul className="t-small mt-3 flex flex-col gap-2 text-ink">
                {lesson.sources.map((s) => (
                  <li key={s.key}>
                    {s.title}
                    {s.year ? ` (${s.year})` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-small mt-3">No source is listed for this lesson yet.</p>
            )}
            <p className="t-caption mt-4">
              {lesson.review ? `Reviewed by ${lesson.review.by} on ${lesson.review.on}.` : 'Clinical review of this lesson is pending. Follow your health worker’s advice.'}
            </p>
          </BaseCard>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <SectionHeader title="More on this topic" />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {related.map((l) => (
              <ArticleCard key={l.id} lesson={l} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
