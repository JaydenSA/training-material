'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DemoState, initialState } from '@/lib/demo';
const KEY = 'tipit-demo-v1';
const Context = createContext<{ state: DemoState; update: (fn: (s: DemoState) => DemoState) => void; reset: () => void; ready: boolean } | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);
  const [ready, setReady] = useState(false);
  useEffect(() => { try { const saved = localStorage.getItem(KEY); if (saved) { const value = JSON.parse(saved); if (value.restaurant && Array.isArray(value.employees) && Array.isArray(value.tips) && Array.isArray(value.tags) && Array.isArray(value.orders)) setState(value); } } catch { /* A fresh demo also works when storage is unavailable. */ } setReady(true); }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Continue in memory. */ } } }, [state, ready]);
  return <Context.Provider value={{ state, update: fn => setState(fn), reset: () => setState(initialState()), ready }}>{children}</Context.Provider>;
}
export function useDemo() { const ctx = useContext(Context); if (!ctx) throw new Error('Missing demo provider'); return ctx; }
