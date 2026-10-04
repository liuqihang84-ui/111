import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Feather, ImagePlus, Layers, ListChecks, Plus, Redo2, RotateCcw, Trash2, Undo2, X } from 'lucide-react';
import { MemoryScene } from '../lib/memory-scene';
import { isSafePhotoSource, localDate, uid } from '../lib/model';
import type { JournalBook, JournalEntry } from '../lib/model';

type MemoryKind = 'note' | 'photo' | 'tasks';
type MemoryLayout = 'spread' | 'gather';

export interface MemoryBoardProps {
  book: JournalBook;
  entry: JournalEntry;
  onPatchEntry: (patch: Partial<JournalEntry>) => void;
  onEditEntry: (update: (entry: JournalEntry) => JournalEntry) => void;
  onPhotoRequest: () => void;
  onRemovePhoto: (id: string) => void;
  onChooseDate: (date: string) => void;
  onCanvas: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  busy: boolean;
  saveStatus: string;
}

const moods = ['平静', '晴朗', '忙碌', '低落', '期待'];
const panelNames: Record<MemoryKind, string> = { note: '记一笔', photo: '留住一刻', tasks: '今日小事' };

export function MemoryBoard({ book, entry, onPatchEntry, onEditEntry, onPhotoRequest, onRemovePhoto, onChooseDate, onCanvas, onUndo, onRedo, canUndo, canRedo, busy, saveStatus }: MemoryBoardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<MemoryScene | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [panel, setPanel] = useState<MemoryKind | null>(null);
  const [layout, setLayout] = useState<MemoryLayout>('spread');
  const [taskText, setTaskText] = useState('');
  const openPanelRef = useRef<(kind: MemoryKind) => void>(() => undefined);
  const photos = entry.objects.filter(object => object.kind === 'photo' && isSafePhotoSource(object.src));
  const legacyCount = entry.objects.filter(object => object.kind === 'sticker').length;
  const date = new Date(`${entry.date}T12:00:00`);
  const dateLabel = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  const weekday = date.toLocaleDateString('zh-CN', { weekday: 'short' });

  openPanelRef.current = kind => setPanel(kind);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    try {
      const scene = new MemoryScene(host, {
        onCardSelect: kind => { if (!disposed) openPanelRef.current(kind); },
        onAvailability: value => { if (!disposed) setAvailable(value); },
      });
      sceneRef.current = scene;
      return () => { disposed = true; sceneRef.current = null; scene.dispose(); };
    } catch {
      setAvailable(false);
      return () => { disposed = true; };
    }
  }, [book.id]);

  useEffect(() => {
    let active = true;
    sceneRef.current?.setEntry(entry, book.title).catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, [book.id, book.title, entry]);

  useEffect(() => { sceneRef.current?.setLayout(layout); }, [book.id, layout]);

  useEffect(() => {
    if (!panel) return;
    const timer = window.setTimeout(() => {
      const inspector = inspectorRef.current;
      if (!inspector) return;
      if (window.matchMedia('(max-width: 760px)').matches) inspector.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [panel]);

  useEffect(() => { setTaskText(''); }, [entry.date, book.id]);

  function moveDate(amount: number) {
    const next = new Date(`${entry.date}T12:00:00`);
    next.setDate(next.getDate() + amount);
    if (next.getFullYear() >= 1 && next.getFullYear() <= 9999) onChooseDate(localDate(next));
  }

  function addTask() {
    const text = taskText.trim();
    if (!text || entry.tasks.length >= 5) return;
    onEditEntry(current => current.tasks.length < 5 ? { ...current, tasks: [...current.tasks, { id: uid(), text, done: false }] } : current);
    setTaskText('');
  }

  function requestPhoto() {
    setPanel('photo');
    onPhotoRequest();
  }

  return <section className="memory-workspace" aria-label="记忆卡片工作区">
    <div className="memory-topbar">
      <div className="memory-book-context"><span className="memory-context-dot" aria-hidden="true" /><h1>{book.title}</h1><span>记忆卡片</span></div>
      <div className="memory-date-nav">
        <button className="memory-icon-button" aria-label="前一天" disabled={entry.date === '0001-01-01'} onClick={() => moveDate(-1)}><ChevronLeft size={16} /></button>
        <label className="memory-date-picker"><CalendarDays size={15} aria-hidden="true" /><span>{dateLabel}</span><small>{weekday}</small><input aria-label="页面日期" type="date" min="0001-01-01" max="9999-12-31" value={entry.date} onClick={event => { try { event.currentTarget.showPicker(); } catch { /* Native keyboard input remains available. */ } }} onChange={event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) onChooseDate(event.target.value); }} /></label>
        <button className="memory-icon-button" aria-label="后一天" disabled={entry.date === '9999-12-31'} onClick={() => moveDate(1)}><ChevronRight size={16} /></button>
      </div>
      <div className="memory-history"><button className="memory-icon-button" aria-label="撤销" disabled={!canUndo} onClick={onUndo}><Undo2 size={16} /></button><button className="memory-icon-button" aria-label="重做" disabled={!canRedo} onClick={onRedo}><Redo2 size={16} /></button></div>
    </div>

    <div className={`memory-stage-layout ${panel ? 'has-panel' : ''}`}>
      <div className={`memory-stage ${available === false ? 'is-fallback' : ''}`}>
        <div ref={hostRef} className="memory-scene-host" aria-label="三维记忆卡组" aria-hidden={available === false} />
        {available === null && <p className="memory-loading" role="status">正在准备空间</p>}
        {available === false && <div className="memory-fallback" aria-label="记忆卡片列表">
          <p className="memory-fallback-status" role="status">空间显示暂不可用，仍可编辑所有记录。</p>
          <button className="memory-fallback-note" onClick={() => setPanel('note')}><span>文字</span><h2>{entry.title || '写下今天的一刻'}</h2><p>{entry.body || '从一句话开始。'}</p><span className="memory-fallback-edit">记一笔 <Feather size={15} /></span></button>
          {photos.length > 0 && <button className="memory-fallback-photos" onClick={() => setPanel('photo')}><span>照片 · {photos.length}</span><div>{photos.slice(-6).map((photo, index) => <img key={photo.id} src={photo.src} alt={`照片 ${Math.max(0, photos.length - 6) + index + 1}`} />)}</div><span>管理照片</span></button>}
          {entry.tasks.length > 0 && <button className="memory-fallback-tasks" onClick={() => setPanel('tasks')}><span>今日小事</span><ul>{entry.tasks.map(task => <li key={task.id} className={task.done ? 'is-done' : ''}><i aria-hidden="true">{task.done ? '✓' : ''}</i>{task.text}</li>)}</ul><span>编辑小事</span></button>}
        </div>}
        {available === true && <div className="memory-view-controls" aria-label="卡组视角"><button aria-label={layout === 'spread' ? '收拢卡片' : '展开卡片'} onClick={() => setLayout(current => current === 'spread' ? 'gather' : 'spread')}><Layers size={15} />{layout === 'spread' ? '收拢' : '展开'}</button><button className="memory-reset-view" aria-label="复位视角" onClick={() => sceneRef.current?.resetView()}><RotateCcw size={15} /></button></div>}
      </div>

      {panel && <aside ref={inspectorRef} className="memory-inspector" aria-label="编辑记忆">
        <div className="memory-inspector-heading"><div><span>{dateLabel}</span><h2>{panelNames[panel]}</h2></div><button className="memory-icon-button" aria-label="关闭编辑面板" onClick={() => setPanel(null)}><X size={18} /></button></div>
        <div className="memory-panel-tabs" role="tablist" aria-label="记录内容"><button role="tab" aria-selected={panel === 'note'} aria-controls="memory-panel-note" onClick={() => setPanel('note')}>文字</button><button role="tab" aria-selected={panel === 'photo'} aria-controls="memory-panel-photo" onClick={() => setPanel('photo')}>照片{photos.length > 0 && <span>{photos.length}</span>}</button><button role="tab" aria-selected={panel === 'tasks'} aria-controls="memory-panel-tasks" onClick={() => setPanel('tasks')}>小事{entry.tasks.length > 0 && <span>{entry.tasks.length}</span>}</button></div>
        {panel === 'note' && <div id="memory-panel-note" className="memory-note-fields" role="tabpanel" aria-label="文字">
          <label className="memory-field-label" htmlFor="memory-title">标题</label><input id="memory-title" aria-label="记忆标题" value={entry.title} maxLength={24} placeholder="给这一刻一个名字" onChange={event => onPatchEntry({ title: event.target.value })} />
          <label className="memory-field-label" htmlFor="memory-body">随笔</label><textarea id="memory-body" aria-label="记忆随笔" value={entry.body} maxLength={260} placeholder="今天，有什么想留下？" onChange={event => onPatchEntry({ body: event.target.value })} /><span className="memory-field-count">{entry.body.length} / 260</span>
          <label className="memory-mood-row"><span>此刻心情</span><select aria-label="记忆心情" value={entry.mood} onChange={event => onPatchEntry({ mood: event.target.value })}>{!moods.includes(entry.mood) && <option value={entry.mood}>{entry.mood}</option>}{moods.map(mood => <option key={mood}>{mood}</option>)}</select></label>
        </div>}
        {panel === 'photo' && <div id="memory-panel-photo" className="memory-photo-panel" role="tabpanel" aria-label="照片">
          <button className="memory-panel-add" disabled={busy} onClick={requestPhoto}><ImagePlus size={17} />{busy ? '正在处理照片' : '添加照片'}</button>
          {photos.length === 0 ? <p className="memory-panel-empty">从相册选一张，留下这一刻。</p> : <><p className="memory-photo-count">{photos.length} 张照片{photos.length > 6 && ' · 空间中显示最新 6 张'}</p><div className="memory-photo-list">{photos.map((photo, index) => <div className="memory-photo-item" key={photo.id}><img src={photo.src} alt={`照片 ${index + 1}`} /><div><span>照片 {index + 1}</span><button className="memory-icon-button" aria-label={`删除照片 ${index + 1}`} onClick={() => onRemovePhoto(photo.id)}><Trash2 size={15} /></button></div></div>)}</div></>}
        </div>}
        {panel === 'tasks' && <div id="memory-panel-tasks" className="memory-tasks-panel" role="tabpanel" aria-label="小事">
          <form className="memory-task-add" onSubmit={event => { event.preventDefault(); addTask(); }}><input aria-label="小事内容" value={taskText} maxLength={28} disabled={entry.tasks.length >= 5} placeholder={entry.tasks.length >= 5 ? '今天的小事已满' : '一件想完成的小事'} onChange={event => setTaskText(event.target.value)} /><button aria-label="添加小事" type="submit" disabled={!taskText.trim() || entry.tasks.length >= 5}><Plus size={18} /></button></form>
          {entry.tasks.length === 0 ? <p className="memory-panel-empty">不必填满一天，留下一件就好。</p> : <ul className="memory-task-list">{entry.tasks.map(task => <li key={task.id} className={task.done ? 'is-done' : ''}><label><input type="checkbox" aria-label={`完成小事：${task.text}`} checked={task.done} onChange={() => onEditEntry(current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, done: !item.done } : item) }))} /><span>{task.text}</span></label><button className="memory-icon-button" aria-label={`删除小事：${task.text}`} onClick={() => onEditEntry(current => ({ ...current, tasks: current.tasks.filter(item => item.id !== task.id) }))}><Trash2 size={15} /></button></li>)}</ul>}
        </div>}
      </aside>}
    </div>

    <div className="memory-commandbar" aria-label="添加记忆"><div className="memory-main-actions"><button className="memory-action memory-action-primary" aria-expanded={panel === 'note'} onClick={() => setPanel('note')}><Feather size={17} /><span>记一笔</span></button><button className="memory-action" disabled={busy} aria-expanded={panel === 'photo'} onClick={requestPhoto}><ImagePlus size={17} /><span>添照片</span></button><button className="memory-action" aria-expanded={panel === 'tasks'} onClick={() => setPanel('tasks')}><ListChecks size={17} /><span>加小事</span></button></div><span className="memory-save-status" role="status"><i aria-hidden="true" />{saveStatus}</span></div>
    <div className="memory-bottomline"><span>{available === true ? '拖动空白处旋转 · 点击卡片编辑' : '记录保存在此浏览器'}</span><button onClick={onCanvas}>旧画布{legacyCount > 0 && <span> · {legacyCount} 件素材</span>}<ChevronRight size={14} /></button></div>
  </section>;
}
