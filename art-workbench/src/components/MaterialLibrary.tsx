import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronDown, Download, Heart, Image, Layers3, Package, Search, SlidersHorizontal, X, ZoomIn } from 'lucide-react';
import { materialCategories, materials } from '../data/materials';
import { referenceBoards } from '../data/reference-boards';
import { traditions } from '../data/traditions';
import type { LibraryMaterial, ReferenceBoard } from '../data/material-types';
import type { ProjectTarget } from '../types';
import { downloadMaterial, downloadMaterialManifest, downloadMaterialPack, downloadMaterialPng, svgDataUrl } from '../lib/material-export';
import './material-library.css';

interface MaterialLibraryProps {
  onUseMaterial: (material: LibraryMaterial, target?: ProjectTarget, traditionId?: string) => void;
  onResearch: (traditionId: string) => void;
}
type LibraryTab = 'materials' | 'references';
type Detail = { kind: 'material'; item: LibraryMaterial } | { kind: 'reference'; item: ReferenceBoard };
const favoriteKey = 'guanwu-material-favorites-v1';
const selectionKey = 'guanwu-material-selection-v1';
const pageSize = 48;
const referenceCategoryLabels: Record<ReferenceBoard['category'], string> = {
  character: '角色与服饰', scene: '场景与空间', prop: '器物与道具', interface: '界面与组件', pattern: '纹样与色彩', architecture: '建筑与园林',
};
const categoryLabel = (id: string) => materialCategories.find(category => category.id === id)?.label ?? referenceCategoryLabels[id as ReferenceBoard['category']] ?? id;
const traditionLabel = (id: string) => traditions.find(tradition => tradition.id === id)?.name ?? id;
function readFavorites(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(favoriteKey) ?? '[]');
    if (!Array.isArray(saved)) return [];
    const ids = new Set([...materials, ...referenceBoards].map(item => item.id));
    return [...new Set(saved.filter((id): id is string => typeof id === 'string' && ids.has(id)))];
  } catch { return []; }
}
function readSelection(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(selectionKey) ?? '[]');
    if (!Array.isArray(saved)) return [];
    const ids = new Set(materials.map(item => item.id));
    return [...new Set(saved.filter((id): id is string => typeof id === 'string' && ids.has(id)))];
  } catch { return []; }
}
function downloadReference(board: ReferenceBoard) {
  const link = document.createElement('a');
  link.href = board.image;
  link.download = board.filename;
  document.body.append(link);
  link.click();
  link.remove();
}

export default function MaterialLibrary({ onUseMaterial, onResearch }: MaterialLibraryProps) {
  const [tab, setTab] = useState<LibraryTab>('materials');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [family, setFamily] = useState('all');
  const [tradition, setTradition] = useState('all');
  const [target, setTarget] = useState('all');
  const [transparentOnly, setTransparentOnly] = useState(false);
  const [tileableOnly, setTileableOnly] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(readFavorites);
  const [selected, setSelected] = useState<string[]>(readSelection);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [zoom, setZoom] = useState(100);
  const [background, setBackground] = useState('checker');
  const [repeat, setRepeat] = useState(false);
  const [pngSize, setPngSize] = useState(1024);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewUrls = useMemo(() => new Map(materials.map(material => [material.id, svgDataUrl(material)])), []);
  const families = useMemo(() => [...new Set(materials.map(material => material.family))], []);
  const featuredBoards = useMemo(() => (['character', 'scene', 'interface', 'pattern'] as const).map(category => referenceBoards.find(board => board.category === category)).filter((board): board is ReferenceBoard => Boolean(board)), []);
  const routeIds = useMemo(() => new Set([...materials, ...referenceBoards].flatMap(item => item.traditionIds)), []);
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedMaterials = useMemo(() => materials.filter(material => selectedSet.has(material.id)), [selectedSet]);
  const query = search.trim().toLocaleLowerCase();
  const filteredMaterials = useMemo(() => materials.filter(material => {
    const searchable = [material.name, material.family, material.description, material.usage, ...material.tags, ...material.traditionIds.map(traditionLabel)].join(' ').toLocaleLowerCase();
    return (!query || searchable.includes(query)) && (category === 'all' || material.category === category)
      && (family === 'all' || material.family === family) && (tradition === 'all' || material.traditionIds.includes(tradition))
      && (target === 'all' || material.targets.some(item => item === target)) && (!transparentOnly || material.transparent)
      && (!tileableOnly || material.tileable) && (!favoriteOnly || favoriteSet.has(material.id));
  }), [query, category, family, tradition, target, transparentOnly, tileableOnly, favoriteOnly, favoriteSet]);
  const filteredReferences = useMemo(() => referenceBoards.filter(board => {
    const searchable = [board.name, board.description, ...board.tags, ...board.traditionIds.map(traditionLabel)].join(' ').toLocaleLowerCase();
    return (!query || searchable.includes(query)) && (category === 'all' || board.category === category)
      && (tradition === 'all' || board.traditionIds.includes(tradition)) && (!favoriteOnly || favoriteSet.has(board.id));
  }), [query, category, tradition, favoriteOnly, favoriteSet]);
  const isMaterialTab = tab === 'materials';
  const currentCount = isMaterialTab ? filteredMaterials.length : filteredReferences.length;
  const fullCount = isMaterialTab ? materials.length : referenceBoards.length;
  const activeFilterCount = [query, category !== 'all', isMaterialTab && family !== 'all', tradition !== 'all', isMaterialTab && target !== 'all', isMaterialTab && transparentOnly, isMaterialTab && tileableOnly, favoriteOnly].filter(Boolean).length;
  const allFilteredSelected = filteredMaterials.length > 0 && filteredMaterials.every(material => selectedSet.has(material.id));
  const currentCategories = isMaterialTab ? materialCategories : Object.entries(referenceCategoryLabels).filter(([id]) => referenceBoards.some(board => board.category === id)).map(([id, label]) => ({ id, label }));

  useEffect(() => { setVisibleCount(pageSize); }, [tab, search, category, family, tradition, target, transparentOnly, tileableOnly, favoriteOnly]);
  useEffect(() => {
    try { localStorage.setItem(favoriteKey, JSON.stringify(favorites)); }
    catch { setNotice('当前浏览器无法保存收藏；本次浏览仍可使用收藏筛选。'); }
  }, [favorites]);
  useEffect(() => {
    try { localStorage.setItem(selectionKey, JSON.stringify(selected)); }
    catch { setNotice('当前浏览器无法保存选中项；本次浏览仍可选择与下载素材。'); }
  }, [selected]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (detail && dialog && !dialog.open) dialog.showModal();
    if (!detail && dialog?.open) dialog.close();
    setZoom(100); setBackground('checker'); setRepeat(false); setPngSize(1024);
  }, [detail]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 6500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function toggleFavorite(id: string) {
    setFavorites(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  }
  function toggleSelected(id: string) {
    setSelected(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  }
  function selectFiltered() {
    if (allFilteredSelected) setSelected(previous => previous.filter(id => !filteredMaterials.some(material => material.id === id)));
    else setSelected(previous => [...new Set([...previous, ...filteredMaterials.map(material => material.id)])]);
  }
  function changeTab(next: LibraryTab) { setTab(next); setCategory('all'); }
  function clearFilters() {
    setSearch(''); setCategory('all'); setFamily('all'); setTradition('all'); setTarget('all');
    setTransparentOnly(false); setTileableOnly(false); setFavoriteOnly(false);
  }
  async function runDownload(id: string, task: () => void | Promise<void>, message: string) {
    if (busy) return;
    setBusy(id);
    try { await task(); setNotice(message); }
    catch (error) { setNotice(`下载未完成：${error instanceof Error ? error.message : '请重试或使用 SVG 下载。'}`); }
    finally { setBusy(null); }
  }
  function useMaterial(material: LibraryMaterial) {
    setDetail(null);
    const preferredTarget = (target === 'app' || target === 'game') && material.targets.includes(target) ? target : undefined;
    const preferredTradition = tradition !== 'all' && material.traditionIds.includes(tradition) ? tradition : undefined;
    onUseMaterial(material, preferredTarget, preferredTradition);
  }
  function research(id: string) { setDetail(null); onResearch(id); }

  return <section className="page-width tool-page material-library" aria-label="中国美学素材库">
    <div className="material-library-heading">
      <div className="material-heading-copy">
        <span className="eyebrow"><i /> COLLECT · ADAPT · CREATE</span>
        <h1>造物素材库<span className="material-heading-seal" aria-hidden="true">用</span></h1>
        <p>从一枚图标，到一整套视觉语言。为游戏与 App 收集形、色、纹与空间，选好后直接带入制作。</p>
        <div className="material-library-stats">
          <span><strong>{materials.length}</strong> 可用矢量素材</span><span><strong>{materialCategories.length}</strong> 素材分类</span><span><strong>{referenceBoards.length}</strong> 美术参考板</span>
        </div>
      </div>
      <div className="material-heading-mosaic" aria-hidden="true">
        {[materials.find(item => item.category === 'prop'), materials.find(item => item.category === 'pattern'), materials.find(item => item.category === 'frame'), materials.find(item => item.category === 'icon')].filter((item): item is LibraryMaterial => Boolean(item)).map((material, index) => <div key={material.id} className={`mosaic-tile mosaic-tile-${index}`}><img src={previewUrls.get(material.id)} alt="" /></div>)}
        <span>取其形 · 会其意</span>
      </div>
    </div>

    <div className="material-featured-section" aria-label="精选美术参考">
      <div className="material-featured-heading"><h2>先看画面，再选素材</h2><p>四组视觉入口 · 点击看完整参考板</p></div>
      <div className="material-featured-grid">{featuredBoards.map(board => <button key={board.id} className="material-featured-card" data-testid="reference-featured" aria-label={`查看精选参考：${board.name}`} onClick={() => setDetail({ kind: 'reference', item: board })}><span className="material-featured-image"><img src={board.image} alt={board.name} loading="lazy" /><span>多案例参考板</span></span><span className="material-featured-copy"><span>{referenceCategoryLabels[board.category]}</span><strong>{board.name}</strong><ArrowRight size={13} /></span></button>)}</div>
    </div>

    <div className="material-tabs" role="tablist" aria-label="素材库内容">
      <button role="tab" id="material-tab-ready" aria-selected={isMaterialTab} aria-controls="material-results" onClick={() => changeTab('materials')}><Layers3 size={17} />可用素材 <span>{materials.length}</span></button>
      <button role="tab" id="material-tab-references" aria-selected={!isMaterialTab} aria-controls="material-results" onClick={() => changeTab('references')}><Image size={17} />参考图库 <span>{referenceBoards.length}</span></button>
      <p>{isMaterialTab ? '完整 SVG · 可转 PNG · 离线打包' : '原创 AI 美术研究板 · 整板下载'}</p>
    </div>
    <div className="material-content-layout">
      <aside className="material-filter-panel" aria-label="素材筛选">
        <div className="material-filter-title"><span><SlidersHorizontal size={14} />筛选素材</span>{activeFilterCount > 0 && <button onClick={clearFilters}>清空 {activeFilterCount}</button>}</div>
        <label className="material-search"><Search size={15} /><input aria-label="搜索素材" value={search} onChange={event => setSearch(event.target.value)} placeholder="名称、纹样、用途…" />{search && <button onClick={() => setSearch('')} aria-label="清空搜索"><X size={14} /></button>}</label>
        <label className="material-filter-field">素材分类<div><select aria-label="素材分类" value={category} onChange={event => setCategory(event.target.value)}><option value="all">全部分类</option>{currentCategories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown size={13} /></div></label>
        {isMaterialTab && <label className="material-filter-field">素材家族<div><select aria-label="素材家族" value={family} onChange={event => setFamily(event.target.value)}><option value="all">全部家族</option>{families.map(item => <option key={item} value={item}>{item}</option>)}</select><ChevronDown size={13} /></div></label>}
        <label className="material-filter-field">美学路线<div><select aria-label="美学路线" value={tradition} onChange={event => setTradition(event.target.value)}><option value="all">全部美学路线</option>{traditions.filter(item => routeIds.has(item.id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={13} /></div></label>
        {isMaterialTab && <label className="material-filter-field">使用方向<div><select aria-label="使用方向" value={target} onChange={event => setTarget(event.target.value)}><option value="all">游戏与 App</option><option value="game">游戏美术</option><option value="app">App 与网页</option></select><ChevronDown size={13} /></div></label>}
        <div className="material-filter-checks">
          {isMaterialTab && <><label><input type="checkbox" checked={transparentOnly} onChange={event => setTransparentOnly(event.target.checked)} />仅透明素材</label><label><input type="checkbox" checked={tileableOnly} onChange={event => setTileableOnly(event.target.checked)} />仅可平铺素材</label></>}
          <label><input type="checkbox" checked={favoriteOnly} onChange={event => setFavoriteOnly(event.target.checked)} /><Heart size={12} />仅看收藏 <span>{favorites.length}</span></label>
        </div>
        <div className="material-side-note"><BookOpen size={18} /><h2>{isMaterialTab ? '先有素材，再做变化' : '先看完整的视觉关系'}</h2><p>{isMaterialTab ? '这里提供原创 SVG 源文件，尺寸、透明与平铺属性逐项标明。器物与场景为二维矢量插画。' : '参考板用来讨论角色、环境、材质与色彩。整板中的图格没有被计作独立可用素材。'}</p><p>中国古代美学的当代转译，历史出处可到研究库查阅。</p></div>
      </aside>

      <div id="material-results" role="tabpanel" aria-labelledby={isMaterialTab ? 'material-tab-ready' : 'material-tab-references'} className="material-results">
        <div className="material-category-chips" aria-label="快速分类"><button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>全部 <span>{fullCount}</span></button>{currentCategories.map(item => <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>{item.label}<span>{isMaterialTab ? materials.filter(material => material.category === item.id).length : referenceBoards.filter(board => board.category === item.id).length}</span></button>)}</div>
        <div className="material-result-toolbar">
          <p data-testid="material-result-count" data-count={currentCount}>找到 <strong>{currentCount}</strong> 项{isMaterialTab ? '素材' : '参考板'}<span> / {fullCount}</span></p>
          {isMaterialTab && <div><label className="material-select-filtered"><input type="checkbox" checked={allFilteredSelected} onChange={selectFiltered} disabled={filteredMaterials.length === 0} />选择筛选结果</label><button className="text-button" data-testid="material-filtered-pack" disabled={busy !== null || filteredMaterials.length === 0} onClick={() => void runDownload('filtered-pack', () => downloadMaterialPack(filteredMaterials), `已生成 ${filteredMaterials.length} 项素材的 ZIP 包，包含 SVG、清单与使用说明。`)}><Download size={13} />{busy === 'filtered-pack' ? '正在打包…' : '下载当前分类'}</button></div>}
        </div>
        {currentCount === 0 ? <div className="empty-state material-empty"><Search size={30} /><h2>暂时没有匹配的素材</h2><p>换一个关键词，或清空筛选查看全部内容。</p><button className="button button-light" onClick={clearFilters}>清空筛选</button></div> : isMaterialTab ? <>
          <div className="material-grid">{filteredMaterials.slice(0, visibleCount).map(material => <article className={`material-card${selectedSet.has(material.id) ? ' is-selected' : ''}`} key={material.id} data-testid="material-card" data-material-id={material.id} data-category={material.category} data-family={material.family} data-transparent={String(material.transparent)} data-tileable={String(material.tileable)}>
            <div className={`material-card-art material-art-${material.category}`}>
              <button className="material-preview-button" data-testid="material-open" aria-label={`预览素材：${material.name}`} onClick={() => setDetail({ kind: 'material', item: material })}><img src={previewUrls.get(material.id)} alt={material.name} loading="lazy" /></button>
              <label className="material-card-select"><input type="checkbox" aria-label={`选择${material.name}`} checked={selectedSet.has(material.id)} onChange={() => toggleSelected(material.id)} /><span><Check size={12} /></span></label>
              <button className={`material-favorite${favoriteSet.has(material.id) ? ' active' : ''}`} aria-label={`收藏${material.name}`} aria-pressed={favoriteSet.has(material.id)} onClick={() => toggleFavorite(material.id)}><Heart size={14} fill={favoriteSet.has(material.id) ? 'currentColor' : 'none'} /></button>
              <span className="material-format-stamp">SVG</span>
            </div>
            <div className="material-card-body"><div className="material-card-meta"><span>{categoryLabel(material.category)}</span><span>{material.family}</span></div><button className="material-name" onClick={() => setDetail({ kind: 'material', item: material })}><h2>{material.name}</h2><ArrowRight size={14} /></button><p>{material.description}</p><div className="material-card-flags"><span>{material.width} × {material.height}</span>{material.transparent && <span>透明</span>}{material.tileable && <span>可平铺</span>}</div><div className="material-card-footer"><span>{material.targets.map(item => item === 'game' ? '游戏' : 'App').join(' / ')}</span><button aria-label={`下载${material.name} SVG`} disabled={busy !== null} onClick={() => void runDownload(material.id, () => downloadMaterial(material), `已下载 ${material.name} 的 SVG 源文件。`)}><Download size={12} />源文件</button></div></div>
          </article>)}</div>
          {visibleCount < filteredMaterials.length && <div className="material-load-more"><p>已展示 {Math.min(visibleCount, filteredMaterials.length)} / {filteredMaterials.length} 项</p><button className="button button-light" onClick={() => setVisibleCount(count => count + pageSize)}>加载更多素材 <ChevronDown size={15} /></button></div>}
        </> : <div className="material-reference-grid">{filteredReferences.map(board => <article key={board.id} className="material-reference-card" data-testid="reference-card" data-reference-id={board.id} data-reference-filename={board.filename}>
          <div className="material-reference-art"><button data-testid="reference-open" aria-label={`预览参考板：${board.name}`} onClick={() => setDetail({ kind: 'reference', item: board })}><img src={board.image} alt={board.name} loading="lazy" /></button><button className={`material-favorite${favoriteSet.has(board.id) ? ' active' : ''}`} aria-label={`收藏${board.name}`} aria-pressed={favoriteSet.has(board.id)} onClick={() => toggleFavorite(board.id)}><Heart size={15} fill={favoriteSet.has(board.id) ? 'currentColor' : 'none'} /></button><span className="material-reference-stamp">美术研究板</span></div><div className="material-reference-body"><span>{referenceCategoryLabels[board.category]} · 原创 AI 视觉研究</span><button className="material-name" onClick={() => setDetail({ kind: 'reference', item: board })}><h2>{board.name}</h2><ArrowRight size={15} /></button><p>{board.description}</p><div className="material-reference-tags">{board.tags.slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}</div><button className="text-button" onClick={() => downloadReference(board)}><Download size={13} />下载整张参考板</button></div>
        </article>)}</div>}
        <p className="material-library-boundary">{isMaterialTab ? '可用素材：本库原创矢量资产，可用于个人与商业项目，可修改，无需署名；授权和使用说明随素材包提供。' : '参考图库：AI 生成的原创研究图，用于观察与讨论；并非馆藏原图、历史复原或已拆分的角色立绘、场景切片。'}</p>
      </div>
    </div>

    {selectedMaterials.length > 0 && <div className="material-selection-tray" aria-label="已选素材"><div><Package size={20} /><p>已选 <strong>{selectedMaterials.length}</strong> 项素材<small>已选项保存在此浏览器，切换筛选后可继续加入。</small></p></div><div className="material-selection-actions"><button className="text-button" disabled={busy !== null} onClick={() => setSelected([])}>清空</button><button className="button button-light" disabled={busy !== null} data-testid="material-manifest" onClick={() => downloadMaterialManifest(selectedMaterials)}>导出清单</button><button className="button button-dark" data-testid="material-pack" disabled={busy !== null} onClick={() => void runDownload('selected-pack', () => downloadMaterialPack(selectedMaterials), `已生成 ${selectedMaterials.length} 项选中素材的 ZIP 包。`)}><Download size={14} />{busy === 'selected-pack' ? '正在打包…' : `下载选中素材包（${selectedMaterials.length}）`}</button></div></div>}
    {notice && <div className="material-notice" role="status"><Check size={15} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="关闭素材提示"><X size={14} /></button></div>}

    <dialog ref={dialogRef} className="material-detail-dialog" data-testid="material-dialog" data-material-id={detail?.item.id} data-detail-kind={detail?.kind} aria-labelledby="material-detail-title" onClose={() => setDetail(null)} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setDetail(null); } }}>
      {detail && <><header className="material-detail-heading"><div><span>{detail.kind === 'material' ? `${categoryLabel(detail.item.category)} · ${detail.item.family}` : `${referenceCategoryLabels[detail.item.category]} · 美术研究板`}</span><h2 id="material-detail-title">{detail.item.name}</h2></div><button className="icon-button" aria-label="关闭素材详情" onClick={() => setDetail(null)}><X size={20} /></button></header><div className="material-detail-body">
        <div className="material-detail-visual"><div className={`material-large-preview preview-background-${background}${repeat ? ' is-repeating' : ''}`} data-testid="material-large-preview" style={repeat && detail.kind === 'material' ? { backgroundImage: `url("${previewUrls.get(detail.item.id)}")`, backgroundSize: `${96 * zoom / 100}px` } : undefined}>{!repeat && <img src={detail.kind === 'material' ? previewUrls.get(detail.item.id) : detail.item.image} alt={detail.item.name} style={{ width: `${zoom}%`, maxWidth: 'none' }} />}</div><div className="material-preview-controls"><label><ZoomIn size={13} /><span>缩放</span><input type="range" aria-label="预览缩放" min="50" max="200" step="25" value={zoom} onChange={event => setZoom(Number(event.target.value))} /><output>{zoom}%</output></label><label>背景<select aria-label="预览背景" value={background} onChange={event => setBackground(event.target.value)}><option value="checker">透明棋盘</option><option value="paper">浅纸色</option><option value="dark">深底色</option></select></label>{detail.kind === 'material' && detail.item.tileable && <label className="material-repeat-control"><input type="checkbox" checked={repeat} onChange={event => setRepeat(event.target.checked)} />查看平铺</label>}</div></div>
        <div className="material-detail-info"><span className="material-readiness"><Check size={12} />{detail.kind === 'material' ? '可下载并编辑的原创素材' : '完整美术参考板'}</span><p className="material-detail-description">{detail.item.description}</p>{detail.kind === 'material' ? <><dl className="material-specifications"><div><dt>源文件</dt><dd>可编辑 SVG 矢量</dd></div><div><dt>导出格式</dt><dd>SVG / PNG</dd></div><div><dt>原始画布</dt><dd>{detail.item.width} × {detail.item.height}</dd></div><div><dt>透明背景</dt><dd>{detail.item.transparent ? '有透明区域' : '画布带底色'}</dd></div><div><dt>重复使用</dt><dd>{detail.item.tileable ? '可连续平铺' : '独立图形'}</dd></div><div><dt>使用方向</dt><dd>{detail.item.targets.map(item => item === 'game' ? '游戏' : 'App / 网页').join(' · ')}</dd></div></dl><h3>使用建议</h3><p>{detail.item.usage}</p>{detail.item.category === 'interface' && <p className="material-detail-micro">界面素材为可编辑的布局图形。项目中的实际文本、控件交互与响应式布局需要另外开发。</p>}<label className="material-png-size">PNG 导出尺寸<select aria-label="PNG 导出尺寸" data-testid="material-png-size" value={pngSize} onChange={event => setPngSize(Number(event.target.value))}><option value={256}>最长边 256 px</option><option value={512}>最长边 512 px</option><option value={1024}>最长边 1024 px</option><option value={2048}>最长边 2048 px</option><option value={4096}>最长边 4096 px</option></select></label><div className="material-download-actions"><button className="button button-dark" data-testid="material-download-svg" disabled={busy !== null} onClick={() => void runDownload('detail-svg', () => downloadMaterial(detail.item as LibraryMaterial), '已下载 SVG 源文件。')}><Download size={14} />下载 SVG</button><button className="button button-light" data-testid="material-download-png" disabled={busy !== null} onClick={() => void runDownload('detail-png', () => downloadMaterialPng(detail.item as LibraryMaterial, pngSize), `已导出 PNG，最长边为 ${pngSize} 像素。`)}><Image size={14} />{busy === 'detail-png' ? '导出 PNG…' : '导出 PNG'}</button></div><p className="material-detail-micro">PNG 按所选最长边尺寸导出，保留原图比例与透明区域。SVG 可在设计软件中改色、修改结构。</p><button className="button button-light material-use-button" data-testid="material-use" onClick={() => useMaterial(detail.item as LibraryMaterial)}>带入制作台<ArrowRight size={15} /></button></> : <><div className="material-reference-guidance"><h3>把参考变成资产</h3><p>先从整板选择色彩、服饰轮廓或空间结构，再到制作台明确需要的单个素材、尺寸和透明规则。</p><p>图格仍在同一张图片里，下载得到完整参考板。用于角色动画、游戏场景或 App 组件前需要单独制作与适配。</p></div><button className="button button-dark" data-testid="reference-download" onClick={() => downloadReference(detail.item as ReferenceBoard)}><Download size={14} />下载整张 PNG 参考板</button><p className="material-detail-micro">原创 AI 美术研究图；不代表特定年代器物、服饰与建筑的考古复原。</p></>}
          <div className="material-detail-tags">{detail.item.tags.map(tag => <span key={tag}>{tag}</span>)}</div>{detail.item.traditionIds.length > 0 && <div className="material-detail-routes"><h3>相关美学路线</h3>{detail.item.traditionIds.map(id => <button className="text-button" key={id} onClick={() => research(id)}><BookOpen size={12} />{traditionLabel(id)}<ArrowRight size={12} /></button>)}</div>}<p className="material-detail-micro">{detail.kind === 'material' ? '原创当代设计。历史对象与来源在研究库中单独标注；素材包内提供授权说明。' : 'AI 生成的原创视觉研究，适合参考与讨论。馆藏文物图片与历史证据另见研究库。'}</p>
        </div>
      </div></>}
    </dialog>
  </section>;
}
