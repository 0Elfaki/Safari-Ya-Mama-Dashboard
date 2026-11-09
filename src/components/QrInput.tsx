import jsQR from 'jsqr';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { Button } from './ui/Button';
import { FormField, TextArea } from './ui/FormField';

type Detector = { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> };
declare global {
  interface Window { BarcodeDetector?: new (opts: { formats: string[] }) => Detector }
}

/**
 * Scan a QR with the camera (BarcodeDetector where the browser has it, otherwise the bundled jsQR
 * decoder; nothing loads from a CDN) or paste/type its text. Calls onCode with the text.
 */
export function QrInput({ onCode, label, placeholder, busy }: { onCode: (text: string) => void; label: string; placeholder: string; busy?: boolean }) {
  const [text, setText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const t = useT();
  const stop = () => { stream.current?.getTracks().forEach((tk) => tk.stop()); stream.current = null; setScanning(false); };
  useEffect(() => stop, []);

  useEffect(() => {
    if (!scanning) return;
    let alive = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
    const tick = async () => {
      if (!alive) return;
      const v = video.current;
      if (v && v.readyState >= 2) {
        let found: string | null = null;
        try {
          if (detector) found = (await detector.detect(v))[0]?.rawValue ?? null;
          else if (ctx) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            found = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data ?? null;
          }
        } catch { /* keep scanning */ }
        if (found) { stop(); setText(found); onCode(found); return; }
      }
      window.setTimeout(tick, 200);
    };
    tick();
    return () => { alive = false; };
  }, [scanning, onCode]);

  const start = async () => {
    setCamErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      stream.current = s;
      setScanning(true);
      requestAnimationFrame(() => { if (video.current) { video.current.srcObject = s; video.current.play().catch(() => undefined); } });
    } catch (e) {
      setCamErr((e as Error).name === 'NotAllowedError' ? t('Camera permission was refused. Allow the camera, or paste the QR text below.') : t('No camera is available. Paste the QR text below.'));
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {scanning ? <Button variant="outline" icon={CameraOff} onClick={stop}>{t('Stop camera')}</Button> : <Button variant="secondary" icon={Camera} onClick={start}>{t('Scan with camera')}</Button>}
      </div>
      {scanning && (
        <div className="relative overflow-hidden rounded-lg border border-line bg-ink">
          <video ref={video} className="aspect-video w-full object-cover" muted playsInline aria-label={t('Camera preview')} />
          <ScanLine className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 text-white/80" aria-hidden />
          <p className="absolute inset-x-0 bottom-0 bg-ink/60 px-4 py-2 text-small text-white">{t('Hold the QR code inside the frame.')}</p>
        </div>
      )}
      {camErr && <p role="alert" className="text-small font-semibold text-warning">{camErr}</p>}
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onCode(text.trim()); }}>
        <FormField label={label} hint={t('Or type or paste the text under the QR code on her phone.')}>
          <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} rows={2} spellCheck={false} autoComplete="off" className="font-body" />
        </FormField>
        <Button type="submit" loading={busy} disabled={!text.trim()} className="justify-self-start">{t('Check')}</Button>
      </form>
    </div>
  );
}
