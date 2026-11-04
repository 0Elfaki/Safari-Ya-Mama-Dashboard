import { UserRoundPlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useDataStatus } from '@/hooks/useCare';
import { ButtonLink } from '../common/Button';
import { BaseCard } from '../common/Card';
import { EmptyState, ErrorState, LoadingState } from '../common/StateViews';
import { PageHeader } from './PageHeader';

/** Shared guard for record-based pages: loading, error and first-run states. */
export function RecordsGate({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const status = useDataStatus();
  if (status === 'loading')
    return (
      <>
        <PageHeader title={title} subtitle={subtitle} />
        <LoadingState text="Loading your records…" />
      </>
    );
  if (status === 'error')
    return (
      <>
        <PageHeader title={title} subtitle={subtitle} />
        <ErrorState title="Your records could not be loaded" text="Your saved records could not be read on this device." onRetry={() => window.location.reload()} />
      </>
    );
  if (status === 'empty')
    return (
      <>
        <PageHeader title={title} subtitle={subtitle} />
        <BaseCard>
          <EmptyState
            icon={UserRoundPlus}
            title="No profile yet"
            text="Set up your profile to see this page, or explore with demo data from Settings."
            action={
              <>
                <ButtonLink to="/profile" size="sm">
                  Set up my profile
                </ButtonLink>
                <ButtonLink to="/settings#demo" variant="outline" size="sm">
                  Use demo data
                </ButtonLink>
              </>
            }
          />
        </BaseCard>
      </>
    );
  return <>{children}</>;
}
