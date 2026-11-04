import clsx from 'clsx';
import { ArrowRight, MapPin, Phone, ShieldAlert, Siren, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { content, tr, urgentSigns } from '@/data/content';
import { usePrefs } from '@/store/prefs';
import { useRecords } from '@/store/records';
import type { CareStage } from '@/types';
import { ButtonLink } from '../common/Button';

export const NEAREST_FACILITY_URL = 'https://www.google.com/maps/search/?api=1&query=health+facility+near+me';

/** The danger signs that mean "go now" for the current stage (from the shared rules). */
export function stageUrgentSigns(stage: CareStage | null) {
  if (stage === 'postpartum') return { mother: urgentSigns(content.postpartumSigns), baby: urgentSigns(content.babySigns) };
  return { mother: urgentSigns(content.pregnancySigns), baby: [] };
}

/**
 * Emergency assistance. Red is used here and for the Emergency button only, and always with
 * an icon and words. Every shortcut is one tap: plan, contacts, nearest facility, call.
 */
export function EmergencyCard({ stage, className }: { stage: CareStage | null; className?: string }) {
  const lang = usePrefs((s) => s.contentLang);
  const plan = useRecords((s) => s.plan);
  const signs = stageUrgentSigns(stage);
  const facilityPhone = plan?.facility.phone;
  return (
    <section aria-labelledby="emergency-title" className={clsx('min-w-0 overflow-hidden rounded-lg border-2 border-danger/40 bg-surface shadow-card', className)}>
      <div className="bg-danger px-5 py-4 text-white sm:px-6">
        <div className="flex items-center gap-3">
          <Siren className="h-6 w-6 shrink-0" aria-hidden />
          <h2 id="emergency-title" className="font-display text-h3 font-bold text-white">
            Emergency assistance
          </h2>
        </div>
        <p className="mt-2 text-small font-medium text-white">If you notice any danger sign, go to a health facility now. Do not wait.</p>
      </div>
      <div className="p-5 sm:p-6">
        {[
          { who: stage === 'postpartum' ? 'You' : null, list: signs.mother.slice(0, 3) },
          { who: 'Your baby', list: signs.baby.slice(0, 2) },
        ]
          .filter((g) => g.list.length)
          .map((g) => (
            <div key={g.who ?? 'you'} className="mb-3">
              <p className="t-label">{g.who === 'Your baby' ? 'Go now if your baby has' : 'Go now if you have'}</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {g.list.map((s) => (
                  <li key={s.key} className="flex items-start gap-2 text-small text-ink">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                    <span>{tr(s, lang)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        <Link to="/emergency#danger-signs" className="inline-flex min-h-11 items-center gap-1 text-small font-semibold text-danger hover:underline">
          See all danger signs <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <ButtonLink to="/emergency" variant="danger" icon={Siren} block>
            Emergency plan
          </ButtonLink>
          <ButtonLink to="/emergency#contacts" variant="outline" icon={Users} block className="text-danger">
            Emergency contacts
          </ButtonLink>
          <ButtonLink to={NEAREST_FACILITY_URL} variant="outline" icon={MapPin} block className="text-danger" aria-label="Nearest facility (opens maps in a new tab)">
            Nearest facility
          </ButtonLink>
          {facilityPhone && (
            <ButtonLink to={`tel:${facilityPhone.replace(/\s+/g, '')}`} variant="outline" icon={Phone} block className="text-danger" aria-label={`Call facility, ${plan?.facility.name}`}>
              Call facility
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
