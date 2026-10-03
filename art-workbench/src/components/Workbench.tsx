import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, Check, CheckCheck, Copy, FileJson, Gamepad2, Layers3, Palette, RotateCcw, Save, Smartphone, Sparkles } from 'lucide-react';
import { traditions } from '../data/traditions';
import { assetLabels, briefMarkdown, defaultInput, formatOptions, generateBrief } from '../lib/brief';
import { retainStudy } from '../lib/study-transfer';
import type { ArtTradition, AssetKind, BriefInput, GeneratedBrief } from '../types';

interface WorkbenchProps {
  tradition: ArtTradition;
  onSelectTradition: (id: string) => void;
  onSave: (input: BriefInput, brief: GeneratedBrief) => void;
  initialInput?: BriefInput;
  initialBrief?: GeneratedBrief;
}

type OutputTab = 'prompt' | 'delivery' | 'tokens';
interface Edits { key: string; positive: string; negative: string; base?: GeneratedBrief }

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Workbench({ tradition, onSelectTradition, onSave, initialInput, initialBrief }: WorkbenchProps) {
  const [input, setInput] = useState<BriefInput>(() => initialInput
    ? { ...initialInput, traditionId: tradition.id } : defaultInput(tradition.id));
  const [tab, setTab] = useState<OutputTab>('prompt');
  const [edits, setEdits] = useState<Edits | null>(() => initialInput && initialBrief ? {
    key: JSON.stringify({ ...initialInput, traditionId: tradition.id }),
    positive: initialBrief.positive,
    negative: initialBrief.negative,
    base: initialBrief,
  } : null);
  const [researchBrief, setResearchBrief] = useState<GeneratedBrief | undefined>(initialBrief);
  const [notice, setNotice] = useState('');
  const [manualCopy, setManualCopy] = useState('');
  const copyRef = useRef<HTMLTextAreaElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedProps = useRef({ input: initialInput, brief: initialBrief, traditionId: tradition.id });

  useEffect(() => {
    const previous = loadedProps.current;
    const receivedProject = previous.input !== initialInput || previous.brief !== initialBrief;
    if (receivedProject && initialInput) {
      const restored = { ...initialInput, traditionId: tradition.id };
      setInput(restored);
      setEdits(initialBrief ? {
        key: JSON.stringify(restored), positive: initialBrief.positive, negative: initialBrief.negative, base: initialBrief,
      } : null);
      setResearchBrief(initialBrief);
      setManualCopy('');
    } else if (previous.traditionId !== tradition.id) {
      setInput((current) => ({ ...current, traditionId: tradition.id }));
      setEdits(null);
      setResearchBrief(undefined);
      setManualCopy('');
    }
    loadedProps.current = { input: initialInput, brief: initialBrief, traditionId: tradition.id };
  }, [initialInput, initialBrief, tradition.id]);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  useEffect(() => {
    if (manualCopy) {
      copyRef.current?.focus();
      copyRef.current?.select();
    }
  }, [manualCopy]);

  const effectiveInput = useMemo(() => ({ ...input, traditionId: tradition.id }), [input, tradition.id]);
  const generated = useMemo(() => retainStudy(generateBrief(effectiveInput, tradition), effectiveInput, tradition, researchBrief), [effectiveInput, tradition, researchBrief]);
  const generationKey = JSON.stringify(effectiveInput);
  const brief = useMemo<GeneratedBrief>(() => {
    if (!edits || edits.key !== generationKey) return generated;
    const current = { ...(edits.base ?? generated), positive: edits.positive, negative: edits.negative };
    return { ...current, markdown: briefMarkdown(current, effectiveInput, tradition) };
  }, [edits, generationKey, generated, effectiveInput, tradition]);
  const hasEdits = edits?.key === generationKey && (edits.positive !== generated.positive || edits.negative !== generated.negative);

  function update<K extends keyof BriefInput>(key: K, value: BriefInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    if ((key === 'target' || key === 'assetKind') && value !== input[key]) {
      if (researchBrief?.tokens['study.record']) announce('制作对象已改变，请回深研室选择适合的实验；原研究记录仍在已保存的项目中。');
      setResearchBrief(undefined);
    }
    setEdits(null);
    setManualCopy('');
  }

  function announce(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 5500);
  }

  async function copyPrompt() {
    const text = `${brief.positive}\n\n约束与避免项：\n${brief.negative}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setManualCopy('');
      announce('提示词与约束已复制。可以粘贴到你使用的图像模型。');
    } catch {
      setManualCopy(text);
      announce('浏览器未允许自动复制。下方内容已选中，可按 Ctrl/Cmd + C 手动复制。');
    }
  }

  function editPrompt(field: 'positive' | 'negative', value: string) {
    setEdits({ key: generationKey, positive: brief.positive, negative: brief.negative, base: brief, [field]: value });
  }

  function exportFile(type: 'markdown' | 'tokens') {
    try {
      const base = `guanwu-${tradition.id}-${input.target}-${input.assetKind}`;
      downloadText(type === 'markdown' ? `${base}.md` : `${base}-tokens.json`,
        type === 'markdown' ? brief.markdown : JSON.stringify(brief.tokens, null, 2),
        type === 'markdown' ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8');
      announce(type === 'markdown' ? '制作方案 Markdown 已下载。' : '设计变量 JSON 已下载。');
    } catch {
      announce('当前浏览器未能下载。可先复制提示词；设计变量也可在下方查看。');
    }
  }

  function saveProject() {
    try {
      onSave({ ...effectiveInput }, { ...brief, checklist: [...brief.checklist], tokens: { ...brief.tokens } });
      announce('已保存当前方案。可在项目页重新打开参数。');
    } catch {
      announce('当前浏览器无法保存项目，请下载 Markdown 保留方案。');
    }
  }

  const subjectExamples: Record<AssetKind, string> = {
    scene: input.target === 'game' ? '例如：雨后临水的旧书铺，门前有人停舟' : '例如：阅读 App 的清晨书桌入口插画',
    character: input.target === 'game' ? '例如：修补旧器的年轻匠人，背着木制工具箱' : '例如：引导用户整理收藏的安静小书童',
    prop: '例如：磨损的朱黑漆盒，内有折叠的书札',
    icon: input.target === 'game' ? '例如：照明、修补、行舟三个能力图标' : '例如：收藏、搜索、返回三个功能图标',
    interface: input.target === 'game' ? '例如：生命、行囊与任务提示组成的探索 HUD' : '例如：阅读收藏 App 的主页与书签列表',
  };

  return (
    <section className="workbench" data-testid="workbench">
      <div className="workbench-heading">
        <div>
          <p className="workbench-eyebrow">FROM RESEARCH TO MAKING</p>
          <h2>把审美研究变成制作规范</h2>
          <p>确定结构、材质与交付方式，再交给你选用的模型或美术工具。</p>
        </div>
        <span className="workbench-offline"><Sparkles size={15} aria-hidden="true" /> 本地规范工具 · 无模型 API</span>
      </div>

      <div className="workbench-grid">
        <div className="workbench-controls">
          <div className="workbench-control-section">
            <div className="workbench-label-row"><h3><Palette size={17} aria-hidden="true" /> 研究起点</h3><span>01</span></div>
            <label className="workbench-field" htmlFor="workbench-tradition">
              <span>审美路线</span>
              <select id="workbench-tradition" data-testid="workbench-tradition" value={tradition.id} onChange={(event) => onSelectTradition(event.target.value)}>
                {traditions.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.era}</option>)}
              </select>
            </label>
            <p className="workbench-tradition-note">{tradition.subtitle}。{tradition.shortDescription}</p>
            <div className="workbench-palette" aria-label="选定路线的现代设计调色板">
              {tradition.palette.map((color) => (
                <span className="workbench-color" key={color.hex} title={`${color.name} ${color.hex} · ${color.role}`}>
                  <i style={{ backgroundColor: color.hex }} aria-hidden="true" />
                  <span>{color.name}<small>{color.hex}</small></span>
                </span>
              ))}
            </div>
          </div>

          <div className="workbench-control-section">
            <div className="workbench-label-row"><h3><Layers3 size={17} aria-hidden="true" /> 制作对象</h3><span>02</span></div>
            <fieldset className="workbench-target-fieldset">
              <legend>项目用途</legend>
              <div className="workbench-targets">
                <button type="button" data-testid="target-game" className={input.target === 'game' ? 'workbench-target is-active' : 'workbench-target'} aria-pressed={input.target === 'game'} onClick={() => update('target', 'game')}>
                  <Gamepad2 size={19} aria-hidden="true" /> 游戏 <small>空间 · 动作 · 资源</small>
                </button>
                <button type="button" data-testid="target-app" className={input.target === 'app' ? 'workbench-target is-active' : 'workbench-target'} aria-pressed={input.target === 'app'} onClick={() => update('target', 'app')}>
                  <Smartphone size={19} aria-hidden="true" /> App <small>阅读 · 交互 · 组件</small>
                </button>
              </div>
            </fieldset>
            <div className="workbench-field-grid">
              <label className="workbench-field" htmlFor="workbench-asset">
                <span>素材类型</span>
                <select id="workbench-asset" data-testid="workbench-asset" value={input.assetKind} onChange={(event) => update('assetKind', event.target.value as AssetKind)}>
                  {Object.entries(assetLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="workbench-field" htmlFor="workbench-format">
                <span>制作格式</span>
                <select id="workbench-format" data-testid="workbench-format" value={input.format} onChange={(event) => update('format', event.target.value)}>
                  {formatOptions.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}
                </select>
              </label>
            </div>
            <label className="workbench-field" htmlFor="workbench-subject">
              <span>你想制作什么？</span>
              <textarea id="workbench-subject" data-testid="workbench-subject" value={input.subject} maxLength={800} rows={3} placeholder={subjectExamples[input.assetKind]} onChange={(event) => update('subject', event.target.value)} />
            </label>
            <label className="workbench-field" htmlFor="workbench-feeling">
              <span>情绪与气质</span>
              <input id="workbench-feeling" data-testid="workbench-feeling" value={input.feeling} maxLength={240} placeholder="例如：清润、宁静，有生活痕迹" onChange={(event) => update('feeling', event.target.value)} />
            </label>
          </div>

          <div className="workbench-control-section">
            <div className="workbench-label-row"><h3>画面取舍</h3><span>03</span></div>
            {([
              ['detail', '细节密度', '大形优先', '焦点精描'],
              ['colorIntensity', '设色强度', '淡设色', '强色块'],
              ['whitespace', '留白目标', '紧密', '疏朗'],
            ] as const).map(([key, label, low, high]) => (
              <label className="workbench-slider" key={key} htmlFor={`workbench-${key}`}>
                <span><strong>{label}</strong><output htmlFor={`workbench-${key}`}>{input[key]}{key === 'whitespace' ? '%' : '/100'}</output></span>
                <input type="range" id={`workbench-${key}`} data-testid={`workbench-${key}`} min="0" max="100" step="1" value={input[key]} onChange={(event) => update(key, Number(event.target.value))} />
                <span className="workbench-slider-extents"><small>{low}</small><small>{high}</small></span>
              </label>
            ))}
            <p className="workbench-control-note">参数即时更新规范。留白与细节数值是制作目标，需要在真实素材中检验；调整参数会覆盖右侧手动修改。</p>
          </div>
        </div>

        <div className="brief-panel">
          <div className="brief-header">
            <div><p className="brief-eyebrow">YOUR ART DIRECTION</p><h3 data-testid="brief-title">{brief.title}</h3></div>
            <span className="brief-status"><Check size={14} aria-hidden="true" /> {hasEdits ? '已手动修改' : '随参数更新'}</span>
          </div>
          <div className="brief-tabs" role="tablist" aria-label="制作方案内容">
            {([
              ['prompt', '提示词'], ['delivery', '规格与验收'], ['tokens', '设计变量'],
            ] as const).map(([value, label]) => (
              <button type="button" role="tab" id={`brief-tab-${value}`} aria-controls={`brief-content-${value}`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} key={value} className={tab === value ? 'brief-tab is-active' : 'brief-tab'} data-testid={`brief-tab-${value}`} onClick={() => setTab(value)} onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                  event.preventDefault();
                  const tabs: OutputTab[] = ['prompt', 'delivery', 'tokens'];
                  const next = tabs[(tabs.indexOf(value) + (event.key === 'ArrowRight' ? 1 : 2)) % 3];
                  setTab(next);
                  document.getElementById(`brief-tab-${next}`)?.focus();
                }
              }}>{label}</button>
            ))}
          </div>

          {tab === 'prompt' && <div id="brief-content-prompt" role="tabpanel" aria-labelledby="brief-tab-prompt" className="brief-content">
            <div className="brief-content-heading"><p>正向提示词</p><span>可直接编辑</span></div>
            <textarea className="brief-prompt" aria-label="正向提示词" data-testid="brief-positive" spellCheck={false} value={brief.positive} rows={18} onChange={(event) => editPrompt('positive', event.target.value)} />
            <div className="brief-content-heading"><p>约束与避免项</p><span>与正向提示词一起使用</span></div>
            <textarea className="brief-negative" aria-label="约束与避免项" data-testid="brief-negative" spellCheck={false} value={brief.negative} rows={8} onChange={(event) => editPrompt('negative', event.target.value)} />
            {hasEdits && <button type="button" className="brief-reset" data-testid="brief-reset" onClick={() => { setEdits(null); announce('已恢复根据当前参数生成的提示词。'); }}><RotateCcw size={14} aria-hidden="true" /> 恢复参数生成内容</button>}
          </div>}

          {tab === 'delivery' && <div id="brief-content-delivery" role="tabpanel" aria-labelledby="brief-tab-delivery" className="brief-content">
            <div className="brief-content-heading"><p>可交付的规格</p><Layers3 size={17} aria-hidden="true" /></div>
            <p className="brief-specification" data-testid="brief-specification">{brief.specification}</p>
            <div className="brief-content-heading"><p>把“看起来不错”变成可检查的标准</p><CheckCheck size={17} aria-hidden="true" /></div>
            <ol className="brief-checklist" data-testid="brief-checklist">{brief.checklist.map((item, index) => <li key={`${index}-${item}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></li>)}</ol>
            <div className="brief-revision"><strong>改一处，保留一套</strong><p>先验收单件和最终显示尺寸。修改时明确保留身份、轮廓、镜头、脚点和色值，再写出需要改变的局部。</p></div>
          </div>}

          {tab === 'tokens' && <div id="brief-content-tokens" role="tabpanel" aria-labelledby="brief-tab-tokens" className="brief-content">
            <div className="brief-content-heading"><p>可带入代码的设计变量</p><FileJson size={17} aria-hidden="true" /></div>
            <p className="brief-token-note">色值为现代设计提案，源于本路线的设色研究。正文色会单独检查对比度，必要时加入功能色；变量需要由你的组件或引擎接入。</p>
            <pre className="brief-tokens" data-testid="brief-tokens">{JSON.stringify(brief.tokens, null, 2)}</pre>
          </div>}

          <div className="brief-actions">
            <button type="button" className="brief-button brief-button-primary" data-testid="brief-copy" onClick={() => void copyPrompt()}><Copy size={16} aria-hidden="true" /> 复制提示词</button>
            <button type="button" className="brief-button" data-testid="brief-download-markdown" onClick={() => exportFile('markdown')}><ArrowDownToLine size={16} aria-hidden="true" /> 方案 .md</button>
            <button type="button" className="brief-button" data-testid="brief-download-tokens" onClick={() => exportFile('tokens')}><FileJson size={16} aria-hidden="true" /> 变量 .json</button>
            <button type="button" className="brief-button" data-testid="brief-save" onClick={saveProject}><Save size={16} aria-hidden="true" /> 存入项目</button>
          </div>
          <p className="brief-notice" role="status" aria-live="polite" data-testid="brief-notice">{notice || '离线生成制作规范与提示词，不会生成图片，也不会发送你的输入。'}</p>
          {manualCopy && <label className="brief-manual-copy">手动复制内容<textarea ref={copyRef} data-testid="brief-manual-copy" readOnly value={manualCopy} rows={8} /></label>}
          <p className="brief-source-note">依据 {tradition.sourceIds.length} 条研究线索。学习构图、造型与工艺，原创素材不宣称历史复原；模型生成结果仍需人工检查一致性与授权。</p>
        </div>
      </div>
    </section>
  );
}
