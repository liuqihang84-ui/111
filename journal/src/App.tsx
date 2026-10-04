import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowDownToLine, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Copy, Download, Feather, Flower2, ImagePlus, Layers, Leaf, MoreHorizontal, Plus, Redo2, RotateCcw, Settings2, Trash2, Undo2, Upload, X } from 'lucide-react';
import { covers, demoPhoto, stickers } from './data/art';
import { clampObject, createEntry, loadState, localDate, PAGE_HEIGHT, PAGE_WIDTH, STORAGE_KEY, uid, validateState } from './lib/model';
import type { JournalBook, JournalEntry, JournalObject, JournalState } from './lib/model';
import { downloadBackup, downloadBlob, exportPagePng, normalizePhoto, parseBackup } from './lib/export';
import { useJournalHistory } from './lib/history';
import { prepareTactileArt, tactileArt } from './lib/tactile-render';
import { tactileCoverSrc, tactilePaperSrc } from './data/tactile';

type View = 'editor' | 'books' | 'calendar';
type Tool = 'decorate' | 'page';
const moods = ['平静', '晴朗', '忙碌', '低落', '期待'];
const moodSymbols = ['◌', '☀', '〰', '☂', '✧'];
const getArt = (id: string) => tactileArt.get(id) ?? (id === 'demo-landscape' ? demoPhoto : stickers.find(item => item.id === id)?.src);
const formatDate = (date: string, options: Intl.DateTimeFormatOptions) => new Date(`${date}T12:00:00`).toLocaleDateString('zh-CN', options);

function resizeHandleStyle(object: JournalObject, scale: number): CSSProperties {
  const angle = object.rotation * Math.PI / 180;
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  const radius = 22 / scale;
  // Keep the entire rotated 44px control inside the clipped paper, even when
  // the artwork is small or lies against a page edge.
  const margin = radius * (Math.abs(cosine) + Math.abs(sine)) + 3 / scale;
  const cx = object.x + object.width / 2, cy = object.y + object.height / 2;
  const cornerX = cx + object.width / 2 * cosine - object.height / 2 * sine;
  const cornerY = cy + object.width / 2 * sine + object.height / 2 * cosine;
  const dx = Math.max(margin, Math.min(PAGE_WIDTH - margin, cornerX)) - cx;
  const dy = Math.max(margin, Math.min(PAGE_HEIGHT - margin, cornerY)) - cy;
  return {
    right: 'auto', bottom: 'auto',
    left: object.width / 2 + dx * cosine + dy * sine - radius,
    top: object.height / 2 - dx * sine + dy * cosine - radius,
  };
}

function initialize(): JournalState {
  const value = loadState();
  let fresh = false;
  try { fresh = !localStorage.getItem(STORAGE_KEY); } catch { fresh = true; }
  if (fresh) {
    const entry = value.books[0]?.entries[value.activeDate];
    if (entry) entry.objects = [
      { id: uid(), kind: 'sticker', assetId: 'demo-landscape', x: 64, y: 560, width: 338, height: 230, rotation: -3 },
      { id: uid(), kind: 'sticker', assetId: 'icon-orchid', x: 466, y: 607, width: 112, height: 112, rotation: 5 },
      { id: uid(), kind: 'sticker', assetId: 'icon-seal', x: 499, y: 728, width: 55, height: 55, rotation: -7 },
    ];
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
  const [view, setView] = useState<View>('books');
  const [artReady, setArtReady] = useState(false);
  const [artError, setArtError] = useState('');
  const [openingBookId, setOpeningBookId] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [trayOpen, setTrayOpen] = useState(() => !window.matchMedia('(max-width: 680px)').matches);
  const [gestureId, setGestureId] = useState<string | null>(null);
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
  const modalRef = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ id: string; kind: 'move' | 'resize'; startX: number; startY: number; object: JournalObject } | null>(null);
  const transitionTimers = useRef<number[]>([]);
  const book = state.books.find(item => item.id === state.activeBookId) ?? state.books[0];
  const entry = book.entries[state.activeDate] ?? createEntry(state.activeDate);
  const selected = entry.objects.find(item => item.id === selectedId);
  const today = localDate();
  const entryCount = Object.keys(book.entries).length;

  useEffect(() => {
    let cancelled = false;
    prepareTactileArt().then(() => { if (!cancelled) setArtReady(true); }).catch(() => { if (!cancelled) setArtError('小物件材质暂时无法读取，请重新打开页面。'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 680px)');
    const change = () => setTrayOpen(!media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => () => { for (const timer of transitionTimers.current) window.clearTimeout(timer); }, []);

  useEffect(() => {
    if (selectedId && !entry.objects.some(item => item.id === selectedId)) setSelectedId(null);
  }, [entry.objects, selectedId]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
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
    if (view !== 'editor' || !viewportRef.current) return;
    const node = viewportRef.current;
    const resize = () => { const style = getComputedStyle(node); const available = node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight); setScale(Math.min(1, available / PAGE_WIDTH)); };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [view]);

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
    if (isFlipping) return;
    setView('editor'); setMonth(date.slice(0, 7)); setSelectedId(null);
    if (view !== 'editor' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setState(current => ({ ...current, activeDate: date })); return; }
    setIsFlipping(true);
    transitionTimers.current.push(window.setTimeout(() => setState(current => ({ ...current, activeDate: date })), 260));
    transitionTimers.current.push(window.setTimeout(() => setIsFlipping(false), 620));
  }

  function openBook(id: string) {
    if (openingBookId) return;
    const item = state.books.find(value => value.id === id);
    if (!item) return;
    setOpeningBookId(id);
    const date = id === state.activeBookId ? state.activeDate : Object.keys(item.entries).sort().reverse()[0] ?? today;
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 40 : 640;
    transitionTimers.current.push(window.setTimeout(() => { setState(current => ({ ...current, activeBookId: id, activeDate: date })); setView('editor'); setOpeningBookId(null); }, duration));
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
    const object: JournalObject = { id: uid(), kind: 'sticker', assetId: id, x: 416 + n * 13, y: 540 + n * 30, width: 116, height: 116, rotation: 0 };
    editEntry(current => ({ ...current, objects: [...current.objects, object] }));
    setSelectedId(object.id); setToast('贴纸已放入纸页，可以拖动摆放。');
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
      const height = Math.min(240, Math.max(90, width * photo.height / photo.width + 38));
      const object: JournalObject = { id: uid(), kind: 'photo', src: photo.src, x: 72, y: 560, width, height, rotation: -2 };
      editEntry(current => ({ ...current, objects: [...current.objects, object] }));
      setSelectedId(object.id); setToast('照片已加入，原图已缩小以便本地保存。');
    } catch (error) { setToast(error instanceof Error ? error.message : '照片读取失败，请选择 PNG、JPEG 或 WebP。'); }
    finally { setBusy(false); if (photoInput.current) photoInput.current.value = ''; }
  }

  async function exportPng() {
    setSelectedId(null); setBusy(true);
    try {
      await prepareTactileArt();
      const blob = await exportPagePng(entry, getArt, { paperTexture: tactilePaperSrc, bookTitle: book.title });
      downloadBlob(blob, `一日一笺-${entry.date}.png`);
      setToast('已导出 1280 × 1680 的完整纸页。');
    } catch (error) { setToast(error instanceof Error ? error.message : '导出失败，请稍后重试。'); }
    finally { setBusy(false); }
  }

  async function restoreBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('备份文件过大，请选择 20 MB 以内的 JSON。');
      const restored = parseBackup(await file.text());
      for (const item of restored.books) for (const page of Object.values(item.entries)) for (const object of page.objects) { if (object.kind === 'sticker' && (!object.assetId || !getArt(object.assetId))) throw new Error('备份含有无法识别的贴纸，当前内容已保留。'); }
      downloadBackup(state);
      setState(restored); setMonth(restored.activeDate.slice(0, 7)); setView('editor'); setRecoveryRaw(null);
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
      const next: JournalBook = { id: uid(), title, subtitle: '从今天开始，慢慢记录', cover: bookCover, entries: {} };
      setState(current => ({ ...current, books: [...current.books, next], activeBookId: next.id, activeDate: today }));
    } else setState(current => ({ ...current, books: current.books.map(item => item.id === bookDialog ? { ...item, title, cover: bookCover } : item) }));
    setBookDialog(null); setView('editor'); setToast('手账已准备好，写下第一句吧。');
  }

  function addTask() {
    const text = taskText.trim();
    if (!text || entry.tasks.length >= 5) return;
    editEntry(current => ({ ...current, tasks: [...current.tasks, { id: uid(), text, done: false }] }));
    setTaskText('');
  }

  const objectLabel = (object: JournalObject) => object.kind === 'photo' || object.assetId === 'demo-landscape' ? '今日留影' : stickers.find(item => item.id === object.assetId)?.name ?? '贴纸';

  return <div className="app-shell desk-shell" data-art-ready={artReady ? 'true' : 'false'}>
    <aside className="sidebar">
      <button className="brand" onClick={() => setView('editor')} aria-label="一日一笺首页"><span className="brand-mark"><Feather size={23} /></span><span><span className="brand-name">一日一笺</span><span className="brand-subtitle">日常有迹 · 岁月成册</span></span></button>
      <div className="nav-section-label">我的小天地</div>
      <nav aria-label="主导航">
        <button className={`nav-item ${view === 'editor' ? 'is-active' : ''}`} onClick={() => { setView('editor'); }}><Feather size={17} />今日一页<span>写</span></button>
        <button className={`nav-item ${view === 'books' ? 'is-active' : ''}`} onClick={() => setView('books')}><BookOpen size={17} />我的手账</button>
        <button className={`nav-item ${view === 'calendar' ? 'is-active' : ''}`} onClick={() => { setMonth(state.activeDate.slice(0, 7)); setView('calendar'); }}><CalendarDays size={17} />月历回顾</button>
      </nav>
      <div className="sidebar-books"><div className="nav-section-label">案头的册子<button className="icon-button" aria-label="新建手账" onClick={() => openBookDialog('new')}><Plus size={16} /></button></div>{state.books.map(item => <button key={item.id} className={`sidebar-book ${item.id === book.id ? 'is-active' : ''}`} onClick={() => { setState(current => ({ ...current, activeBookId: item.id })); setView('editor'); }}><span className={`book-dot cover-${item.cover}`} />{item.title}<span>{Object.keys(item.entries).length}</span></button>)}</div>
      <div className="sidebar-footer"><div className="storage-note"><Leaf size={16} /><span>一页一日，慢慢写。<small>内容保存在当前浏览器</small></span></div><div className="sidebar-actions"><button onClick={() => { downloadBackup(state); setToast('完整手账备份已下载。'); }}><Download size={14} />导出备份</button><button onClick={() => backupInput.current?.click()}><Upload size={14} />导入备份</button></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb"><span>案头</span><ChevronRight size={13} /><span>{book.title}</span></div><div className="topbar-actions"><span className={`save-status ${saveError ? 'has-error' : ''}`} role="status"><i />{saveStatus}</span><button className="icon-button" aria-label="编辑当前手账封面" onClick={() => openBookDialog(book.id)}><Settings2 size={17} /></button></div></header>
      {artError && <div className="notice" role="alert">{artError}</div>}
      {saveError && <div className="notice" role="alert">{saveError}<button onClick={() => downloadBackup(state)}>导出备份</button></div>}
      {recoveryRaw !== null && <div className="notice" role="alert">原有记录暂时无法读取，已保留原文件。<button onClick={() => { downloadBlob(new Blob([recoveryRaw], { type: 'application/json' }), '一日一笺-原记录.json'); }}>下载原记录</button><button onClick={() => { downloadBlob(new Blob([recoveryRaw], { type: 'application/json' }), '一日一笺-原记录.json'); setRecoveryRaw(null); }}>备份后使用新册页</button></div>}

      <div className="page-heading"><span className="eyebrow">A DAY, A LEAF · 一日一笺</span><div className="heading-row"><div className="heading-copy"><h1>{view === 'books' ? '挑一本，开始今天。' : view === 'calendar' ? '回看，每一个小小的日常。' : '打开一页，留住日常。'}</h1><p>{view === 'editor' ? '几行字，一片草木，一枚小印。让平凡的一天有自己的模样。' : view === 'books' ? '布面、纸边、草木与微光。桌上的这本，属于你。' : '有记录的日子会留下朱红小点，点开便能回到那一页。'}</p></div><div className="heading-actions">{view === 'editor' ? <button className="button primary" onClick={() => void exportPng()} disabled={busy}><ArrowDownToLine size={16} />{busy ? '正在处理…' : '导出 PNG'}</button> : view === 'books' ? <button className="button primary" onClick={() => openBookDialog('new')}><Plus size={16} />新建手账</button> : <button className="button secondary" onClick={() => chooseDate(today)}><Feather size={16} />写今天</button>}</div></div></div>

      {view === 'editor' && <section className="editor-layout" aria-label="每日编辑器">
        <div className="editor-column"><div className="editor-toolbar"><div><button className="icon-button" aria-label="前一天" onClick={() => { const d = new Date(`${entry.date}T12:00:00`); d.setDate(d.getDate() - 1); chooseDate(localDate(d)); }}><ChevronLeft size={16} /></button><input aria-label="页面日期" type="date" value={entry.date} onChange={event => { if (event.target.value && /^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) chooseDate(event.target.value); }} /><button className="icon-button" aria-label="后一天" onClick={() => { const d = new Date(`${entry.date}T12:00:00`); d.setDate(d.getDate() + 1); chooseDate(localDate(d)); }}><ChevronRight size={16} /></button></div><div><button className="button ghost" onClick={() => { setTool('page'); setTrayOpen(true); window.setTimeout(() => document.querySelector('.text-edit-field')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); }}><Feather size={14} />编辑文字</button><button className="button ghost" onClick={() => { setMonth(entry.date.slice(0, 7)); setView('calendar'); }}><CalendarDays size={15} />月历</button></div></div>
          <div className="selection-toolbar" aria-label="素材操作"><div className="history-buttons"><button className="icon-button" aria-label="撤销" disabled={!canUndo} onClick={undo}><Undo2 size={17} /></button><button className="icon-button" aria-label="重做" disabled={!canRedo} onClick={redo}><Redo2 size={17} /></button></div>{selected ? <><span className="selection-label">{objectLabel(selected)}</span><button className="icon-button" aria-label="复制选中素材" onClick={duplicateSelected}><Copy size={16} /></button><button className="icon-button" aria-label="置于最前" onClick={raiseSelected}><Layers size={16} /></button><button className="icon-button danger" aria-label="删除选中素材" onClick={removeSelected}><Trash2 size={16} /></button><small>拖动圆角手柄缩放</small></> : <span className="selection-label">点选纸页上的小物件</span>}</div>
          <div className={`notebook-scene ${isFlipping ? 'is-flipping' : ''}`}><div className={`open-book-left cover-${book.cover}`} aria-hidden="true"><img src={tactileCoverSrc} alt="" /><div className="inside-note"><span>一日一笺</span><strong>{book.title}</strong><p>慢慢写。<br />让日常留下痕迹。</p><i>日常私藏</i></div><span className="binder-clip" /></div><div className="open-book-spine" aria-hidden="true" /><div className="canvas-viewport" ref={viewportRef}><div className="page-scale-wrapper" style={{ width: PAGE_WIDTH * scale, height: PAGE_HEIGHT * scale, '--paper-scale': scale } as CSSProperties}><div className="book-board" aria-hidden="true" /><div className="paper-stack" aria-hidden="true" /><div className="page-flip-leaf" aria-hidden="true" /><div className="journal-paper" ref={paperRef} data-testid="journal-paper" style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${scale})`, backgroundSize: '100% 100%', backgroundImage: `linear-gradient(rgba(251,248,239,.28), rgba(251,248,239,.28)), url("${tactilePaperSrc}")` }} onPointerDown={() => setSelectedId(null)}>
            <div className="paper-date"><span>{formatDate(entry.date, { year: 'numeric' })} · {formatDate(entry.date, { month: 'long', day: 'numeric' })}</span><span>{formatDate(entry.date, { weekday: 'long' })}</span></div><div className="paper-rule" />
            <div className="paper-title"><textarea aria-label="页面标题" data-testid="entry-title" style={{ fontSize: Math.min(30, 525 / Math.max(1, Array.from(entry.title).length)), letterSpacing: 0 }} value={entry.title} maxLength={24} placeholder="给今天起个名字…" rows={1} onChange={event => patchEntry({ title: event.target.value.replace(/\n/g, '') })} /></div>
            <div className="paper-body"><textarea aria-label="今日随笔" data-testid="entry-body" value={entry.body} maxLength={260} placeholder="从一件小事写起：今天看见了什么，遇见了谁？" onChange={event => patchEntry({ body: event.target.value })} /></div>
            <div className="paper-mood"><span>{moodSymbols[moods.indexOf(entry.mood)] ?? '◌'}</span>{entry.mood || '平静'}</div>
            <div className="paper-tasks"><div className="paper-section-label">今日小事 <i /></div>{entry.tasks.length === 0 && <p className="paper-empty-tasks">右侧可添加几件想做的小事</p>}{entry.tasks.map(task => <div key={task.id} className={`paper-task ${task.done ? 'is-done' : ''}`}><label><input type="checkbox" checked={task.done} onChange={event => editEntry(current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, done: event.target.checked } : item) }))} /><span>{task.text}</span></label><button className="icon-button" aria-label={`删除待办：${task.text}`} onClick={() => editEntry(current => ({ ...current, tasks: current.tasks.filter(item => item.id !== task.id) }))}><X size={13} /></button></div>)}</div>
            {entry.objects.map(object => {
              const isPhoto = object.kind === 'photo' || object.assetId === 'demo-landscape';
              const src = object.kind === 'photo' ? object.src : getArt(object.assetId ?? '');
              return <div key={object.id} tabIndex={0} role="button" aria-label={`纸页素材：${objectLabel(object)}`} data-testid="paper-object" data-object-id={object.id} className={`paper-object ${isPhoto ? 'photo-object' : 'sticker-object'} ${selectedId === object.id ? 'is-selected' : ''} ${gestureId === object.id ? 'is-dragging' : ''}`} style={{ left: object.x, top: object.y, width: object.width, height: object.height, transform: `rotate(${object.rotation}deg)` }} onPointerDown={event => beginDrag(event, object)} onPointerMove={moveDrag} onPointerUp={finishGesture} onPointerCancel={finishGesture} onLostPointerCapture={finishGesture} onClick={event => { event.stopPropagation(); setSelectedId(object.id); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(object.id); } if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); patchObject(object.id, { x: object.x + (event.key === 'ArrowLeft' ? -4 : event.key === 'ArrowRight' ? 4 : 0), y: object.y + (event.key === 'ArrowUp' ? -4 : event.key === 'ArrowDown' ? 4 : 0) }); } if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); editEntry(current => ({ ...current, objects: current.objects.filter(item => item.id !== object.id) })); setSelectedId(null); } }}>
                {src && <img src={src} alt={objectLabel(object)} draggable={false} />}{isPhoto && <span className="photo-caption">拾一片风景，留给今天。</span>}{selectedId === object.id && <button className="corner-resize" data-testid="object-resize-handle" style={resizeHandleStyle(object, scale)} aria-label="拖动调整素材大小" onPointerDown={event => beginDrag(event, object, 'resize')} onPointerMove={event => { event.stopPropagation(); moveDrag(event); }} onPointerUp={event => { event.stopPropagation(); finishGesture(); }} onPointerCancel={finishGesture} onLostPointerCapture={finishGesture} onClick={event => event.stopPropagation()}><span aria-hidden="true" /></button>}
              </div>;
            })}
            <div className="paper-colophon"><span>{book.title}</span><span>一日一笺 <i>记</i></span></div>
          </div></div></div></div><div className="editor-footnote"><Leaf size={13} /><span>文字可直接编辑 · 贴纸和照片可拖动 · 点击素材后调整大小与角度</span></div>
        </div>
        <aside className={`tools-panel material-tray ${trayOpen ? '' : 'is-collapsed'}`} aria-label="页面工具"><button className="tray-toggle" aria-expanded={trayOpen} aria-label={trayOpen ? '收起素材托盘' : '展开素材托盘'} onClick={() => setTrayOpen(value => !value)}><Flower2 size={17} /><span>素材与纸页工具</span><ChevronRight size={16} /></button><div className="tools-tabs"><button className={`tool-tab ${tool === 'decorate' ? 'is-active' : ''}`} onClick={() => setTool('decorate')}><Flower2 size={16} />装点纸页</button><button className={`tool-tab ${tool === 'page' ? 'is-active' : ''}`} onClick={() => setTool('page')}><Feather size={16} />今日内容</button></div>
          {tool === 'decorate' ? <>
            <div className="tool-section"><div className="tool-heading"><h2>草木与小物</h2><span>{stickers.length} 枚原创贴纸</span></div><p className="tool-description">点一下放入纸页，再随心摆放。</p>{(['草木', '日常', '时光'] as const).map(group => <div className="sticker-group" key={group}><h3>{group}</h3><div className="sticker-grid">{stickers.filter(item => item.group === group).map(item => <button className="sticker-button" key={item.id} aria-label={`添加贴纸：${item.name}`} disabled={!artReady} onClick={() => addSticker(item.id)}><img src={getArt(item.id)} alt="" /><span>{item.name}</span></button>)}</div></div>)}</div>
            <div className="tool-section"><button className="upload-area" disabled={busy} onClick={() => photoInput.current?.click()}><ImagePlus size={21} /><span>贴一张今日照片<small>PNG / JPEG / WebP · 最大 15 MB</small></span><Plus size={16} /></button></div>
            <div className="tool-section object-controls"><div className="tool-heading"><h2>摆放细节</h2>{selected && <span>{objectLabel(selected)}</span>}</div>{selected ? <><label className="control-row">大小 <output>{Math.round(selected.width)} px</output><input type="range" aria-label="贴纸大小" onPointerDown={beginInteraction} onPointerUp={endInteraction} onPointerCancel={endInteraction} min="50" max="420" step="1" value={selected.width} onChange={event => { const width = Number(event.target.value); patchObject(selected.id, { width, height: width * selected.height / selected.width }); }} /></label><label className="control-row">角度 <output>{Math.round(selected.rotation)}°</output><input type="range" aria-label="旋转角度" onPointerDown={beginInteraction} onPointerUp={endInteraction} onPointerCancel={endInteraction} min="-45" max="45" value={selected.rotation} onChange={event => patchObject(selected.id, { rotation: Number(event.target.value) })} /></label><div className="object-action-row"><button className="button ghost" onClick={() => patchObject(selected.id, { rotation: 0 })}><RotateCcw size={13} />摆正</button><button className="button ghost danger" onClick={removeSelected}><Trash2 size={13} />移除素材</button></div></> : <p className="empty-selection">先点选纸页上的贴纸或照片，<br />这里就能调整它的大小和角度。</p>}</div>
          </> : <>
            <div className="tool-section"><div className="tool-heading"><h2>写下今天</h2><span>也可在纸页直接编辑</span></div><label className="text-edit-field">页面标题<input aria-label="编辑标题" value={entry.title} maxLength={24} placeholder="给今天起个名字" onChange={event => patchEntry({ title: event.target.value.replace(/\n/g, '') })} /></label><label className="text-edit-field">今日随笔<textarea aria-label="编辑随笔" rows={5} maxLength={260} value={entry.body} placeholder="写下一件值得记住的小事" onChange={event => patchEntry({ body: event.target.value })} /></label><p className="tool-description">{entry.body.length} / 260 字 · 图片导出按纸页空间排版</p></div>
            <div className="tool-section"><div className="tool-heading"><h2>今天的心情</h2><span>留个小记号</span></div><div className="mood-grid">{moods.map((mood, i) => <button className={`mood-button ${entry.mood === mood ? 'is-active' : ''}`} aria-label={mood} aria-pressed={entry.mood === mood} key={mood} onClick={() => patchEntry({ mood })}><span>{moodSymbols[i]}</span>{mood}</button>)}</div></div>
            <div className="tool-section"><div className="tool-heading"><h2>今日小事</h2><span>{entry.tasks.length} / 5</span></div><p className="tool-description">不必写满，把想做的几件事记下来。</p><form className="task-add" onSubmit={event => { event.preventDefault(); addTask(); }}><input aria-label="新待办" placeholder="例如：给植物浇水" maxLength={28} value={taskText} onChange={event => setTaskText(event.target.value)} /><button className="icon-button" type="submit" aria-label="添加待办" disabled={entry.tasks.length >= 5 || !taskText.trim()}><Plus size={17} /></button></form></div>
            <div className="tool-section"><div className="tool-heading"><h2>给这一页一个开头</h2></div><div className="template-list">{[{ title: '平常的一天，也有小欢喜', text: '今天最想记住的是：\n\n一个小小的发现：\n\n明天想做的事：', name: '日常随记', desc: '从一件小事，慢慢写起' }, { title: '把好看的风景留在这里', text: '今天走过的地方：\n\n看见的颜色与光：\n\n想带回家的记忆：', name: '出游拾光', desc: '留住一段路与一片风景' }].map(template => <button className="template-card" key={template.name} onClick={() => { if (entry.title || entry.body) { setToast('模板适用于空白纸页。可切换到新日期再使用。'); return; } patchEntry({ title: template.title, body: template.text }); setToast('模板已加入，可以直接改写。'); }}><Leaf size={18} /><span>{template.name}<small>{template.desc}</small></span><ChevronRight size={15} /></button>)}</div></div>
            <div className="tool-section"><p className="tool-description">每页标题最多 24 字、随笔最多 260 字，让一张纸容纳完整的一天。长篇可以拆到新的日期。</p></div>
          </>}
        </aside>
      </section>}

      {view === 'books' && <div className="shelf-scene"><div className="desk-prop desk-pen" aria-hidden="true" /><div className="desk-prop desk-tape" aria-hidden="true" /><section className="books-grid" aria-label="手账书架">{state.books.map(item => {
        const cover = covers.find(c => c.id === item.cover) ?? covers[0];
        const dates = Object.keys(item.entries).sort().reverse();
        return <article className={`book-card cover-${item.cover} ${openingBookId === item.id ? 'is-opening' : ''}`} data-testid="book-card" data-book-title={item.title} key={item.id}><button className="book-cover" aria-label={`打开手账：${item.title}`} onClick={() => openBook(item.id)} disabled={openingBookId !== null}><span className="book-geometry"><span className="book-front"><img src={tactileCoverSrc} alt={cover.name} /><span className="book-cover-title">{item.title}<small>一日一笺 · 私家册页</small></span><span className="book-cover-seal">记</span></span><span className="book-spine" aria-hidden="true" /><span className="book-pages" aria-hidden="true" /><span className="book-bottom" aria-hidden="true" /></span></button><div className="book-info"><div><h2>{item.title}</h2><p>{item.subtitle}</p></div><button className="icon-button" aria-label={`编辑手账：${item.title}`} onClick={() => openBookDialog(item.id)}><MoreHorizontal size={19} /></button></div><div className="book-meta"><span>{dates.length} 页记录</span><span>{dates[0] ? `最近写于 ${formatDate(dates[0], { month: 'numeric', day: 'numeric' })}` : '等你写下第一句'}</span></div></article>;
      })}<button className="book-card-new" onClick={() => openBookDialog('new')}><span><Plus size={27} /></span><strong>添一本新册子</strong><p>给读书、旅行或生活，<br />留一个独立的角落。</p></button></section></div>}

      {view === 'calendar' && <section className="calendar-layout"><div className="calendar-panel"><div className="calendar-header"><div><span className="eyebrow">日子有迹</span><h2>{formatDate(`${month}-01`, { year: 'numeric', month: 'long' })}</h2></div><div><button className="icon-button" aria-label="上个月" onClick={() => setMonth(moveMonth(month, -1))}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="下个月" onClick={() => setMonth(moveMonth(month, 1))}><ChevronRight size={18} /></button></div></div><div className="calendar-weekdays">{['一', '二', '三', '四', '五', '六', '日'].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{monthDays(month).map(date => <button aria-label={date} key={date} className={`calendar-day ${date === today ? 'is-today' : ''} ${book.entries[date] ? 'has-entry' : ''} ${date === state.activeDate ? 'is-selected' : ''} ${!date.startsWith(month) ? 'outside-month' : ''}`} onClick={() => chooseDate(date)}><span>{Number(date.slice(-2))}</span>{book.entries[date] && <i />}</button>)}</div><div className="calendar-legend"><i />有记录的日子 <span>{entryCount} 页，慢慢积累。</span></div></div><aside className="calendar-preview"><img className="calendar-preview-image" src={tactileCoverSrc} alt="布面册页插画" /><h2>最近写下的几页</h2><div className="entry-list">{Object.keys(book.entries).sort().reverse().slice(0, 6).map(date => <button className="entry-list-item" key={date} onClick={() => chooseDate(date)}><span>{formatDate(date, { month: 'numeric', day: 'numeric' })}</span><div><strong>{book.entries[date].title || '尚未题名的一页'}</strong><small>{book.entries[date].mood || '平静'} · {book.entries[date].tasks.filter(t => t.done).length} 件小事已完成</small></div><ChevronRight size={14} /></button>)}{entryCount === 0 && <p>这一册还是空白，选一个日期开始写吧。</p>}</div></aside></section>}
    </main>
    <input type="file" accept="image/png,image/jpeg,image/webp" ref={photoInput} data-testid="photo-input" className="visually-hidden" onChange={event => void importPhoto(event.target.files?.[0])} />
    <input type="file" accept="application/json,.json" ref={backupInput} data-testid="backup-input" className="visually-hidden" onChange={event => void restoreBackup(event.target.files?.[0])} />
    <dialog className="modal" ref={modalRef} onCancel={() => setBookDialog(null)} onClose={() => setBookDialog(null)}><form onSubmit={event => { event.preventDefault(); saveBook(); }}><div className="modal-header"><div><span className="eyebrow">案头添一册</span><h2>{bookDialog === 'new' ? '给新手账起个名字' : '修改名字与封面'}</h2></div><button className="icon-button" type="button" aria-label="关闭手账设置" onClick={() => setBookDialog(null)}><X size={18} /></button></div><label className="form-field">手账名称<input aria-label="手账名称" data-testid="book-title-modal" maxLength={28} required autoFocus value={bookName} placeholder="例如：山居小记" onChange={event => setBookName(event.target.value)} /></label><label className="form-field">选择一张封面</label><div className="cover-picker">{covers.map(cover => <button className={`cover-choice cover-${cover.id} ${bookCover === cover.id ? 'is-active' : ''}`} aria-label={`选择封面：${cover.name}`} aria-pressed={bookCover === cover.id} key={cover.id} type="button" onClick={() => setBookCover(cover.id)}><img src={tactileCoverSrc} alt="" /><span>{cover.name}</span>{bookCover === cover.id && <Check size={15} />}</button>)}</div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setBookDialog(null)}>再想想</button><button className="button primary" type="submit" disabled={!bookName.trim()}><Feather size={15} />{bookDialog === 'new' ? '开始记录' : '保存修改'}</button></div></form></dialog>
    {toast && <div className="toast" role="status"><Check size={15} /><span>{toast}</span></div>}
  </div>;
}
