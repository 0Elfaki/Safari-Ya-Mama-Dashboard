import { AlertTriangle, Bot, Lock, MessagesSquare, Siren, Stethoscope } from 'lucide-react';
import { PageHeader } from '@/components/layout/Shell';
import { Tabs, useTab } from '@/components/ui/Bits';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import content from '@/data/content.json';
import ref from '@/data/clinical-reference.json';
import { msg, useT } from '@/lib/i18n';

type Sign = { en: string; sw: string; level: string; stage: string };
const signs = Object.entries(content.signs as Record<string, Sign>);
const STAGE: Record<string, string> = { pregnancy: msg('Pregnancy'), postnatal: msg('After birth'), baby: msg('Baby'), both: msg('Any time') };

function Locked() {
  const t = useT();
  return (
    <p className="mb-6 flex items-start gap-2 rounded-md border border-line bg-surface-2 px-4 py-3 text-small text-ink">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {t('Read-only. These rules decide what the app tells a woman with danger signs, so they are changed only by the app team, in code, with tests. Ask the app team if something here looks wrong.')}
    </p>
  );
}

function SignsTab() {
  const t = useT();
  const group = (lvl: string) => signs.filter(([, s]) => s.level === lvl);
  const red = group('red'), amber = signs.filter(([, s]) => s.level !== 'red');
  const list = (rows: [string, Sign][]) => (
    <ul className="divide-y divide-line">
      {rows.map(([k, s]) => (
        <li key={k} className="grid gap-1 py-2 sm:grid-cols-[1fr_1fr_8rem]">
          <span className="text-small font-semibold text-ink">{s.en}</span><span className="t-small">{s.sw}</span><span className="t-caption">{STAGE[s.stage] ? t(STAGE[s.stage]) : s.stage}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="grid gap-6">
      <p className="t-small max-w-prose">{t("What the mother ticks in her daily check, and the level the app gives it. Blood pressure, baby movements and the baby's feeding also raise levels (for example 160/110 or a baby not moving is red; 140/90 is amber). The server checks every result again (rate_checkin) and raises an alert for the facility.")}</p>
      <BaseCard><CardHeader icon={Siren} tone="danger" title={t('Red · go to a facility now ({n})', { n: red.length })} />{list(red)}</BaseCard>
      <BaseCard><CardHeader icon={AlertTriangle} tone="warning" title={t('Amber · see a health worker within 24 hours ({n})', { n: amber.length })} />{list(amber)}</BaseCard>
    </div>
  );
}

function MamaBotTab() {
  const t = useT();
  return (
    <div className="grid gap-6">
      <BaseCard>
        <CardHeader icon={Bot} title={t('Words that skip the AI')} subtitle={t('If a question contains any of these, MamaBot does not ask the AI. It answers at once with the safety message and opens Emergency help.')} />
        <ul className="flex flex-wrap gap-2">{ref.mamabot.urgent_words.map((w) => <li key={w}><StatusBadge tone="danger">{w}</StatusBadge></li>)}</ul>
      </BaseCard>
      <BaseCard>
        <CardHeader icon={Stethoscope} title={t('The safety message')} />
        <div className="grid gap-4 md:grid-cols-2">
          <blockquote className="rounded-md border border-line bg-surface-2 p-4 text-small text-ink"><p className="t-label mb-1">{t('English')}</p>{ref.mamabot.safety.en}</blockquote>
          <blockquote className="rounded-md border border-line bg-surface-2 p-4 text-small text-ink"><p className="t-label mb-1">{t('Kiswahili')}</p>{ref.mamabot.safety.sw}</blockquote>
        </div>
      </BaseCard>
    </div>
  );
}

function CircleTab() {
  const c = ref.circle;
  const t = useT();
  return (
    <div className="grid gap-6">
      <BaseCard>
        <CardHeader icon={MessagesSquare} title={t('Posts held for a health worker')} subtitle={t('A post with any of these words waits for review before others see it.')} />
        {(['urgent', 'selling', 'miracle', 'abuse'] as const).map((k) => (
          <div key={k} className="mb-3"><p className="t-label mb-2">{{ urgent: t('Danger signs (urgent first)'), selling: t('Selling'), miracle: t('Miracle cures'), abuse: t('Abuse') }[k]}</p>
            <ul className="flex flex-wrap gap-2">{(c[k] as string[]).map((w) => <li key={w}><StatusBadge tone={k === 'urgent' ? 'danger' : 'neutral'}>{w}</StatusBadge></li>)}</ul></div>
        ))}
      </BaseCard>
      <BaseCard>
        <CardHeader icon={Stethoscope} title={t('Myths and the checked facts shown with them ({n})', { n: c.myths.length })} subtitle={t('When a post repeats a common myth, it is held and the checked fact is offered.')} />
        <ul className="divide-y divide-line">
          {c.myths.map((m) => (
            <li key={m.id} className="grid gap-2 py-3 md:grid-cols-[10rem_1fr_1fr]">
              <span className="text-small font-semibold text-ink">{m.id}</span>
              <span className="t-small">{m.fact.en}</span><span className="t-small">{m.fact.sw}</span>
            </li>
          ))}
        </ul>
      </BaseCard>
    </div>
  );
}

const TABS = ['signs', 'mamabot', 'circle'] as const;
export default function RulesPage() {
  const [tab, setTab] = useTab(TABS, 'signs');
  const t = useT();
  return (
    <>
      <PageHeader title={t('Clinical rules')} subtitle={t("What the app does with danger signs, MamaBot's urgent words, and the Mothers' circle safety checks: so staff know exactly what mothers are told.")} />
      <Locked />
      <Tabs label={t('Rules')} value={tab} onChange={setTab} tabs={[{ value: 'signs', label: t('Warning signs'), icon: Siren }, { value: 'mamabot', label: 'MamaBot', icon: Bot }, { value: 'circle', label: t("Mothers' circle"), icon: MessagesSquare }]} />
      {tab === 'signs' ? <SignsTab /> : tab === 'mamabot' ? <MamaBotTab /> : <CircleTab />}
    </>
  );
}
