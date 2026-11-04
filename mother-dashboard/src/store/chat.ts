import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { answer } from '@/services/mamabot';
import { localJSON, uid } from '@/services/storage';
import type { ChatMessage, Lang } from '@/types';

interface ChatState {
  messages: ChatMessage[];
  send: (text: string, lang: Lang) => void;
  clear: () => void;
}

export const useChat = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      send: (text, lang) => {
        const now = new Date().toISOString();
        const r = answer(text, lang);
        const added: ChatMessage[] = [
          { id: uid(), role: 'user', text, at: now },
          { id: uid(), role: 'bot', text: r.text, at: now, urgent: r.urgent },
        ];
        set({ messages: [...get().messages, ...added].slice(-100) });
      },
      clear: () => set({ messages: [] }),
    }),
    { name: 'sym-chat-v1', storage: localJSON(), partialize: ({ messages }) => ({ messages }) },
  ),
);
