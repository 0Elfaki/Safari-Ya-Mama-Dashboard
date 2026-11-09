import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { useT } from '@/lib/i18n';

export interface MapPoint { id: string; name: string; lat: number; lng: number; active: boolean; detail: string }

/** Facility locations on OpenStreetMap. Dots are styled from the design tokens (see .map-dot in index.css). */
export default function FacilityMap({ points, onSelect }: { points: MapPoint[]; onSelect?: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const t = useT();

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { scrollWheelZoom: false, attributionControl: true }).setView([-6.4, 35.0], 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    for (const p of points) {
      const m = L.circleMarker([p.lat, p.lng], { radius: 9, className: p.active ? 'map-dot' : 'map-dot map-dot-off' });
      const box = document.createElement('div');
      const b = document.createElement('b'); b.textContent = p.name;
      const s = document.createElement('div'); s.textContent = p.detail;
      box.append(b, s);
      m.bindPopup(box).bindTooltip(p.name);
      if (onSelect) m.on('click', () => onSelect(p.id));
      m.addTo(layer.current);
    }
    if (points.length) map.current.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])).pad(0.3), { maxZoom: 11 });
  }, [points, onSelect]);

  // relative + isolate: the tiles (absolutely positioned) are always clipped to the map, never widening the page
  return (
    <div className="relative isolate overflow-hidden rounded-md border border-line">
      <div ref={el} className="relative h-80 w-full overflow-hidden" role="region" aria-label={t('Map of {n} facilities', { n: points.length })} />
    </div>
  );
}
