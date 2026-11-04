import clsx from 'clsx';
import { BookOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArticleCard } from '@/components/cards/ArticleCard';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/StateViews';
import { SearchInput } from '@/components/forms/FormField';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { content, tr } from '@/data/content';
import { featuredLessonFor } from './featured';
import { useCare } from '@/hooks/useCare';
import { usePrefs } from '@/store/prefs';

/** Health Library: categories, search, featured lesson for her stage. Works without a profile. */
export function LibraryPage() {
  const lang = usePrefs((s) => s.contentLang);
  const { stage, preg, babyI } = useCare();
  const [params, setParams] = useSearchParams();
  const cat = params.get('category') ?? 'all';
  const [q, setQ] = useState('');
  const [mine, setMine] = useState(false);

  const featured = featuredLessonFor(stage, preg?.weeks, babyI?.days);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return content.lessons.filter((l) => {
      if (cat !== 'all' && l.category !== cat) return false;
      if (mine && stage && !(l.stage === 'all' || (stage === 'postpartum' ? l.stage === 'baby' : l.stage === 'pregnant'))) return false;
      if (!needle) return true;
      return [l.title.en, l.title.sw, ...l.steps.en, ...l.steps.sw].some((t) => t.toLowerCase().includes(needle));
    });
  }, [q, cat, mine, stage]);

  const setCat = (k: string) => {
    const p = new URLSearchParams(params);
    if (k === 'all') p.delete('category');
    else p.set('category', k);
    setParams(p, { replace: true });
  };
  const filtering = q || cat !== 'all' || mine;

  return (
    <>
      <PageHeader title="Health Library" subtitle="Short lessons on pregnancy, birth, feeding and newborn care. Each one lists its sources." />
      <div className="flex flex-col gap-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search lessons, e.g. breastfeeding" label="Search lessons" />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {[{ key: 'all', en: 'All topics', sw: 'Mada zote' }, ...content.libraryCategories].map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={cat === c.key}
              onClick={() => setCat(c.key)}
              className={clsx(
                'min-h-11 rounded-full border px-4 text-small font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary',
                cat === c.key ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink hover:border-primary/40',
              )}
            >
              {tr(c, lang)}
            </button>
          ))}
          {stage && (
            <button
              type="button"
              aria-pressed={mine}
              onClick={() => setMine((m) => !m)}
              className={clsx('min-h-11 rounded-full border px-4 text-small font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary', mine ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink hover:border-primary/40')}
            >
              For my stage
            </button>
          )}
        </div>
      </div>

      {!filtering && (
        <section className="mt-8">
          <SectionHeader title="Featured for you" />
          <ArticleCard lesson={featured} featured />
        </section>
      )}

      <section className="mt-8" aria-live="polite">
        <SectionHeader title={filtering ? `${list.length} lesson${list.length === 1 ? '' : 's'} found` : 'All lessons'} />
        {list.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No lessons match"
            text="Try another word or topic."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQ('');
                  setCat('all');
                  setMine(false);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {list.map((l) => (
              <ArticleCard key={l.id} lesson={l} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
