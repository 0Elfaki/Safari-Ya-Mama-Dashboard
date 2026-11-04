import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Info, MessageCircleHeart, PhoneCall, SendHorizontal, Siren, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, ButtonLink } from '@/components/common/Button';
import { BaseCard } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCare } from '@/hooks/useCare';
import { suggestions } from '@/services/mamabot';
import { useChat } from '@/store/chat';
import { usePrefs } from '@/store/prefs';
import type { ChatMessage } from '@/types';
import { fmtTime } from '@/utils/dates';

const schema = z.object({ text: z.string().trim().min(2, 'Type a question first').max(500, 'Keep your question under 500 characters') });

function Bubble({ m }: { m: ChatMessage }) {
  const mine = m.role === 'user';
  return (
    <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={clsx('max-w-[85%] sm:max-w-[75%]', mine ? 'items-end' : 'items-start')}>
        {!mine && m.urgent === 'red' && (
          <div className="mb-2 rounded-md border border-danger/30 bg-danger-soft p-3">
            <p className="flex items-center gap-2 text-small font-bold text-danger">
              <Siren className="h-4 w-4 shrink-0" aria-hidden /> This may be an emergency
            </p>
            <ButtonLink to="/emergency" variant="danger" size="sm" icon={Siren} className="mt-2">
              Open emergency plan
            </ButtonLink>
          </div>
        )}
        {!mine && m.urgent === 'yellow' && (
          <p className="mb-2 flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-small font-semibold text-warning">
            <PhoneCall className="h-4 w-4 shrink-0" aria-hidden /> Talk to a health worker today
          </p>
        )}
        <div className={clsx('rounded-lg px-4 py-3 text-body', mine ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm border border-line bg-surface text-ink')}>
          <span className="sr-only">{mine ? 'You said: ' : 'MamaBot said: '}</span>
          {m.text}
        </div>
        <p className={clsx('t-caption mt-1', mine && 'text-right')}>{fmtTime(m.at)}</p>
      </div>
    </motion.li>
  );
}

export function MamaBotPage() {
  const { stage } = useCare();
  const messages = useChat((s) => s.messages);
  const send = useChat((s) => s.send);
  const clear = useChat((s) => s.clear);
  const lang = usePrefs((s) => s.contentLang);
  const [confirm, setConfirm] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const { register, handleSubmit, reset, formState, setFocus } = useForm<{ text: string }>({ resolver: zodResolver(schema), defaultValues: { text: '' } });

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const ask = (text: string) => {
    send(text, lang);
    reset({ text: '' });
    setFocus('text');
  };
  const onSubmit = handleSubmit(({ text }) => ask(text.trim()));
  const starters = suggestions[stage ?? 'pregnancy'];

  return (
    <>
      <PageHeader
        title="MamaBot"
        subtitle="Guided maternal and newborn health information."
        actions={
          messages.length > 0 && (
            <Button variant="outline" size="sm" icon={Trash2} onClick={() => setConfirm(true)}>
              Clear history
            </Button>
          )
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <BaseCard padded={false} className="flex flex-col xl:col-span-2 xl:min-h-[60dvh]">
          <div role="note" className="flex items-start gap-3 border-b border-line bg-surface-2 px-5 py-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="t-small text-ink">
              MamaBot shares information from Safari ya Mama's lessons. It is <strong>not a doctor</strong>, cannot diagnose and is not an emergency service. If you have a danger sign, go to a health facility now.
            </p>
          </div>
          <ul ref={listRef} aria-live="polite" aria-label="Conversation" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-5">
            {messages.length === 0 ? (
              <li className="m-auto flex max-w-prose flex-col items-center gap-3 py-4 text-center sm:py-8">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden>
                  <MessageCircleHeart className="h-7 w-7" />
                </span>
                <p className="t-h3">Hello, I'm MamaBot</p>
                <p className="t-small">Ask about pregnancy, getting ready for birth, feeding or caring for your baby. Try a question below.</p>
              </li>
            ) : (
              messages.map((m) => <Bubble key={m.id} m={m} />)
            )}
          </ul>
          <div className="border-t border-line p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap gap-2" aria-label="Suggested questions">
              {starters.map((q) => (
                <button key={q} type="button" onClick={() => ask(q)} className="min-h-11 rounded-full border border-line bg-surface px-4 text-small font-medium text-ink transition-colors hover:border-primary/40 hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary">
                  {q}
                </button>
              ))}
            </div>
            <form onSubmit={onSubmit} className="flex items-start gap-2" noValidate>
              <div className="min-w-0 flex-1">
                <label htmlFor="mamabot-input" className="sr-only">
                  Your question
                </label>
                <input
                  id="mamabot-input"
                  autoComplete="off"
                  placeholder="Type your question…"
                  aria-invalid={!!formState.errors.text}
                  aria-describedby={formState.errors.text ? 'mamabot-err' : undefined}
                  className={clsx(
                    'block min-h-12 w-full rounded-md border bg-surface px-4 text-body text-ink placeholder:text-ink-2/70 focus:outline-none focus:ring-2 focus:ring-primary/30',
                    formState.errors.text ? 'border-danger' : 'border-line focus:border-primary',
                  )}
                  {...register('text')}
                />
                {formState.errors.text && (
                  <p id="mamabot-err" className="mt-1 text-caption font-semibold text-danger">
                    {formState.errors.text.message}
                  </p>
                )}
              </div>
              <Button type="submit" icon={SendHorizontal} aria-label="Send question" className="px-4">
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </div>
        </BaseCard>

        <div className="flex min-w-0 flex-col gap-6">
          <BaseCard>
            <h2 className="t-h3">How MamaBot works</h2>
            <ul className="t-small mt-3 flex list-disc flex-col gap-2 pl-5 text-ink">
              <li>Answers come only from Safari ya Mama's scripted answers, which follow WHO guidance. Nothing is made up.</li>
              <li>If your question mentions a danger sign, MamaBot tells you to seek care.</li>
              <li>Your conversation stays on this device. Clear it any time.</li>
            </ul>
          </BaseCard>
          <BaseCard className="border-danger/30">
            <h2 className="flex items-center gap-2 font-display text-h3 font-bold text-danger">
              <Siren className="h-5 w-5" aria-hidden /> In an emergency
            </h2>
            <p className="t-small mt-2 text-ink">Do not wait for an answer. Go to a health facility now.</p>
            <ButtonLink to="/emergency" variant="danger" icon={Siren} block className="mt-4">
              Emergency plan
            </ButtonLink>
          </BaseCard>
        </div>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Clear conversation?"
        description="This removes your MamaBot history from this device."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Keep
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                clear();
                setConfirm(false);
              }}
            >
              Clear history
            </Button>
          </>
        }
      >
        <p className="t-small text-ink">You cannot undo this.</p>
      </Modal>
    </>
  );
}
