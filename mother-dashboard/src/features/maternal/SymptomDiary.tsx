import { NotebookPen, PhoneCall, Plus, Siren, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, ButtonLink, IconButton } from '@/components/common/Button';
import { HealthCard } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/StateViews';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Chip, FormField, TextArea } from '@/components/forms/FormField';
import { content, tr } from '@/data/content';
import { useCare } from '@/hooks/useCare';
import { usePrefs } from '@/store/prefs';
import { useRecords } from '@/store/records';
import type { DangerSign, DiaryEntry } from '@/types';
import { fmtDate, fmtTime, localDay } from '@/utils/dates';

/** Signs she can pick, for her stage (after birth: her own signs only; baby signs live on My Baby). */
const signsFor = (postpartum: boolean): DangerSign[] => (postpartum ? content.postpartumSigns : content.pregnancySigns).filter((s) => s.level !== 'green');

/**
 * What the diary says after saving. It never reassures: with no danger sign picked it only
 * confirms the entry was saved and points to care if she is worried.
 */
export function diaryOutcome(entry: Pick<DiaryEntry, 'dangerSigns'>, postpartum: boolean): 'red' | 'yellow' | 'saved' {
  const list = signsFor(postpartum);
  const levels = entry.dangerSigns.map((k) => list.find((s) => s.key === k)?.level);
  if (levels.includes('red')) return 'red';
  if (levels.some((l) => l === 'yellow' || l === 'age')) return 'yellow';
  return 'saved';
}

export function OutcomeMessage({ outcome }: { outcome: 'red' | 'yellow' | 'saved' }) {
  if (outcome === 'red')
    return (
      <HealthCard tone="danger">
        <p className="flex items-center gap-2 font-display text-body font-bold text-danger">
          <Siren className="h-5 w-5" aria-hidden /> Go to a health facility now
        </p>
        <p className="t-small mt-1 text-ink">You noted a danger sign. Do not wait. Ask someone to go with you.</p>
        <ButtonLink to="/emergency" variant="danger" size="sm" icon={Siren} className="mt-3">
          Open emergency plan
        </ButtonLink>
      </HealthCard>
    );
  if (outcome === 'yellow')
    return (
      <HealthCard tone="warning">
        <p className="flex items-center gap-2 font-display text-body font-bold text-warning">
          <PhoneCall className="h-5 w-5" aria-hidden /> See a health worker today
        </p>
        <p className="t-small mt-1 text-ink">You noted a sign that needs a health worker today. Go now if it gets worse.</p>
      </HealthCard>
    );
  return (
    <HealthCard tone="primary">
      <p className="font-semibold text-ink">Saved in your diary.</p>
      <p className="t-small mt-1 text-ink">The diary records how you feel. It does not check your health. If you are worried, contact your health worker.</p>
    </HealthCard>
  );
}

export function SymptomDiary() {
  const { stage } = useCare();
  const postpartum = stage === 'postpartum';
  const diary = useRecords((s) => s.diary);
  const addDiary = useRecords((s) => s.addDiary);
  const removeDiary = useRecords((s) => s.removeDiary);
  const lang = usePrefs((s) => s.contentLang);
  const [open, setOpen] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [signs, setSigns] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<'red' | 'yellow' | 'saved' | null>(null);
  const list = signsFor(postpartum);

  const reset = () => {
    setSymptoms([]);
    setSigns([]);
    setNote('');
    setResult(null);
  };
  const toggle = (arr: string[], set: (v: string[]) => void, k: string) => set(arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k]);
  const canSave = symptoms.length > 0 || signs.length > 0 || note.trim().length > 0;

  const save = () => {
    const entry = { date: new Date().toISOString(), symptoms, dangerSigns: signs, note: note.trim() || undefined };
    addDiary(entry);
    setResult(diaryOutcome(entry, postpartum));
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-small max-w-prose">Note how you feel each day. Your health worker can look at it with you.</p>
        <Button
          icon={Plus}
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          Add diary entry
        </Button>
      </div>

      {diary.length === 0 ? (
        <EmptyState icon={NotebookPen} title="No diary entries yet" text="Your entries stay on this device." className="mt-4" />
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {diary.slice(0, 20).map((e) => {
            const o = diaryOutcome(e, postpartum);
            return (
              <li key={e.id} className="flex items-start gap-3 rounded-md border border-line bg-surface p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="t-num font-semibold text-ink">
                      {fmtDate(localDay(e.date))} · {fmtTime(e.date)}
                    </p>
                    {o === 'red' && <StatusBadge tone="danger">Danger sign noted</StatusBadge>}
                    {o === 'yellow' && <StatusBadge tone="warning">See a health worker today</StatusBadge>}
                  </div>
                  {(e.symptoms.length > 0 || e.dangerSigns.length > 0) && (
                    <p className="t-small mt-1">
                      {[...e.dangerSigns.map((k) => tr(list.find((s) => s.key === k), lang) || k), ...e.symptoms].join(' · ')}
                    </p>
                  )}
                  {e.note && <p className="t-small mt-1 text-ink">“{e.note}”</p>}
                </div>
                <IconButton icon={Trash2} label={`Delete entry from ${fmtDate(localDay(e.date))}`} onClick={() => removeDiary(e.id)} />
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={result ? 'Diary entry saved' : 'How are you feeling today?'}
        description={result ? undefined : 'Pick anything that applies. Danger signs are listed first.'}
        footer={
          result ? (
            <Button onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={!canSave}>
                Save entry
              </Button>
            </>
          )
        }
      >
        {result ? (
          <OutcomeMessage outcome={result} />
        ) : (
          <div className="flex flex-col gap-6">
            <fieldset>
              <legend className="mb-3 font-semibold text-ink">Danger signs</legend>
              <div className="flex flex-wrap gap-2">
                {list.map((s) => (
                  <Chip key={s.key} tone="danger" selected={signs.includes(s.key)} onClick={() => toggle(signs, setSigns, s.key)}>
                    {tr(s, lang)}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 font-semibold text-ink">Other symptoms</legend>
              <div className="flex flex-wrap gap-2">
                {content.diarySymptoms.map((s) => (
                  <Chip key={s} selected={symptoms.includes(s)} onClick={() => toggle(symptoms, setSymptoms, s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <FormField label="Notes (optional)" hint="Anything you want to remember for your next visit.">
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </FormField>
          </div>
        )}
      </Modal>
    </>
  );
}
