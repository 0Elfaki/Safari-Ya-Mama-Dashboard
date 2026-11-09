import { Crop as CropIcon, Move } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useT } from '@/lib/i18n';
import type { Crop } from '@/lib/image';

/**
 * Crop a picture to a fixed frame shape: drag (or use the arrow keys) to move it, the slider to zoom.
 * Returns the chosen part in source pixels.
 */
export function CropModal({ file, ratio, title, hint, onCancel, onDone }: {
  file: Blob | null; ratio: number; title: string; hint?: string; onCancel: () => void; onDone: (c: Crop) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [boxW, setBoxW] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u); setZoom(1); setNat(null);
    const i = new Image();
    i.onload = () => setNat({ w: i.naturalWidth, h: i.naturalHeight });
    i.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [url]);

  const boxH = boxW / ratio;
  const base = nat ? Math.max(boxW / nat.w, boxH / nat.h) : 1;
  const scale = base * zoom;
  const imgW = (nat?.w ?? 0) * scale, imgH = (nat?.h ?? 0) * scale;
  const clamp = (x: number, y: number) => ({ x: Math.min(0, Math.max(boxW - imgW, x)), y: Math.min(0, Math.max(boxH - imgH, y)) });
  // centre on first load and keep inside the frame when zoom or size changes
  useEffect(() => { if (nat && boxW) setOff((o) => (o.x === 0 && o.y === 0 && zoom === 1 ? clamp((boxW - imgW) / 2, (boxH - imgH) / 2) : clamp(o.x, o.y))); }, [nat, boxW, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const down = (e: PointerEvent) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y }; };
  const move = (e: PointerEvent) => { if (drag.current) setOff(clamp(drag.current.ox + e.clientX - drag.current.x, drag.current.oy + e.clientY - drag.current.y)); };
  const key = (e: KeyboardEvent) => {
    const d = e.shiftKey ? 40 : 10;
    const m = { ArrowLeft: [d, 0], ArrowRight: [-d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key];
    if (m) { e.preventDefault(); setOff((o) => clamp(o.x + m[0], o.y + m[1])); }
  };
  const done = () => {
    if (!nat) return;
    onDone({ sx: Math.round(-off.x / scale), sy: Math.round(-off.y / scale), sw: Math.round(boxW / scale), sh: Math.round(boxH / scale) });
  };

  return (
    <Modal open={!!file} onClose={onCancel} title={title} description={hint ?? t('Drag the picture (or use the arrow keys) to choose what shows in the frame. Zoom with the slider.')} wide
      footer={<><Button variant="outline" onClick={onCancel}>{t('Cancel')}</Button><Button icon={CropIcon} onClick={done} disabled={!nat}>{t('Use this crop')}</Button></>}>
      <div className="mx-auto w-full max-w-[44rem]">
        <div ref={box} tabIndex={0} role="application" aria-label={t('Crop frame. Use the arrow keys to move the picture.')}
          onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}
          className="relative w-full cursor-move touch-none select-none overflow-hidden rounded-md bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ height: boxH || undefined, aspectRatio: boxH ? undefined : String(ratio) }}>
          {url && nat && <img src={url} alt="" draggable={false} className="pointer-events-none absolute left-0 top-0 max-w-none" style={{ width: imgW, height: imgH, transform: `translate(${off.x}px, ${off.y}px)` }} />}
          <span className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-inset ring-white/70" aria-hidden />
        </div>
        <label className="mt-4 flex items-center gap-3 text-small font-semibold text-ink">
          <Move className="h-4 w-4 shrink-0 text-ink-2" aria-hidden /> {t('Zoom')}
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-11 w-full accent-primary" />
        </label>
        {nat && <p className="t-caption mt-1">{t('Original {w}×{h} px · the frame keeps {fw}×{fh} px of it.', { w: nat.w, h: nat.h, fw: Math.round(boxW / scale), fh: Math.round(boxH / scale) })}</p>}
      </div>
    </Modal>
  );
}
