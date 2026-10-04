import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowDownToLine, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Copy, Download, Feather, ImagePlus, Layers, MoreHorizontal, Plus, Redo2, RotateCcw, Settings2, Trash2, Undo2, Upload, X } from 'lucide-react';
import { demoPhoto, stickers } from './data/art';
import { covers } from './data/identity';
import { printStickerCells } from './data/print';
import { floatStickerCells } from './data/float-art';
import { jadeStickerCells } from './data/jade-art';
import { prepareJadeArt, jadeArt } from './lib/jade-render';
import { prepareFloatArt, floatArt } from './lib/float-render';
import { preparePrintArt, printArt } from './lib/print-render';
import { clampObject, createEntry, loadState, localDate, PAGE_HEIGHT, PAGE_WIDTH, STORAGE_KEY, uid, validateState } from './lib/model';
import type { JournalBook, JournalEntry, JournalObject, JournalState } from './lib/model';
import { downloadBackup, downloadBlob, exportPagePng, normalizePhoto, parseBackup } from './lib/export';
import { useJournalHistory } from './lib/history';
import { prepareTactileArt, tactileArt } from './lib/tactile-render';
import { BookViewport } from './components/BookViewport';
import type { BookMode, WritingRect } from './components/BookViewport';

type View = 'editor' | 'books' | 'calendar';
type Tool = 'decorate' | 'page';
const moods = ['平静', '晴朗', '忙碌', '低落', '期待'];
const getArt = (id: string) => jadeArt.get(id) ?? floatArt.get(id) ?? printArt.get(id) ?? tactileArt.get(id) ?? (id === 'demo-landscape' ? demoPhoto : stickers.find(item => item.id === id)?.src);
const formatDate = (date: string, options: Intl.DateTimeFormatOptions) => new Date(`${date}T12:00:00`).toLocaleDateString('zh-CN', options);

function resizeHandleStyle(object: JournalObject, scale: number): CSSProperties {
  const angle = object.rotation * Math.PI / 180;
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  const radius = 22 / scale, gap = 3 / scale;
  const margin = radius * (Math.abs(cosine) + Math.abs(sine)) + gap;
  const cx = object.x + object.width / 2, cy = object.y + object.height / 2;
  // Small artwork must remain draggable beside its 44px resize target.
  // Prefer an outside corner; at page edges choose the corner with the least
  // overlap. Measure both rotated rectangles in the object's local space.
  const candidates = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => {
    const lx = sx * (object.width / 2 + radius + gap);
    const ly = sy * (object.height / 2 + radius + gap);
    const wantedX = cx + lx * cosine - ly * sine;
    const wantedY = cy + lx * sine + ly * cosine;
    const x = Math.max(margin, Math.min(PAGE_WIDTH - margin, wantedX));
    const y = Math.max(margin, Math.min(PAGE_HEIGHT - margin, wantedY));
    const dx = x - cx, dy = y - cy;
    const localX = dx * cosine + dy * sine;
    const localY = -dx * sine + dy * cosine;
    const overlapX = Math.max(0, Math.min(localX + radius, object.width / 2) - Math.max(localX - radius, -object.width / 2));
    const overlapY = Math.max(0, Math.min(localY + radius, object.height / 2) - Math.max(localY - radius, -object.height / 2));
    return { localX, localY, score: overlapX * overlapY * 1e6 + (x - wantedX) ** 2 + (y - wantedY) ** 2 };
  });
  const best = candidates.reduce((a, b) => a.score <= b.score ? a : b);
  return {
    right: 'auto', bottom: 'auto',
    left: object.width / 2 + best.localX - radius,
    top: object.height / 2 + best.localY - radius,
  };
}

function initialize(): JournalState {
  const value = loadState();
  let fresh = false;
  try { fresh = !localStorage.getItem(STORAGE_KEY); } catch { fresh = true; }
  if (fresh && value.books[0]) {
    const first = value.books[0];
    first.title = '日常'; first.subtitle = '';
    first.entries = {};
    value.books = [first]; value.activeBookId = first.id;
  }
  return value;
}

function monthDays(month: string) {
  const [year, number] = month.split('-').map(Number);
  const first = new Date(year, number - 1, 1, 12);
  const weekday = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => localDate(new Date(year, number - 1, i - weekday + 1, 12)));
}

function moveMonth(month: string, amount: number) {
  const [year, number] = month.split('-').map(Number);
  return localDate(new Date(year, number - 1 + amount, 1, 12)).slice(0, 7);
}

export default function App() {
  const { state, setState, undo, redo, canUndo, canRedo, beginInteraction, endInteraction } = useJournalHistory(initialize);
  const [view, setView] = useState<View>('editor');
  const [bookMode, setBookMode] = useState<BookMode>('write');
  const [sceneAvailable, setSceneAvailable] = useState<boolean | null>(null);
  const [writingRect, setWritingRect] = useState<WritingRect | null>(null);
  const [artReady, setArtReady] = useState(false);
  const [artError, setArtError] = useState('');
  const [openingBookId, setOpeningBookId] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [gestureId, setGestureId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [tool, setTool] = useState<Tool>('decorate');
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState('正在保存');
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [bookDialog, setBookDialog] = useState<'new' | string | null>(null);
  const [bookName, setBookName] = useState('');
  const [bookCover, setBookCover] = useState<JournalBook['cover']>('mountain');
  const [scale, setScale] = useState(1);
  const [recoveryRaw, setRecoveryRaw] = useState<string | null>(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) validateState(JSON.parse(raw)); return null; }
    catch { try { return localStorage.getItem(STORAGE_KEY) ?? null; } catch { return null; } }
  });
  const viewportRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDialogElement>(null);
  const trayRef = useRef<HTMLElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ id: string; kind: 'move' | 'resize'; startX: number; startY: number; object: JournalObject } | null>(null);
  const transitionTimers = useRef<number[]>([]);
  const book = state.books.find(item => item.id === state.activeBookId) ?? state.books[0];
  const entry = useMemo(() => book.entries[state.activeDate] ?? createEntry(state.activeDate), [book.entries, state.activeDate]);
  const selected = entry.objects.find(item => item.id === selectedId);
  const today = localDate();
  const displayScale = sceneAvailable !== false && writingRect ? writingRect.width / PAGE_WIDTH : scale;

  useEffect(() => {
    if (sceneAvailable === false && bookMode !== 'write') setBookMode('write');
  }, [sceneAvailable, bookMode]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([prepareTactileArt(), preparePrintArt(), prepareFloatArt(), prepareJadeArt()]).then(() => { if (!cancelled) setArtReady(true); }).catch(() => { if (!cancelled) setArtError('素材暂时无法读取，请重新打开页面。'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (trayOpen) trayRef.current?.querySelector<HTMLButtonElement>('.tray-toggle')?.focus();
  }, [trayOpen]);

  useEffect(() => {
    const dialog = moreRef.current;
    if (moreOpen && dialog && !dialog.open) dialog.showModal();
    if (!moreOpen && dialog?.open) dialog.close();
  }, [moreOpen]);

  useEffect(() => () => { for (const timer of transitionTimers.current) window.clearTimeout(timer); }, []);

  useEffect(() => {
    if (selectedId && !entry.objects.some(item => item.id === selectedId)) setSelectedId(null);
  }, [entry.objects, selectedId]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setTrayOpen(false); addButtonRef.current?.focus(); return; }
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [undo, redo]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (recoveryRaw !== null) { setSaveStatus('原记录已保留'); return; }
    setSaveStatus('正在保存');
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setSaveStatus('已自动保存'); setSaveError(''); }
      catch { setSaveStatus('保存未完成'); setSaveError('设备存储空间不足或不可用。请先导出备份，当前页面仍可继续编辑。'); }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [state, recoveryRaw]);

  useEffect(() => {
    if (view !== 'editor' || sceneAvailable !== false || !viewportRef.current) return;
    const node = viewportRef.current;
    const resize = () => { const style = getComputedStyle(node); const available = node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight); setScale(Math.min(1, available / PAGE_WIDTH)); };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [view, sceneAvailable]);

  useEffect(() => {
    setSelectedId(null);
    setTaskText('');
  }, [state.activeBookId, state.activeDate]);

  useEffect(() => {
    const dialog = modalRef.current;
    if (bookDialog && dialog && !dialog.open) dialog.showModal();
    if (!bookDialog && dialog?.open) dialog.close();
  }, [bookDialog]);

  function editEntry(update: (current: JournalEntry) => JournalEntry) {
    setState(current => ({ ...current, books: current.books.map(item => item.id === current.activeBookId ? {
      ...item, entries: { ...item.entries, [current.activeDate]: update(item.entries[current.activeDate] ?? createEntry(current.activeDate)) },
    } : item) }));
  }

  function patchEntry(patch: Partial<JournalEntry>) { editEntry(current => ({ ...current, ...patch })); }
  function patchObject(id: string, patch: Partial<JournalObject>) {
    editEntry(current => ({ ...current, objects: current.objects.map(item => item.id === id ? clampObject({ ...item, ...patch }) : item) }));
  }

  function chooseDate(date: string) {
    if (isFlipping || date === state.activeDate) return;
    finishGesture(); setView('editor'); setMonth(date.slice(0, 7));
    setSelectedId(null); setTrayOpen(false); setBookMode('write');
    setState(current => ({ ...current, activeDate: date }));
  }

  function openBook(id: string) {
    if (openingBookId) return;
    const item = state.books.find(value => value.id === id);
    if (!item) return;
    setOpeningBookId(id);
    const date = id === state.activeBookId ? state.activeDate : Object.keys(item.entries).sort().reverse()[0] ?? today;
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
    transitionTimers.current.push(window.setTimeout(() => { setState(current => ({ ...current, activeBookId: id, activeDate: date })); setBookMode('write'); setView('editor'); setOpeningBookId(null); }, duration));
  }

  function finishGesture() {
    if (!drag.current) return;
    drag.current = null; setGestureId(null); endInteraction();
  }

  function duplicateSelected() {
    if (!selected || entry.objects.length >= 30) return;
    const copy = clampObject({ ...selected, id: uid(), x: selected.x + 18, y: selected.y + 18 });
    editEntry(current => ({ ...current, objects: [...current.objects, copy] })); setSelectedId(copy.id);
  }

  function raiseSelected() {
    if (!selected) return;
    editEntry(current => ({ ...current, objects: [...current.objects.filter(item => item.id !== selected.id), selected] }));
  }

  function addSticker(id: string) {
    if (entry.objects.length >= 30) { setToast('这一页已有 30 件素材，可以先删去一些再添加。'); return; }
    const n = entry.objects.length % 4;
    const piece = jadeStickerCells.find(item => item.id === id) ?? floatStickerCells.find(item => item.id === id) ?? printStickerCells.find(item => item.id === id);
    const width = Math.max(50, piece?.width ?? 116);
    const height = piece ? width * piece.height / piece.width : 116;
    const object: JournalObject = clampObject({ id: uid(), kind: 'sticker', assetId: id, x: 380 + n * 13, y: 540 + n * 30, width, height, rotation: 0 });
    editEntry(current => ({ ...current, objects: [...current.objects, object] }));
    setSelectedId(object.id); setToast('素材已加入。');
  }

  function removeSelected() {
    if (!selectedId) return;
    editEntry(current => ({ ...current, objects: current.objects.filter(item => item.id !== selectedId) }));
    setSelectedId(null);
  }

  function beginDrag(event: ReactPointerEvent<HTMLElement>, object: JournalObject, kind: 'move' | 'resize' = 'move') {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    setSelectedId(object.id);
    beginInteraction(); setGestureId(object.id);
    drag.current = { id: object.id, kind, startX: event.clientX, startY: event.clientY, object: { ...object } };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current) return;
    const rect = paperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = PAGE_WIDTH / rect.width;
    const { object, kind, startX, startY } = drag.current;
    const dx = (event.clientX - startX) * factor, dy = (event.clientY - startY) * factor;
    if (kind === 'resize') {
      const angle = object.rotation * Math.PI / 180;
      const width = Math.max(50, Math.min(420, object.width + dx * Math.cos(angle) + dy * Math.sin(angle)));
      patchObject(object.id, { width, height: object.height * width / object.width });
    } else patchObject(object.id, { x: object.x + dx, y: object.y + dy });
  }

  async function importPhoto(file?: File) {
    if (!file) return;
    if (entry.objects.length >= 30) { setToast('这一页已满，请先删除一些素材。'); return; }
    setBusy(true);
    try {
      const photo = await normalizePhoto(file);
      const width = 300;
      const height = Math.min(240, Math.max(90, width * photo.height / photo.width));
      const object: JournalObject = { id: uid(), kind: 'photo', src: photo.src, x: 72, y: 560, width, height, rotation: -2 };
      editEntry(current => ({ ...current, objects: [...current.objects, object] }));
      setSelectedId(object.id); setToast('照片已加入，原图已缩小以便本地保存。');
    } catch (error) { setToast(error instanceof Error ? error.message : '照片读取失败，请选择 PNG、JPEG 或 WebP。'); }
    finally { setBusy(false); if (photoInput.current) photoInput.current.value = ''; }
  }

  async function exportPng() {
    setSelectedId(null); setBusy(true);
    try {
      await Promise.all([prepareTactileArt(), preparePrintArt(), prepareFloatArt(), prepareJadeArt()]);
      const blob = await exportPagePng(entry, getArt, { appearance: 'print', bookTitle: book.title });
      downloadBlob(blob, `一日一笺-${entry.date}.png`);
      setToast('已导出 1280 × 1680 的完整画布。');
    } catch (error) { setToast(error instanceof Error ? error.message : '导出失败，请稍后重试。'); }
    finally { setBusy(false); }
  }

  async function restoreBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('备份文件过大，请选择 20 MB 以内的 JSON。');
      const restored = parseBackup(await file.text());
      await Promise.all([prepareTactileArt(), preparePrintArt(), prepareFloatArt(), prepareJadeArt()]);
      for (const item of restored.books) for (const page of Object.values(item.entries)) for (const object of page.objects) { if (object.kind === 'sticker' && (!object.assetId || !getArt(object.assetId))) throw new Error('备份含有无法识别的贴纸，当前内容已保留。'); }
      downloadBackup(state);
      setState(restored); setMonth(restored.activeDate.slice(0, 7)); setView('editor'); setBookMode('write'); setRecoveryRaw(null);
      setToast('备份已恢复。恢复前的内容也已下载为备份。');
    } catch (error) { setToast(error instanceof Error ? error.message : '备份格式不正确，当前内容已保留。'); }
    finally { if (backupInput.current) backupInput.current.value = ''; }
  }

  function openBookDialog(id: 'new' | string) {
    const editing = state.books.find(item => item.id === id);
    setBookName(editing?.title ?? ''); setBookCover(editing?.cover ?? 'mountain'); setBookDialog(id);
  }

  function saveBook() {
    const title = bookName.trim();
    if (!title || !bookDialog) return;
    if (bookDialog === 'new') {
      if (state.books.length >= 20) { setToast('最多可创建 20 本手账。'); return; }
      const next: JournalBook = { id: uid(), title, subtitle: '', cover: bookCover, entries: {} };
      setState(current => ({ ...current, books: [...current.books, next], activeBookId: next.id, activeDate: today }));
    } else setState(current => ({ ...current, books: current.books.map(item => item.id === bookDialog ? { ...item, title, cover: bookCover } : item) }));
    setBookDialog(null); setBookMode('write'); setView('editor'); setToast('手账已保存。');
  }

  function addTask() {
    const text = taskText.trim();
    if (!text || entry.tasks.length >= 5) return;
    editEntry(current => ({ ...current, tasks: [...current.tasks, { id: uid(), text, done: false }] }));
    setTaskText('');
  }

  const objectLabel = (object: JournalObject) => object.kind === 'photo' || object.assetId === 'demo-landscape' ? '今日留影' : jadeStickerCells.find(item => item.id === object.assetId)?.label ?? floatStickerCells.find(item => item.id === object.assetId)?.label ?? printStickerCells.find(item => item.id === object.assetId)?.label ?? stickers.find(item => item.id === object.assetId)?.name ?? '素材';
  const openTools = (next: Tool) => { setBookMode('write'); setTool(next); setTrayOpen(true); };
  const changeBookMode = (next: BookMode) => { finishGesture(); setTrayOpen(false); setSelectedId(null); setBookMode(next); };
  const closeTools = () => { setTrayOpen(false); addButtonRef.current?.focus(); };
  const showMoreAction = (action: () => void) => { setMoreOpen(false); action(); };

  const nativePage = <div className={`notebook-scene ${isFlipping && sceneAvailable === false ? 'is-flipping' : ''}`}><div className="canvas-viewport" ref={viewportRef}><div className="page-scale-wrapper" style={{ width: PAGE_WIDTH * displayScale, height: PAGE_HEIGHT * displayScale, '--paper-scale': displayScale } as CSSProperties}><div className="journal-paper" ref={paperRef} data-testid="journal-paper" style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${displayScale})` }} onPointerDown={() => setSelectedId(null)}>
            {entry.mood !== '平静' && <div className="paper-topline"><button className="paper-mood" onClick={() => openTools('page')}>{entry.mood}</button></div>}
            <div className="paper-title"><textarea aria-label="页面标题" data-testid="entry-title" style={{ fontSize: Math.max(18, Math.min(32, 544 / Math.max(1, Array.from(entry.title).length))), letterSpacing: 0 }} value={entry.title} maxLength={24} placeholder="给今天一个标题" rows={1} onChange={event => patchEntry({ title: event.target.value.replace(/\n/g, '') })} /></div>
            <div className="paper-body"><textarea aria-label="今日随笔" data-testid="entry-body" value={entry.body} maxLength={260} placeholder="今天，想记下什么？" onChange={event => patchEntry({ body: event.target.value })} /></div>
            {entry.tasks.length > 0 && <div className="paper-tasks"><div className="paper-section-label">小事 <i /></div>{entry.tasks.map(task => <div key={task.id} className={`paper-task ${task.done ? 'is-done' : ''}`}><label><input type="checkbox" checked={task.done} onChange={event => editEntry(current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, done: event.target.checked } : item) }))} /><span>{task.text}</span></label><button className="icon-button" aria-label={`删除待办：${task.text}`} onClick={() => editEntry(current => ({ ...current, tasks: current.tasks.filter(item => item.id !== task.id) }))}><X size={13} /></button></div>)}</div>}
            {entry.objects.map(object => {
              const isPhoto = object.kind === 'photo' || object.assetId === 'demo-landscape';
              const src = object.kind === 'photo' ? object.src : getArt(object.assetId ?? '');
              return <div key={object.id} tabIndex={0} role="button" aria-label={`纸页素材：${objectLabel(object)}`} data-testid="paper-object" data-object-id={object.id} className={`paper-object ${isPhoto ? 'photo-object' : 'sticker-object'} ${selectedId === object.id ? 'is-selected' : ''} ${gestureId === object.id ? 'is-dragging' : ''}`} style={{ left: object.x, top: object.y, width: object.width, height: object.height, transform: `rotate(${object.rotation}deg)` }} onPointerDown={event => beginDrag(event, object)} onPointerMove={moveDrag} onPointerUp={finishGesture} onPointerCancel={finishGesture} onLostPointerCapture={finishGesture} onClick={event => { event.stopPropagation(); setSelectedId(object.id); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(object.id); } if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); patchObject(object.id, { x: object.x + (event.key === 'ArrowLeft' ? -4 : event.key === 'ArrowRight' ? 4 : 0), y: object.y + (event.key === 'ArrowUp' ? -4 : event.key === 'ArrowDown' ? 4 : 0) }); } if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); editEntry(current => ({ ...current, objects: current.objects.filter(item => item.id !== object.id) })); setSelectedId(null); } }}>
                {src && <img src={src} alt={objectLabel(object)} draggable={false} />}{selectedId === object.id && <button className="corner-resize" data-testid="object-resize-handle" style={resizeHandleStyle(object, displayScale)} aria-label="拖动调整素材大小" onPointerDown={event => beginDrag(event, object, 'resize')} onPointerMove={event => { event.stopPropagation(); moveDrag(event); }} onPointerUp={event => { event.stopPropagation(); finishGesture(); }} onPointerCancel={finishGesture} onLostPointerCapture={finishGesture} onClick={event => event.stopPropagation()}><span aria-hidden="true" /></button>}
              </div>;
            })}

          </div></div></div></div>;

  return <div className="app-shell desk-shell" data-art-ready={artReady ? 'true' : 'false'}>
    <header className="sidebar">
      <button className="brand" onClick={() => { changeBookMode('write'); setView('editor'); }} aria-label="一日一笺首页"><span className="brand-mark" aria-hidden="true" /><span className="brand-name">一日一笺</span></button>
      <nav aria-label="主导航">
        <button aria-label="今日一页" className={`nav-item ${view === 'editor' ? 'is-active' : ''}`} onClick={() => { changeBookMode('write'); setView('editor'); }}>记录</button>
        <button aria-label="我的手账" className={`nav-item ${view === 'books' ? 'is-active' : ''}`} onClick={() => { changeBookMode('write'); setView('books'); }}>收藏</button>
        <button aria-label="月历回顾" className={`nav-item ${view === 'calendar' ? 'is-active' : ''}`} onClick={() => { setMonth(state.activeDate.slice(0, 7)); changeBookMode('write'); setView('calendar'); }}>日历</button>
      </nav>
      <div className="sidebar-actions"><button className="icon-button" aria-label="更多操作" onClick={() => setMoreOpen(true)}><MoreHorizontal size={20} /></button></div>
    </header>
    <main className="main-content">
      {artError && <div className="notice" role="alert">{artError}</div>}
      {sceneAvailable === false && <div className="notice" role="status">空间预览暂不可用，可以继续记录。</div>}
      {saveError && <div className="notice" role="alert">{saveError}<button onClick={() => downloadBackup(state)}>导出备份</button></div>}
      {recoveryRaw !== null && <div className="notice" role="alert">原有记录暂时无法读取，已保留原文件。<button onClick={() => { downloadBlob(new Blob([recoveryRaw], { type: 'application/json' }), '一日一笺-原记录.json'); }}>下载原记录</button><button onClick={() => { downloadBlob(new Blob([recoveryRaw], { type: 'application/json' }), '一日一笺-原记录.json'); setRecoveryRaw(null); }}>备份后开始记录</button></div>}
      {view === 'editor' && <section className={`editor-layout ${sceneAvailable !== false ? 'has-live-book' : ''}`} aria-label="每日编辑器">
        <div className="editor-column">
          <div className="journal-intro">
            <span className="journal-eyebrow">{book.title}</span>
            <div className="editor-date-control">
              <label className="date-anchor">
                <span className="date-month">{formatDate(entry.date, { month: 'long' })}</span>
                <h1 className="date-number">{entry.date.slice(-2)}</h1>
                <span className="date-year-week">{entry.date.slice(0, 4)} · {formatDate(entry.date, { weekday: 'long' })}</span>
                <input aria-label="页面日期" disabled={isFlipping} type="date" value={entry.date} onClick={event => { try { event.currentTarget.showPicker(); } catch { /* Native control remains keyboard-accessible. */ } }} onChange={event => { if (event.target.value && /^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) chooseDate(event.target.value); }} />
                <span className="date-change-hint"><CalendarDays size={14} />切换日期</span>
              </label>
              <button className="icon-button" aria-label="前一天" disabled={isFlipping} onClick={() => { const d = new Date(`${entry.date}T12:00:00`); d.setDate(d.getDate() - 1); chooseDate(localDate(d)); }}><ChevronLeft size={16} /></button>
              <button className="icon-button" aria-label="后一天" disabled={isFlipping} onClick={() => { const d = new Date(`${entry.date}T12:00:00`); d.setDate(d.getDate() + 1); chooseDate(localDate(d)); }}><ChevronRight size={16} /></button>
            </div>
          </div>
          {bookMode === 'write' && <div className="editor-toolbar"><div className="editor-actions">{sceneAvailable === true && <button className="button ghost" aria-label="看整册" onClick={() => changeBookMode('browse')}><Layers size={15} />空间预览</button>}<button className="icon-button" aria-label="撤销" disabled={!canUndo} onClick={undo}><Undo2 size={16} /></button><button className="icon-button" aria-label="重做" disabled={!canRedo} onClick={redo}><Redo2 size={16} /></button><button className="button ghost" onClick={() => openTools('page')}>编辑文字</button><button className="button primary" ref={addButtonRef} aria-label="展开素材托盘" aria-expanded={trayOpen} aria-controls="paper-tools" onClick={() => trayOpen ? closeTools() : openTools('decorate')}><Plus size={14} />加内容</button></div></div>}
          {bookMode === 'write' && selected && <div className="selection-toolbar" aria-label="素材操作"><span className="selection-label">{objectLabel(selected)}</span><button className="icon-button" aria-label="复制选中素材" onClick={duplicateSelected}><Copy size={16} /></button><button className="icon-button" aria-label="置于最前" onClick={raiseSelected}><Layers size={16} /></button><button className="icon-button" aria-label="调整素材" onClick={() => openTools('decorate')}><Settings2 size={16} /></button><button className="icon-button danger" aria-label="删除选中素材" onClick={removeSelected}><Trash2 size={16} /></button></div>}
          {sceneAvailable !== false && <BookViewport key={book.id} book={book} entry={entry} artReady={artReady} mode={bookMode} onModeChange={changeBookMode} onRectChange={setWritingRect} onAvailability={setSceneAvailable} onTurningChange={setIsFlipping} getArt={getArt}>
            {bookMode === 'write' && writingRect && <div className="live-writing-overlay" style={{ left: writingRect.left, top: writingRect.top, width: writingRect.width, height: writingRect.height }}>{nativePage}</div>}
          </BookViewport>}
          {sceneAvailable === false && nativePage}
          <span className={`save-status ${saveError ? 'has-error' : ''}`} role="status"><i />{saveStatus}</span>
        </div>
        {trayOpen && <button className="tray-backdrop" aria-label="关闭工具" onClick={closeTools} />}
        <aside id="paper-tools" ref={trayRef} className={`tools-panel material-tray ${trayOpen ? '' : 'is-collapsed'}`} aria-label="页面工具" aria-hidden={!trayOpen}>
          <button className="tray-toggle" aria-expanded={trayOpen} aria-label="收起素材托盘" onClick={closeTools}><span>画布工具</span><X size={17} /></button>
          <div className="tools-tabs"><button className={`tool-tab ${tool === 'decorate' ? 'is-active' : ''}`} onClick={() => setTool('decorate')}>装点画布</button><button className={`tool-tab ${tool === 'page' ? 'is-active' : ''}`} onClick={() => setTool('page')}>今日内容</button></div>
          {tool === 'decorate' ? <>
            <div className="tool-section"><div className="tool-heading"><h2>温玉构件</h2><span>8 件</span></div><div className="sticker-grid jade-sticker-grid">{jadeStickerCells.map(item => <button className="sticker-button" key={item.id} aria-label={`添加贴纸：${item.label}`} disabled={!artReady} onClick={() => addSticker(item.id)}><img src={getArt(item.id)} alt="" /><span>{item.label}</span></button>)}</div></div>
            <details className="legacy-art tool-section"><summary>浮笺旧藏</summary><div className="sticker-grid print-sticker-grid">{floatStickerCells.map(item => <button className="sticker-button" key={item.id} aria-label={`添加贴纸：${item.label}`} disabled={!artReady} onClick={() => addSticker(item.id)}><img src={getArt(item.id)} alt="" /><span>{item.label}</span></button>)}</div></details>
            <details className="legacy-art tool-section"><summary>印刷旧藏</summary><div className="sticker-grid print-sticker-grid">{printStickerCells.map(item => <button className="sticker-button" key={item.id} aria-label={`添加贴纸：${item.label}`} disabled={!artReady} onClick={() => addSticker(item.id)}><img src={getArt(item.id)} alt="" /><span>{item.label}</span></button>)}</div></details>
            <div className="tool-section"><button className="upload-area" disabled={busy} onClick={() => photoInput.current?.click()}><ImagePlus size={18} /><span>加入照片</span><Plus size={16} /></button></div>
            {selected && <div className="tool-section object-controls"><div className="tool-heading"><h2>{objectLabel(selected)}</h2></div><label className="control-row">大小 <output>{Math.round(selected.width)} px</output><input type="range" aria-label="贴纸大小" onPointerDown={beginInteraction} onPointerUp={endInteraction} onPointerCancel={endInteraction} min="50" max="420" step="1" value={selected.width} onChange={event => { const width = Number(event.target.value); patchObject(selected.id, { width, height: width * selected.height / selected.width }); }} /></label><label className="control-row">角度 <output>{Math.round(selected.rotation)}°</output><input type="range" aria-label="旋转角度" onPointerDown={beginInteraction} onPointerUp={endInteraction} onPointerCancel={endInteraction} min="-45" max="45" value={selected.rotation} onChange={event => patchObject(selected.id, { rotation: Number(event.target.value) })} /></label><div className="object-action-row"><button className="button ghost" onClick={() => patchObject(selected.id, { rotation: 0 })}><RotateCcw size={13} />摆正</button><button className="button ghost danger" onClick={removeSelected}><Trash2 size={13} />移除素材</button></div></div>}
            <details className="legacy-art tool-section"><summary>旧藏</summary><div className="sticker-grid">{stickers.map(item => <button className="sticker-button" key={item.id} aria-label={`添加贴纸：${item.name}`} disabled={!artReady} onClick={() => addSticker(item.id)}><img src={getArt(item.id)} alt="" /><span>{item.name}</span></button>)}</div></details>
          </> : <>
            <div className="tool-section"><label className="text-edit-field">标题<input aria-label="编辑标题" value={entry.title} maxLength={24} onChange={event => patchEntry({ title: event.target.value.replace(/\n/g, '') })} /></label><label className="text-edit-field">随笔<textarea aria-label="编辑随笔" rows={5} maxLength={260} value={entry.body} onChange={event => patchEntry({ body: event.target.value })} /></label></div>
            <div className="tool-section"><div className="tool-heading"><h2>心情</h2></div><div className="mood-grid">{moods.map(mood => <button className={`mood-button ${entry.mood === mood ? 'is-active' : ''}`} aria-label={mood} aria-pressed={entry.mood === mood} key={mood} onClick={() => patchEntry({ mood })}>{mood}</button>)}</div></div>
            <div className="tool-section"><div className="tool-heading"><h2>小事</h2><span>{entry.tasks.length} / 5</span></div><form className="task-add" onSubmit={event => { event.preventDefault(); addTask(); }}><input aria-label="新待办" placeholder="记一件小事" maxLength={28} value={taskText} onChange={event => setTaskText(event.target.value)} /><button className="icon-button" type="submit" aria-label="添加待办" disabled={entry.tasks.length >= 5 || !taskText.trim()}><Plus size={17} /></button></form></div>
          </>}
        </aside>
      </section>}
      {view === 'books' && <div className="shelf-scene"><div className="collection-header"><h1>我的收藏</h1><button className="button primary" onClick={() => openBookDialog('new')}><Plus size={16} />新建手账</button></div><section className="books-grid" aria-label="手账书架">{state.books.map((item, index) => {
        const cover = covers.find(c => c.id === item.cover) ?? covers[0];
        return <article className={`book-card cover-${item.cover} ${openingBookId === item.id ? 'is-opening' : ''}`} data-testid="book-card" data-book-title={item.title} key={item.id}><button className="book-cover" aria-label={`打开手账：${item.title}`} onClick={() => openBook(item.id)} disabled={openingBookId !== null}><span className="collection-art"><img src={cover.src} alt={cover.name} /><span className="collection-index">{String(index + 1).padStart(2, '0')}</span></span></button><div className="book-info"><h2>{item.title}</h2><button className="icon-button" aria-label={`编辑手账：${item.title}`} onClick={() => openBookDialog(item.id)}><MoreHorizontal size={19} /></button></div><div className="book-meta"><span>{Object.keys(item.entries).length} 篇记录</span><span>{cover.name}</span></div></article>;
      })}</section></div>}
      {view === 'calendar' && <section className="calendar-layout"><div className="calendar-panel"><div className="calendar-header"><h2>{formatDate(`${month}-01`, { year: 'numeric', month: 'long' })}</h2><div><button className="icon-button" aria-label="上个月" onClick={() => setMonth(moveMonth(month, -1))}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="下个月" onClick={() => setMonth(moveMonth(month, 1))}><ChevronRight size={18} /></button></div></div><div className="calendar-weekdays">{['一', '二', '三', '四', '五', '六', '日'].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{monthDays(month).map(date => <button aria-label={date} key={date} className={`calendar-day ${date === today ? 'is-today' : ''} ${book.entries[date] ? 'has-entry' : ''} ${date === state.activeDate ? 'is-selected' : ''} ${!date.startsWith(month) ? 'outside-month' : ''}`} onClick={() => chooseDate(date)}><span>{Number(date.slice(-2))}</span>{book.entries[date] && <i />}</button>)}</div><div className="calendar-legend"><i />有记录</div></div><aside className="calendar-preview"><h2>最近记录</h2><div className="entry-list">{Object.keys(book.entries).sort().reverse().slice(0, 6).map(date => <button className="entry-list-item" key={date} onClick={() => chooseDate(date)}><span>{formatDate(date, { month: 'numeric', day: 'numeric' })}</span><strong>{book.entries[date].title || '未题名'}</strong><ChevronRight size={14} /></button>)}</div></aside></section>}
    </main>
    <input type="file" accept="image/png,image/jpeg,image/webp" ref={photoInput} data-testid="photo-input" className="visually-hidden" onChange={event => void importPhoto(event.target.files?.[0])} />
    <input type="file" accept="application/json,.json" ref={backupInput} data-testid="backup-input" className="visually-hidden" onChange={event => void restoreBackup(event.target.files?.[0])} />
    <dialog className="modal more-modal" ref={moreRef} onCancel={() => setMoreOpen(false)} onClose={() => setMoreOpen(false)}><div className="modal-header"><h2>更多操作</h2><button className="icon-button" aria-label="关闭更多操作" onClick={() => setMoreOpen(false)}><X size={18} /></button></div><div className="more-actions"><button className="button" onClick={() => showMoreAction(() => void exportPng())} disabled={busy}><ArrowDownToLine size={16} />导出 PNG</button><button className="button" onClick={() => showMoreAction(() => { downloadBackup(state); setToast('完整手账备份已下载。'); })}><Download size={16} />导出备份</button><button className="button" onClick={() => showMoreAction(() => backupInput.current?.click())}><Upload size={16} />导入备份</button><button className="button" onClick={() => showMoreAction(() => openBookDialog(book.id))}><BookOpen size={16} />编辑当前收藏</button></div></dialog>
    <dialog className="modal" ref={modalRef} onCancel={() => setBookDialog(null)} onClose={() => setBookDialog(null)}><form onSubmit={event => { event.preventDefault(); saveBook(); }}><div className="modal-header"><h2>{bookDialog === 'new' ? '新建手账' : '手账设置'}</h2><button className="icon-button" type="button" aria-label="关闭手账设置" onClick={() => setBookDialog(null)}><X size={18} /></button></div><label className="form-field">手账名称<input aria-label="手账名称" data-testid="book-title-modal" maxLength={28} required autoFocus value={bookName} placeholder="册子名称" onChange={event => setBookName(event.target.value)} /></label><label className="form-field">封面</label><div className="cover-picker">{covers.map(cover => <button className={`cover-choice cover-${cover.id} ${bookCover === cover.id ? 'is-active' : ''}`} aria-label={`选择封面：${cover.name}`} aria-pressed={bookCover === cover.id} key={cover.id} type="button" onClick={() => setBookCover(cover.id)}><img src={cover.src} alt="" /><span>{cover.name}</span>{bookCover === cover.id && <Check size={15} />}</button>)}</div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setBookDialog(null)}>取消</button><button className="button primary" type="submit" disabled={!bookName.trim()}>{bookDialog === 'new' ? '开始记录' : '保存修改'}</button></div></form></dialog>
    {toast && <div className="toast" role="status"><Check size={15} /><span>{toast}</span></div>}
  </div>;
}
