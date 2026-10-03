import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, Copy, Download, FlaskConical, FolderOpen, Layers3, Menu, Plus, Search, SlidersHorizontal, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { traditions, sources, concepts } from './data/traditions';
import type { ArtTradition, BriefInput, GeneratedBrief, ResearchConcept, SavedProject } from './types';
import Workbench from './components/Workbench';
import QualityLab from './components/QualityLab';
import { downloadText, loadProjects, parseProjects, saveProjects } from './lib/projects';
import landscapeImage from './assets/landscape.png';
import formsImage from './assets/forms.png';

type View = 'research' | 'workbench' | 'quality' | 'projects';
const views: { id: View; name: string; icon: typeof BookOpen }[] = [
  { id: 'research', name: '研究馆', icon: BookOpen },
  { id: 'workbench', name: '制作台', icon: Sparkles },
  { id: 'quality', name: '检验室', icon: FlaskConical },
  { id: 'projects', name: '项目册', icon: FolderOpen },
];
const imageMap = { landscape: landscapeImage, forms: formsImage };
const positions = { left: '0%', center: '-33.333333%', right: '-66.666667%' };
function eraGroup(t: ArtTradition) {
  if (t.id.startsWith('han-')) return '汉代';
  if (['blue-green-landscape', 'southern-song', 'song-bird-flower', 'song-ceramics'].includes(t.id)) return '宋代';
  if (t.id === 'dunhuang') return '北朝至唐';
  if (t.id === 'blue-white') return '元明';
  if (t.id === 'calligraphy') return '跨时期';
  return '明清与传承';
}

function viewFromHash(): View {
  const candidate = window.location.hash.slice(1);
  return views.some(v => v.id === candidate) ? candidate as View : 'research';
}

function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} className={`study-dialog ${wide ? 'dialog-wide' : ''}`} aria-labelledby={id} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="dialog-heading"><h2 id={id}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="关闭窗口"><X size={20} /></button></div>
    <div className="dialog-body">{children}</div>
  </dialog>;
}

function StudyImage({ tradition, className = '' }: { tradition: ArtTradition; className?: string }) {
  return <div className={`study-image ${className}`}><img src={imageMap[tradition.image]} alt={`${tradition.name}的原创形式研究示意，非馆藏图`} style={{ transform: `translateX(${positions[tradition.imagePosition]})` }} /></div>;
}

function Palette({ tradition, onCopy }: { tradition: ArtTradition; onCopy: (text: string) => void }) {
  return <div className="palette-row">{tradition.palette.map(color => <button key={color.hex} className="color-chip" onClick={() => onCopy(color.hex)} title={`复制 ${color.name} ${color.hex}`} aria-label={`复制${color.name}色值${color.hex}`}>
    <span style={{ backgroundColor: color.hex }} /><small>{color.name}</small><code>{color.hex}</code>
  </button>)}</div>;
}

function ApplicationPreview({ tradition }: { tradition: ArtTradition }) {
  const [spacing, setSpacing] = useState(60);
  const [mode, setMode] = useState<'card' | 'inventory'>('card');
  const accent = tradition.palette.find(p => p.role.includes('强调'))?.hex ?? tradition.palette[1].hex;
  const ink = tradition.palette[0].hex;
  return <div className="application-experiment">
    <div className="experiment-controls"><div className="segmented-control"><button className={mode === 'card' ? 'selected' : ''} onClick={() => setMode('card')}>阅读卡片</button><button className={mode === 'inventory' ? 'selected' : ''} onClick={() => setMode('inventory')}>物件目录</button></div><label>空间疏密 <input aria-label="预览空间疏密" type="range" min="10" max="100" value={spacing} onChange={e => setSpacing(Number(e.target.value))} /></label></div>
    <div className="sample-ui" style={{ padding: `${12 + spacing / 3}px`, borderColor: accent }}>
      <div className="sample-ui-top"><span style={{ color: accent }}>物候 · 观察册</span><span>立春 / 01</span></div>
      {mode === 'card' ? <><h3 style={{ color: ink }}>一枝新梅，几点春色。</h3><p>从形态与材料开始观察，让每一种颜色都有自己的位置。</p><div className="sample-color-line">{tradition.palette.map(p => <i key={p.hex} style={{ background: p.hex }} />)}</div></> : <div className="sample-inventory">{['竹编', '青瓷', '纸绢'].map((item, i) => <div key={item} style={{ borderColor: tradition.palette[i + 1].hex }}><span className="sample-shape" style={{ background: tradition.palette[i + 1].hex }} /><span>{item}</span></div>)}</div>}
      <div className="sample-ui-bottom"><span>界面转译示意</span><span style={{ color: accent }}>继续观察 →</span></div>
    </div><p className="micro-note">此处将参考色应用到现代界面。调整疏密可观察留白变化；文本和控制仍须在检验室核对对比度。</p>
  </div>;
}

export default function App() {
  const [view, setView] = useState<View>(viewFromHash);
  const [selectedId, setSelectedId] = useState(traditions[0].id);
  const [detail, setDetail] = useState<ArtTradition | null>(null);
  const [detailTab, setDetailTab] = useState<'principles' | 'applications' | 'sources'>('principles');
  const [query, setQuery] = useState('');
  const [era, setEra] = useState('all');
  const [medium, setMedium] = useState('all');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [concept, setConcept] = useState<ResearchConcept | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);
  const [projects, setProjects] = useState<SavedProject[]>(() => loadProjects(traditions));
  const [initialInput, setInitialInput] = useState<BriefInput | undefined>();
  const [initialBrief, setInitialBrief] = useState<GeneratedBrief | undefined>();
  const [projectEpoch, setProjectEpoch] = useState(0);
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selected = traditions.find(t => t.id === selectedId) ?? traditions[0];
  const filtered = useMemo(() => traditions.filter(t => (era === 'all' || eraGroup(t) === era) && (medium === 'all' || t.medium === medium) && (!query.trim() || [t.name, t.subtitle, t.era, t.medium, ...t.keywords, t.shortDescription].join(' ').toLowerCase().includes(query.trim().toLowerCase()))), [query, era, medium]);
  const compared = traditions.filter(t => compareIds.includes(t.id));

  function notify(message: string) { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3500); }
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => { const onHash = () => setView(viewFromHash()); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash); }, []);
  function navigate(next: View) { setView(next); window.location.hash = next; setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); notify('已复制，可粘贴到你的制作工具。'); }
    catch {
      const textarea = document.createElement('textarea'); textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0'; document.body.append(textarea); textarea.select();
      const copied = document.execCommand('copy'); textarea.remove(); notify(copied ? '已复制。' : '浏览器限制了剪贴板，请使用制作台的文本导出。');
    }
  }
  function openDetail(t: ArtTradition) { setDetail(t); setDetailTab('principles'); }
  function useTradition(id: string) { setSelectedId(id); setInitialInput(undefined); setInitialBrief(undefined); setProjectEpoch(n => n + 1); setDetail(null); setCompareOpen(false); navigate('workbench'); }
  function toggleCompare(id: string) {
    if (compareIds.includes(id)) setCompareIds(compareIds.filter(x => x !== id));
    else if (compareIds.length < 3) setCompareIds([...compareIds, id]);
    else notify('一次比较最多 3 条路线，先移除其中一条。');
  }
  function saveProject(input: BriefInput, brief: GeneratedBrief) {
    const project: SavedProject = { id: globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: input.subject.trim() || `${selected.name} · 美术方案`, createdAt: new Date().toISOString(), input: { ...input }, brief };
    const next = [project, ...projects].slice(0, 100); setProjects(next);
    notify(saveProjects(next) ? '已保存到本机项目册。' : '已保存到本次会话；浏览器限制持久存储，请导出备份。');
  }
  async function importProjects(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('项目文件超过 2 MB，请使用较小的项目册。');
      const incoming = parseProjects(JSON.parse(await file.text()), traditions);
      const merged = [...incoming, ...projects.filter(p => !incoming.some(x => x.id === p.id))];
      if (merged.length > 100) throw new Error('合并后超过 100 个项目，请先导出并整理现有项目。');
      setProjects(merged); const persisted = saveProjects(merged); notify(`已导入 ${incoming.length} 个项目${persisted ? '。' : '；当前浏览器不能持久保存，请导出备份。'}`);
    } catch (error) { notify(error instanceof Error ? error.message : '项目文件无法读取。'); }
    if (uploadRef.current) uploadRef.current.value = '';
  }

  return <div className="app-shell">
    <header className="site-header"><div className="header-inner"><button className="brand" onClick={() => navigate('research')} aria-label="观物首页"><span className="brand-seal">观</span><span><strong>观物</strong><small>GUANWU · ART ATELIER</small></span></button>
      <nav aria-label="主要导航" className={mobileNav ? 'main-nav nav-open' : 'main-nav'}>{views.map(item => <button key={item.id} aria-current={view === item.id ? 'page' : undefined} className={view === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><item.icon size={16} />{item.name}{item.id === 'projects' && projects.length > 0 && <span className="nav-count">{projects.length}</span>}</button>)}</nav>
      <div className="header-actions"><button className="method-link" onClick={() => setMethodOpen(true)}>研究方法 <ArrowUpRight size={14} /></button><button className="mobile-menu icon-button" aria-label="切换导航" aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)}><Menu size={20} /></button></div>
    </div></header>

    <main>
      {view === 'research' && <>
        <section className="hero page-width" aria-label="美术研究介绍"><div className="hero-copy"><span className="eyebrow"><i /> 中国古代美学 × 当代 AI 创作</span><h1>先读懂美，<br />再把美做出来。</h1><p>从一条线、一件器物、一幅山水开始。<br />把审美依据转成游戏与 App 的美术语言。</p><div className="hero-actions"><button className="button button-dark" onClick={() => document.getElementById('tradition-library')?.scrollIntoView({ behavior: 'smooth' })}>进入研究馆 <ArrowDown size={16} /></button><button className="text-button" onClick={() => navigate('workbench')}>开始一份美术方案 <ArrowUpRight size={17} /></button></div><div className="hero-note"><span>研究依据</span><b>→</b><span>造型规则</span><b>→</b><span>制作规范</span><b>→</b><span>一致性检查</span></div></div>
          <div className="hero-art"><img src={formsImage} alt="朱黑漆器、细线设色与彩色木版画的原创形式研究板" /><div className="hero-art-caption"><span>FORM STUDY / 02</span><span>原创研究示意 · 非历史复原图</span></div><span className="art-corner">物有其形<br />美有其来处</span></div>
        </section>

        <section className="page-width library-section" id="tradition-library" aria-label="美学路线库"><div className="section-heading"><div><span className="eyebrow">THE RESEARCH COLLECTION</span><h2>寻找你的美术语言<span> / {String(traditions.length).padStart(2, '0')}</span></h2></div><button className="text-button" onClick={() => setMethodOpen(true)}>如何阅读一条路线 <ArrowUpRight size={16} /></button></div>
          <div className="library-layout"><aside className="filter-panel"><div className="filter-label"><SlidersHorizontal size={15} />研究筛选</div><label className="search-field"><Search size={16} /><input aria-label="搜索美学路线" placeholder="山水、漆器、版画…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button className="icon-button" onClick={() => setQuery('')} aria-label="清空搜索"><X size={14} /></button>}</label>
            <label className="select-field">时期<select aria-label="筛选时期" value={era} onChange={e => setEra(e.target.value)}><option value="all">全部时期</option>{[...new Set(traditions.map(eraGroup))].map(value => <option key={value}>{value}</option>)}</select><ChevronDown size={14} /></label>
            <label className="select-field">媒介<select aria-label="筛选媒介" value={medium} onChange={e => setMedium(e.target.value)}><option value="all">全部媒介</option>{[...new Set(traditions.map(t => t.medium))].map(value => <option key={value}>{value}</option>)}</select><ChevronDown size={14} /></label>
            <div className="filter-tags"><span>从一个问题开始</span>{['山水', '器物', '版画', '轮廓'].map(tag => <button key={tag} className={query === tag ? 'tag active' : 'tag'} onClick={() => setQuery(query === tag ? '' : tag)}>{tag} <Plus size={11} /></button>)}</div>
            <div className="sidebar-note"><Layers3 size={22} /><h3>先选规则，再选素材</h3><p>同一朝代也有不同画科与材料。比较构图、轮廓与用色，找到能持续制作的依据。</p><button className="text-button" onClick={() => navigate('workbench')}>带着问题去制作 <ArrowRight size={14} /></button></div>
            {(query || era !== 'all' || medium !== 'all') && <button className="reset-filters" onClick={() => { setQuery(''); setEra('all'); setMedium('all'); }}>重置全部筛选</button>}
          </aside><div className="collection"><div className="collection-meta"><span>当前 {filtered.length} 条路线</span><span>点击研究 · 勾选比较</span></div><div className="tradition-grid">{filtered.map((t, i) => <article className="tradition-card" key={t.id}><div className="card-image-wrap"><button className="card-image-button" onClick={() => openDetail(t)} aria-label={`研究${t.name}`}><StudyImage tradition={t} /><span className="card-image-number">{String(traditions.indexOf(t) + 1).padStart(2, '0')}</span></button><button className={`compare-toggle ${compareIds.includes(t.id) ? 'is-selected' : ''}`} onClick={() => toggleCompare(t.id)} aria-label={`${compareIds.includes(t.id) ? '取消比较' : '加入比较'}${t.name}`} aria-pressed={compareIds.includes(t.id)}>{compareIds.includes(t.id) ? <Check size={13} /> : <Plus size={13} />}比较</button></div>
              <div className="card-content"><div className="card-meta"><span title={t.era}>{eraGroup(t)}</span><span title={t.medium}>{t.medium}</span></div><button className="card-title" onClick={() => openDetail(t)}><h3>{t.name}</h3><ArrowUpRight size={18} /></button><p>{t.shortDescription}</p><div className="mini-palette" aria-label={`${t.name}的现代参考色`}>{t.palette.map(c => <span key={c.hex} style={{ background: c.hex }} title={`${c.name} ${c.hex}`} />)}<small>现代参考色</small></div><div className="card-footer"><span>原创形式示意 · 非馆藏图</span><button onClick={() => useTradition(t.id)} aria-label={`用${t.name}制作方案`}>用于制作 <ArrowRight size={13} /></button></div></div></article>)}</div>
            {filtered.length === 0 && <div className="empty-state"><Search size={28} /><h3>还没有匹配的研究路线</h3><p>可以试试“山水”“器物”，或清除时期与媒介限制。</p><button className="button button-light" onClick={() => { setQuery(''); setEra('all'); setMedium('all'); }}>查看全部路线</button></div>}
          </div></div>
        </section>

        <section className="page-width concepts-section"><div className="section-heading"><div><span className="eyebrow">WAYS OF SEEING</span><h2>把审美变成可以讨论的规则</h2></div><span className="section-note">理解概念，比堆叠符号更有用。</span></div><div className="concept-grid">{concepts.map((c, i) => <button className="concept-card" key={c.id} onClick={() => setConcept(c)}><span className="concept-number">0{i + 1}</span><h3>{c.name}</h3><p>{c.explanation}</p><span>阅读与应用 <ArrowUpRight size={14} /></span></button>)}</div></section>
        <section className="page-width closing-strip"><div><span className="eyebrow">FROM RESEARCH TO MAKING</span><h2>让下一次 AI 创作，有一份清楚的依据。</h2><p>带走构图、色板、材质、提示词和验收清单，逐项检查一套美术的连续性。</p></div><button className="button button-dark" onClick={() => navigate('workbench')}>进入制作台 <ArrowRight size={17} /></button></section>
      </>}

      {view === 'workbench' && <section className="page-width tool-page"><div className="section-heading"><div><span className="eyebrow">ART DIRECTION BUILDER</span><h1>制作台</h1><p className="page-intro">把研究转成可交给 AI 与开发工具的规范，先建立规则，再制作素材。</p></div><button className="text-button" onClick={() => openDetail(selected)}>查看当前路线的依据 <BookOpen size={16} /></button></div><Workbench key={projectEpoch} tradition={selected} onSelectTradition={id => { setSelectedId(id); setInitialInput(undefined); setInitialBrief(undefined); }} onSave={saveProject} initialInput={initialInput} initialBrief={initialBrief} /></section>}

      {view === 'quality' && <section className="page-width tool-page"><div className="section-heading"><div><span className="eyebrow">VISUAL CONSISTENCY LAB</span><h1>检验室</h1><p className="page-intro">检查尺寸、透明边缘、主色与文字对比度，让素材从“好看”走向“能用”。</p></div><label className="compact-select">参考路线<select value={selected.id} onChange={e => setSelectedId(e.target.value)}>{traditions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div><QualityLab palette={selected.palette} /></section>}

      {view === 'projects' && <section className="page-width tool-page"><div className="section-heading"><div><span className="eyebrow">YOUR LOCAL COLLECTION</span><h1>项目册 <span className="heading-count">{projects.length}</span></h1><p className="page-intro">保留制作参数与完整规范。项目存于当前浏览器，导出文件可备份或迁移。</p></div><div className="project-toolbar"><button className="button button-light" onClick={() => uploadRef.current?.click()}><Upload size={15} />导入项目册</button><input ref={uploadRef} type="file" accept=".json,application/json" className="visually-hidden" aria-label="导入项目册文件" onChange={e => void importProjects(e.target.files?.[0])} /><button className="button button-dark" disabled={!projects.length} onClick={() => downloadText('guanwu-projects.json', JSON.stringify({ version: 1, projects }, null, 2), 'application/json;charset=utf-8')}><Download size={15} />导出项目册</button></div></div>
        {!projects.length ? <div className="empty-state project-empty"><FolderOpen size={40} /><h2>把第一份美术方案收进来</h2><p>在制作台完成一份方案，点击“保存到项目册”。</p><button className="button button-dark" onClick={() => navigate('workbench')}>开始制作 <ArrowRight size={16} /></button></div> : <div className="project-grid">{projects.map(p => { const t = traditions.find(x => x.id === p.input.traditionId)!; return <article className="project-card" key={p.id}><div className="project-card-header"><span className="eyebrow">{p.input.target === 'game' ? '游戏美术' : 'APP 美术'} / {t.name}</span><button className="icon-button" aria-label={`删除项目${p.name}`} onClick={() => { const next = projects.filter(x => x.id !== p.id); setProjects(next); saveProjects(next); notify('已从项目册移除。'); }}><Trash2 size={16} /></button></div><h2>{p.name}</h2><p>{p.input.feeling}</p><div className="mini-palette">{t.palette.map(c => <span key={c.hex} style={{ background: c.hex }} />)}</div><time>{new Date(p.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</time><div className="project-card-actions"><button className="button button-dark" onClick={() => { setSelectedId(t.id); setInitialInput(p.input); setInitialBrief(p.brief); setProjectEpoch(n => n + 1); navigate('workbench'); }}>继续编辑 <ArrowRight size={14} /></button><button className="text-button" onClick={() => downloadText(`guanwu-${p.id}.md`, p.brief.markdown, 'text/markdown;charset=utf-8')}><Download size={14} />导出规范</button></div></article>; })}</div>}
      </section>}
    </main>

    <footer className="site-footer page-width"><div className="footer-brand"><span className="brand-seal small">观</span><span>观物 · 美有其来处</span></div><p>历史依据、艺术解读与现代转译分别阅读。数字色值和原创示意不等同于历史复原。</p><button className="text-button" onClick={() => setMethodOpen(true)}>资料与研究边界 <ArrowUpRight size={14} /></button></footer>
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    {compareIds.length > 0 && view === 'research' && <div className="compare-dock"><Layers3 size={18} /><span>已选 {compareIds.length} / 3 条路线</span><button className="button button-dark" disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)}>并排比较 <ArrowRight size={14} /></button><button className="icon-button" onClick={() => setCompareIds([])} aria-label="清空比较"><X size={17} /></button></div>}

    {detail && <Dialog title={detail.name} onClose={() => setDetail(null)} wide><div className="detail-top"><StudyImage tradition={detail} /><div><span className="eyebrow">{detail.era} / {detail.medium}</span><h3>{detail.subtitle}</h3><p>{detail.overview}</p><button className="button button-dark" onClick={() => useTradition(detail.id)}>以此建立美术方案 <ArrowRight size={16} /></button></div></div><p className="micro-note">配图为原创形式研究示意，部分路线借用相近形式作对照，并非该路线的馆藏实例。历史依据请查看“参考出处”。</p><div className="detail-tabs" role="tablist" aria-label="研究内容"><button role="tab" aria-selected={detailTab === 'principles'} onClick={() => setDetailTab('principles')}>造型与色彩</button><button role="tab" aria-selected={detailTab === 'applications'} onClick={() => setDetailTab('applications')}>游戏与 App 转译</button><button role="tab" aria-selected={detailTab === 'sources'} onClick={() => setDetailTab('sources')}>参考出处</button></div>
      {detailTab === 'principles' && <div role="tabpanel"><div className="principle-grid">{detail.principles.map(p => <div key={p.title}><h4>{p.title}</h4><p>{p.detail}</p></div>)}</div><h4 className="detail-subheading">现代参考色板 <small>非历史颜料复原 · 点击复制</small></h4><Palette tradition={detail} onCopy={text => void copy(text)} /><dl className="research-definition"><dt>构图</dt><dd>{detail.composition}</dd><dt>轮廓</dt><dd>{detail.silhouette}</dd><dt>材质</dt><dd>{detail.materials}</dd></dl></div>}
      {detailTab === 'applications' && <div role="tabpanel"><div className="translation-grid"><section><span className="eyebrow">FOR GAMES</span><h4>游戏里的形式规则</h4><ul>{detail.gameTranslation.map(x => <li key={x}>{x}</li>)}</ul></section><section><span className="eyebrow">FOR APPS</span><h4>App 里的信息与材料</h4><ul>{detail.appTranslation.map(x => <li key={x}>{x}</li>)}</ul></section></div><ApplicationPreview tradition={detail} /></div>}
      {detailTab === 'sources' && <div role="tabpanel"><div className="source-explanation"><BookOpen size={20} /><p>以下将作品、时期和媒介分别标注。当前馆藏条目为待核验检索线索，打开官方入口后需继续核对具体题名、版本与使用条件。</p></div>{detail.sourceIds.map(id => { const source = sources.find(s => s.id === id); return source ? <article className="source-card" key={id}><div><span className={`source-status ${source.status}`}>{source.status === 'verified' ? '已核验条目' : '待核验线索'}</span><h4>{source.title}</h4><p>{source.institution} · {source.period} · {source.medium}</p><small>{source.note}</small></div><a href={source.url} target="_blank" rel="noreferrer">官方检索入口 <ArrowUpRight size={15} /></a></article> : null; })}</div>}
      <div className="pitfalls"><h4>容易偏离的地方</h4><ul>{detail.pitfalls.map(x => <li key={x}>{x}</li>)}</ul></div>
    </Dialog>}

    {compareOpen && <Dialog title="并排比较：从形式规则看差异" onClose={() => setCompareOpen(false)} wide><div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th>比较维度</th>{compared.map(t => <th key={t.id}>{t.name}<small>{t.era}</small></th>)}</tr></thead><tbody><tr><th>现代参考色</th>{compared.map(t => <td key={t.id}><div className="mini-palette">{t.palette.map(c => <span key={c.hex} style={{ background: c.hex }} title={c.hex} />)}</div></td>)}</tr>{[['构图', 'composition'], ['人物与物件轮廓', 'silhouette'], ['材料表现', 'materials']] .map(([label, key]) => <tr key={key}><th>{label}</th>{compared.map(t => <td key={t.id}>{t[key as 'composition' | 'silhouette' | 'materials']}</td>)}</tr>)}<tr><th>需要避开的误用</th>{compared.map(t => <td key={t.id}>{t.pitfalls.slice(0, 2).join('；')}</td>)}</tr><tr><th>开始制作</th>{compared.map(t => <td key={t.id}><button className="button button-light" onClick={() => useTradition(t.id)}>使用此路线 <ArrowRight size={13} /></button></td>)}</tr></tbody></table></div><p className="micro-note">各路线来自不同的时期、画科和材料。选择一种主语言后，再有依据地处理跨媒介与跨时代转译。</p></Dialog>}

    {concept && <Dialog title={concept.name} onClose={() => setConcept(null)}><span className="eyebrow">概念依据</span><p className="concept-basis">{concept.historicalBasis}</p><p>{concept.explanation}</p><div className="translation-grid"><section><h4>游戏应用</h4><p>{concept.gameUse}</p></section><section><h4>App 应用</h4><p>{concept.appUse}</p></section></div><div className="pitfalls"><h4>常见误用</h4><p>{concept.commonMistake}</p></div></Dialog>}

    {methodOpen && <Dialog title="研究的方法与边界" onClose={() => setMethodOpen(false)}><div className="method-flow">{['核对历史对象', '解释形式规则', '形成现代转译', '检验实际素材'].map((x, i) => <div key={x}><span>0{i + 1}</span><h3>{x}</h3></div>)}</div><p>这里的路线是一套有明确依据的形式选择，不以某个朝代概括所有艺术。作品出处、对作品的解读和现代制作建议分别阅读。</p><ul className="method-list"><li><b>参考资料：</b>现有作品与馆藏条目以“待核验线索”标记；环境网络限制使本轮无法逐页读取博物馆网站。不能把检索入口当作已经完成的馆藏核验。</li><li><b>原创图像：</b>两张示意板为生成辅助的原创研究，图中服饰、器物与建筑不是历史复原。它们不替代具体作品图像。</li><li><b>数字色值：</b>色板是现代制作起点，材料、屏幕与光照均会改变观感，不能称为古代颜料的固定 HEX。</li><li><b>提示词工具：</b>制作台整理规范与提示词，当前不连接在线生图模型。导出内容可交给你的 AI 图像或开发工具。</li><li><b>本地检查：</b>图像分析与项目保存均在浏览器运行；色板与对比度检查不构成版权、史实或完整美术质量认证。</li></ul><div className="method-counts"><span><b>{traditions.length}</b> 研究路线</span><span><b>{sources.length}</b> 文献与馆藏线索</span><span><b>{concepts.length}</b> 形式概念</span></div></Dialog>}
  </div>;
}
