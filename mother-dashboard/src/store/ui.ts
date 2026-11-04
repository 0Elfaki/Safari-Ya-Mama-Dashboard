import { create } from 'zustand';

/**
 * Session-only UI state. `preview` lets reviewers see the loading / empty / error designs
 * without touching real data (Settings → Design review). It is never persisted.
 */
export type PreviewState = 'live' | 'loading' | 'empty' | 'error';

interface UiState {
  drawerOpen: boolean;
  railExpanded: boolean;
  preview: PreviewState;
  setDrawer: (open: boolean) => void;
  setRailExpanded: (open: boolean) => void;
  setPreview: (p: PreviewState) => void;
}

export const useUi = create<UiState>()((set) => ({
  drawerOpen: false,
  railExpanded: false,
  preview: 'live',
  setDrawer: (drawerOpen) => set({ drawerOpen }),
  setRailExpanded: (railExpanded) => set({ railExpanded }),
  setPreview: (preview) => set({ preview }),
}));
