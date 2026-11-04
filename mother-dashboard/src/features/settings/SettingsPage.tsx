import clsx from 'clsx';
import { Download, Eye, FlaskConical, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { BaseCard, CardHeader } from '@/components/common/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { SyncStatus } from '@/components/layout/SyncStatus';
import { content } from '@/data/content';
import { scenarioLabels, type Scenario } from '@/data/mock/scenarios';
import { useChecklist } from '@/store/checklist';
import { useRecords } from '@/store/records';
import { useUi, type PreviewState } from '@/store/ui';

function downloadRecords() {
  const s = useRecords.getState();
  const data = { exportedAt: new Date().toISOString(), mother: s.mother, baby: s.baby, appointments: s.appointments, emergencyPlan: s.plan, diary: s.diary, feeds: s.feeds, checklist: useChecklist.getState().done };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'safari-ya-mama-records.json' });
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const scenario = useRecords((s) => s.scenario);
  const mother = useRecords((s) => s.mother);
  const loadScenario = useRecords((s) => s.loadScenario);
  const clearAll = useRecords((s) => s.clearAll);
  const preview = useUi((s) => s.preview);
  const setPreview = useUi((s) => s.setPreview);
  const hasOwn = !!mother && mother.source !== 'demo';

  return (
    <>
      <PageHeader title="Settings" subtitle="Demo data, design review and data on this device." />
      <div className="grid gap-6 xl:grid-cols-2">
        <BaseCard id="demo" tabIndex={-1} className="scroll-mt-24 outline-none" aria-labelledby="demo-title">
          <CardHeader id="demo-title" icon={FlaskConical} title="Demo data" subtitle="Illustrative records for exploring each care stage. They describe no real person." tone="accent" />
          {hasOwn && <p className="mb-4 rounded-md bg-warning-soft p-3 text-small text-ink">Loading a demo replaces the records you entered on this device.</p>}
          <ul className="flex flex-col gap-3">
            {(Object.keys(scenarioLabels) as Scenario[]).map((k) => (
              <li key={k}>
                <button
                  type="button"
                  aria-pressed={scenario === k}
                  onClick={() => {
                    setPreview('live');
                    loadScenario(k);
                  }}
                  className={clsx('flex w-full min-h-14 items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary', scenario === k ? 'border-primary bg-primary-soft' : 'border-line hover:border-primary/40')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{scenarioLabels[k].title}</span>
                    <span className="t-small block">{scenarioLabels[k].detail}</span>
                  </span>
                  {scenario === k && <StatusBadge tone="primary">Loaded</StatusBadge>}
                </button>
              </li>
            ))}
          </ul>
          {scenario && (
            <Button variant="outline" icon={Trash2} className="mt-4" onClick={clearAll}>
              Remove demo data
            </Button>
          )}
        </BaseCard>

        <div className="flex min-w-0 flex-col gap-6">
          <BaseCard id="review" aria-labelledby="review-title">
            <CardHeader id="review-title" icon={Eye} title="Design review" subtitle="Preview how screens look while loading, with no records, or after an error. Your records are not changed." />
            <div role="radiogroup" aria-label="Preview state" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ['live', 'Live'],
                  ['loading', 'Loading'],
                  ['empty', 'Empty'],
                  ['error', 'Error'],
                ] as [PreviewState, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={preview === k}
                  onClick={() => setPreview(k)}
                  className={clsx('min-h-11 rounded-md border px-3 text-small font-semibold focus-visible:ring-2 focus-visible:ring-primary', preview === k ? 'border-primary bg-primary text-white' : 'border-line text-ink hover:border-primary/40')}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="t-caption mt-3">Resets to Live when you reload. Offline state appears when your device loses its connection.</p>
          </BaseCard>

          <BaseCard aria-labelledby="data-title">
            <CardHeader id="data-title" icon={Download} title="Data on this device" />
            <SyncStatus />
            <p className="t-small mt-2">This preview has no clinic account connection. Records stay in this browser and are not sent anywhere.</p>
            <Button variant="outline" icon={Download} className="mt-4" onClick={downloadRecords} disabled={!mother}>
              Download my records
            </Button>
          </BaseCard>

          <BaseCard aria-labelledby="about-title">
            <CardHeader id="about-title" icon={Info} title="About" />
            <dl className="grid gap-3 text-small">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">Warning rules version</dt>
                <dd className="t-num font-semibold">{content.rulesVersion}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">Lessons</dt>
                <dd className="t-num font-semibold">{content.lessons.length}</dd>
              </div>
            </dl>
            <p className="t-caption mt-4">Health content comes from the Safari ya Mama content pack shared with the app and website, with WHO sources listed on each lesson. Safari ya Mama supports your health worker. It does not replace them.</p>
          </BaseCard>
        </div>
      </div>
    </>
  );
}
