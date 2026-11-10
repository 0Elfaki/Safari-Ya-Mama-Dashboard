import { ShieldCheck, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/Bits';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { mfaRequired, setRequireMfa } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';

/** Two-step sign-in on or on hold (security_settings.require_mfa). Super admin only. */
export function SecuritySwitch() {
  const s = useSession();
  const t = useT();
  const toast = useToast();
  const { data: on, reload } = useAsync(() => mfaRequired(), []);
  const [busy, setBusy] = useState(false);
  if (on === null || on === undefined) return null;
  return (
    <BaseCard className="mb-6">
      <CardHeader icon={on ? ShieldCheck : ShieldOff} tone={on ? 'primary' : 'warning'} title={t('Two-step sign-in')}
        subtitle={on ? t('Admins and the website team confirm every sign-in with a 6-digit code.') : t('On hold: everyone signs in with email and password only.')}
        badge={on ? <StatusBadge tone="success">{t('Required')}</StatusBadge> : <StatusBadge tone="warning">{t('On hold')}</StatusBadge>} />
      {s.isSuper ? (
        <div className="max-w-prose">
          <Toggle label={t('Require the 6-digit code')} description={t('Turn this on before real patient data is used. The next sign-in then asks for the code (and sets up the authenticator the first time).')}
            checked={on} onChange={async (v) => {
              if (busy) return;
              if (!v && !confirm(t('Put two-step sign-in on hold? Anyone with a password could then open admin pages.'))) return;
              setBusy(true);
              try { await setRequireMfa(v); toast(v ? t('Two-step sign-in is required again') : t('Two-step sign-in is on hold')); reload(true); } catch (e) { toast((e as Error).message, 'bad'); }
              setBusy(false);
            }} />
        </div>
      ) : <p className="t-small">{t('Only the super admin can change this.')}</p>}
    </BaseCard>
  );
}
