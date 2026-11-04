import { Info, MessageCircleHeart } from 'lucide-react';
import { ButtonLink } from '../common/Button';
import { Illustration } from '../common/Illustration';

/** MamaBot entry point, with its limits stated up front. */
export function MamaBotCard() {
  return (
    <section aria-labelledby="mamabot-title" className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-primary/20 bg-primary-soft shadow-card">
      <div className="flex items-start gap-4 p-5 sm:p-6">
        <div className="min-w-0 flex-1">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary text-white" aria-hidden>
            <MessageCircleHeart className="h-5 w-5" />
          </span>
          <h2 id="mamabot-title" className="t-h3 mt-4">
            Have a question about your health?
          </h2>
          <p className="t-small mt-2 text-ink">Talk to MamaBot for guided maternal and newborn health information.</p>
        </div>
        <Illustration name="talk" className="hidden h-24 w-32 shrink-0 xs:block" />
      </div>
      <div className="mt-auto px-5 pb-5 sm:px-6 sm:pb-6">
        <ButtonLink to="/mamabot" icon={MessageCircleHeart} block>
          Start conversation
        </ButtonLink>
        <p className="t-caption mt-3 flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          MamaBot gives information from reviewed lessons. It is not a doctor, cannot diagnose and is not an emergency service.
        </p>
      </div>
    </section>
  );
}
