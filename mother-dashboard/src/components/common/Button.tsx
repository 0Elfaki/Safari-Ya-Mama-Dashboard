import clsx from 'clsx';
import { Loader2, type LucideIcon } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * The app's buttons. One shape: 48 px high (44 px minimum touch target in compact form),
 * radius 12, Inter semibold. Variants carry meaning: primary = main action, secondary = quiet
 * action, outline = alternative, ghost = inline, danger = emergency only.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const base =
  'inline-flex max-w-full items-center justify-center gap-2 rounded-md font-body font-semibold transition-colors duration-150 select-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';
const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80',
  secondary: 'bg-primary-soft text-primary hover:bg-primary/15',
  outline: 'border border-line bg-surface text-primary hover:border-primary/40 hover:bg-primary-soft/60',
  ghost: 'text-primary hover:bg-primary-soft',
  danger: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80 focus-visible:ring-danger',
};
const sizes: Record<ButtonSize, string> = {
  md: 'min-h-12 px-5 text-body',
  sm: 'min-h-11 px-4 text-small',
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  block?: boolean;
  children: ReactNode;
  className?: string;
}

export const buttonClass = ({ variant = 'primary', size = 'md', block, className }: Pick<CommonProps, 'variant' | 'size' | 'block' | 'className'>) =>
  clsx(base, variants[variant], sizes[size], block && 'w-full', className);

type ButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon: Icon, iconRight: IconRight, loading, block, className, children, type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass({ variant, size, block, className })} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
      <span className="min-w-0 truncate">{children}</span>
      {IconRight && <IconRight className="h-5 w-5 shrink-0" aria-hidden />}
    </button>
  );
});

export const PrimaryButton = (p: Omit<ButtonProps, 'variant'>) => <Button {...p} variant="primary" />;
export const SecondaryButton = (p: Omit<ButtonProps, 'variant'>) => <Button {...p} variant="secondary" />;

/** A button that navigates. Same styles as Button. */
export function ButtonLink({
  to,
  variant,
  size,
  icon: Icon,
  iconRight: IconRight,
  block,
  className,
  children,
  external,
  ...rest
}: CommonProps & { to: string; external?: boolean; 'aria-label'?: string }) {
  const cls = buttonClass({ variant, size, block, className });
  const inner = (
    <>
      {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
      <span className="min-w-0 truncate">{children}</span>
      {IconRight && <IconRight className="h-5 w-5 shrink-0" aria-hidden />}
    </>
  );
  if (external || /^(tel:|https?:|mailto:)/.test(to))
    return (
      <a href={to} className={cls} {...(to.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})} {...rest}>
        {inner}
      </a>
    );
  return (
    <Link to={to} className={cls} {...rest}>
      {inner}
    </Link>
  );
}

/** Icon-only button. A label is required so screen readers announce it. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  { icon: LucideIcon; label: string; variant?: 'ghost' | 'soft' | 'outline'; badge?: number; className?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>
>(function IconButton({ icon: Icon, label, variant = 'ghost', badge, className, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={badge ? `${label}, ${badge} new` : label}
      title={label}
      className={clsx(
        'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink transition-colors focus-visible:ring-2 focus-visible:ring-primary',
        variant === 'ghost' && 'hover:bg-primary-soft hover:text-primary',
        variant === 'soft' && 'bg-primary-soft text-primary hover:bg-primary/15',
        variant === 'outline' && 'border border-line bg-surface hover:border-primary/40 hover:text-primary',
        className,
      )}
      {...rest}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {!!badge && (
        <span className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-caption font-bold text-white" aria-hidden>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
});
