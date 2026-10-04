import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { BookScene } from '../lib/book-scene';
import { renderBookPage } from '../lib/page-texture';
import type { JournalBook, JournalEntry } from '../lib/model';

export type BookMode = 'browse' | 'write';
export interface WritingRect { left: number; top: number; width: number; height: number }
interface Props {
  book: JournalBook; entry: JournalEntry; artReady: boolean;
  mode: BookMode; onModeChange: (mode: BookMode) => void;
  onRectChange: (rect: WritingRect | null) => void;
  onAvailability: (available: boolean) => void;
  onTurningChange: (turning: boolean) => void;
  getArt: (id: string) => string | undefined;
  children: ReactNode;
}

const coverColors = { mountain: '#608678', orchid: '#C87560', indigo: '#DCE8E0' };

export function BookViewport({ book, entry, artReady, mode, onModeChange, onRectChange, onAvailability, onTurningChange, getArt, children }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<BookScene | null>(null);
  const handlers = useRef({ onModeChange, onRectChange, onAvailability, onTurningChange });
  handlers.current = { onModeChange, onRectChange, onAvailability, onTurningChange };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const previousDate = useRef<string | null>(null);

  useEffect(() => {
    if (!host.current) return;
    let active = true;
    try {
      const scene = new BookScene(host.current, {
        coverColor: coverColors[book.cover], coverTitle: book.title,
        onPageClick: () => handlers.current.onModeChange('write'),
        onError: message => {
          if (!active) return;
          setError(message); handlers.current.onAvailability(false);
          handlers.current.onModeChange('write');
        },
        onStateChange: next => {
          if (!active) return;
          handlers.current.onRectChange(next.writingRect);
        },
      });
      engine.current = scene; setReady(true); handlers.current.onAvailability(true);
    } catch {
      setError('当前设备无法显示立体册子，仍可继续书写。');
      handlers.current.onAvailability(false); handlers.current.onModeChange('write');
    }
    return () => { active = false; generation.current++; engine.current?.dispose(); engine.current = null; handlers.current.onTurningChange(false); handlers.current.onRectChange(null); };
    // A mounted notebook keeps its camera and GPU resources while editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const scene = engine.current;
    if (!scene) return;
    if (scene.state.mode === mode && scene.state.settled) {
      handlers.current.onRectChange(scene.state.writingRect);
      return;
    }
    handlers.current.onRectChange(null);
    scene.setMode(mode);
  }, [mode, ready]);

  useEffect(() => {
    const scene = engine.current;
    if (!scene) return;
    let active = true;
    void document.fonts.ready.then(() => { if (active) return scene.setCover({ color: coverColors[book.cover], title: book.title }); }).catch(() => { if (active) setError('封面暂时无法读取，原记录仍已保留。'); });
    return () => { active = false; };
  }, [book.cover, book.title, ready]);

  useEffect(() => {
    if (!ready || !artReady) return;
    const token = ++generation.current;
    const delay = previousDate.current === entry.date ? 180 : 0;
    const timer = window.setTimeout(async () => {
      try {
        const page = await renderBookPage(entry, book.title, getArt);
        const scene = engine.current;
        if (!scene || token !== generation.current) return;
        const oldDate = previousDate.current;
        previousDate.current = entry.date;
        if (oldDate && oldDate !== entry.date && scene.state.open) {
          handlers.current.onTurningChange(true);
          await scene.flipTo(page.pageSrc, { direction: entry.date > oldDate ? 'next' : 'previous' });
          if (token !== generation.current) return;
        } else await scene.setPageTexture(page.pageSrc);
        if (token !== generation.current) return;
        await scene.setObjects(page.objects);
        setError('');
      } catch {
        if (token === generation.current) setError('这页暂时无法显示，请稍后重试；原记录仍已保留。');
      } finally {
        if (token === generation.current) handlers.current.onTurningChange(false);
      }
    }, delay);
    return () => { window.clearTimeout(timer); generation.current++; };
  }, [entry, book.title, artReady, ready, getArt]);

  return <>
    <div className={`live-book-stage ${mode === 'write' ? 'is-writing' : ''}`} data-mode={mode}>
      <div className="book-canvas-host" ref={host} aria-label="有空间层次的手账画布" />
      {children}
    </div>
    {error && <p className="book-render-notice" role="status">{error}</p>}
    {!error && mode === 'browse' && <div className="book-view-controls" aria-label="册子视角">
        <button className="button primary" aria-label="写一笔" onClick={() => handlers.current.onModeChange('write')}>继续书写</button>
        <button className="icon-button" aria-label="复位视角" onClick={() => engine.current?.resetView()}><RotateCcw size={15} /></button>
    </div>}
    {mode === 'browse' && !error && <p className="book-3d-hint">拖动查看层次 · 点画布继续写</p>}
  </>;
}
