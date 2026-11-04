import clsx from 'clsx';

const files = import.meta.glob('../../assets/illus/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const byKey = Object.fromEntries(Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.svg', ''), url]));

/** Brand illustration from the app's shared set (assets/illus). Decorative unless `alt` is given. */
export function Illustration({ name, alt = '', className }: { name: string; alt?: string; className?: string }) {
  const src = byKey[name] ?? byKey.mother_baby;
  return <img src={src} alt={alt} aria-hidden={alt ? undefined : true} className={clsx('select-none object-contain', className)} draggable={false} />;
}
