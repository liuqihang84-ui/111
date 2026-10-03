import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Check, Copy, Download, ImagePlus, Palette, ScanLine, ShieldCheck, X } from 'lucide-react';
import type { PaletteColor } from '../types';
import { analyzePixels, contrastRatio, normalizeHex, type PixelAnalysis } from '../lib/color';

interface ImageReport extends PixelAnalysis {
  filename: string;
  bytes: number;
  width: number;
  height: number;
  sampleWidth: number;
  sampleHeight: number;
}

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 48_000_000;
const MAX_IMAGE_EDGE = 16_000;
const SAMPLE_EDGE = 640;
const percent = (number: number) => `${(number * 100).toFixed(1)}%`;

function initialPair(palette: PaletteColor[]): [string, string] {
  const colors = palette.map((color) => normalizeHex(color.hex)).filter((color): color is string => color !== null);
  let pair: [string, string] = ['#24352D', '#F7F1E5'];
  let best = 0;
  colors.forEach((foreground) => colors.forEach((background) => {
    const ratio = contrastRatio(foreground, background)!;
    if (ratio > best) { pair = [foreground, background]; best = ratio; }
  }));
  return pair;
}

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Keep the URL alive until the browser has started the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function QualityLab({ palette }: { palette: PaletteColor[] }) {
  const [report, setReport] = useState<ImageReport | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [previewSize, setPreviewSize] = useState(256);
  const [nativeSize, setNativeSize] = useState(false);
  const [pixelated, setPixelated] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [foreground, setForeground] = useState(() => initialPair(palette)[0]);
  const [background, setBackground] = useState(() => initialPair(palette)[1]);
  const [copyMessage, setCopyMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const liveUrls = useRef(new Set<string>());
  const activeUrl = useRef<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const paletteKey = palette.map((color) => color.hex).join('|');

  useEffect(() => {
    const pair = initialPair(palette);
    setForeground(pair[0]);
    setBackground(pair[1]);
    // A changed research palette resets the comparison to its most distinct pair.
  }, [paletteKey]);

  useEffect(() => () => {
    requestRef.current += 1;
    cancelRef.current?.();
    liveUrls.current.forEach((url) => URL.revokeObjectURL(url));
    liveUrls.current.clear();
  }, []);

  const normalizedForeground = normalizeHex(foreground);
  const normalizedBackground = normalizeHex(background);
  const ratio = contrastRatio(foreground, background);
  const availableColors = [
    ...palette.filter((color) => normalizeHex(color.hex)),
    ...(report?.colors ?? []).map((color, index) => ({ name: `图片主色 ${index + 1}`, hex: color.hex, role: '采样提取' })),
  ];

  async function readFile(file: File) {
    const request = ++requestRef.current;
    cancelRef.current?.();
    cancelRef.current = null;
    setError('');
    setCopyMessage('');
    setBusy(true);
    let url: string | null = null;
    try {
      const mimeAllowed = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(file.type);
      const extensionAllowed = /\.(png|jpe?g|webp|avif)$/i.test(file.name);
      if (!(mimeAllowed || (!file.type && extensionAllowed))) throw new Error('请选择 PNG、JPEG、WebP 或 AVIF 图片。SVG 与 GIF 不在本工具的分析范围内。');
      if (file.size === 0) throw new Error('这份图片文件为空，请重新选择。');
      if (file.size > MAX_FILE_BYTES) throw new Error('图片超过 20 MB。请先导出较小的静态图片，以免浏览器内存不足。');
      url = URL.createObjectURL(file);
      liveUrls.current.add(url);
      const image = new Image();
      const imageUrl = url;
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          image.onload = null;
          image.onerror = null;
          image.src = '';
          reject(new Error('图片解码超时，请尝试较小的 PNG 或 JPEG。'));
        }, 15_000);
        const finish = (problem?: Error) => {
          window.clearTimeout(timeout);
          image.onload = null;
          image.onerror = null;
          if (problem) reject(problem); else resolve();
        };
        cancelRef.current = () => {
          finish(new Error('本次读取已取消。'));
          image.src = '';
        };
        image.onload = () => finish();
        image.onerror = () => finish(new Error('无法解码这份图片。文件可能损坏，或当前浏览器不支持该格式。'));
        image.src = imageUrl;
      });
      if (request !== requestRef.current) return;
      cancelRef.current = null;
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (!width || !height) throw new Error('图片尺寸无效，无法分析。');
      if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE || width * height > MAX_IMAGE_PIXELS) {
        throw new Error('图片尺寸过大：上限为 4800 万像素，且单边不超过 16000 px。请先缩小图片。');
      }
      const scale = Math.min(1, SAMPLE_EDGE / Math.max(width, height));
      const sampleWidth = Math.max(1, Math.round(width * scale));
      const sampleHeight = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('当前浏览器无法创建 Canvas。请换用支持 Canvas 的浏览器。');
      context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
      const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
      const analysis = analyzePixels(pixels);
      if (request !== requestRef.current) return;
      if (activeUrl.current) {
        URL.revokeObjectURL(activeUrl.current);
        liveUrls.current.delete(activeUrl.current);
      }
      activeUrl.current = url;
      setPreviewUrl(url);
      setReport({ ...analysis, filename: file.name, bytes: file.size, width, height, sampleWidth, sampleHeight });
      setNativeSize(false);
      url = null; // Ownership transfers to the component preview.
    } catch (problem) {
      if (request === requestRef.current) {
        setError(problem instanceof Error ? problem.message : '图片读取失败，请重新选择。');
      }
    } finally {
      if (url) {
        URL.revokeObjectURL(url);
        liveUrls.current.delete(url);
      }
      if (request === requestRef.current) {
        cancelRef.current = null;
        setBusy(false);
      }
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void readFile(file);
  }

  async function copyColors() {
    if (!report?.colors.length) return;
    const text = report.colors.map((color) => color.hex).join(', ');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopyMessage(`已复制 ${report.colors.length} 个主色。`);
    } catch {
      setCopyMessage(`浏览器未允许自动复制，请手动复制：${text}`);
    }
  }

  function exportReport() {
    if (!report) return;
    downloadJson('guanwu-art-analysis.json', {
      schemaVersion: 1,
      method: 'Browser Canvas sampling + alpha-weighted median-cut quantization; WCAG 2.x sRGB contrast',
      image: report,
      comparison: {
        foreground: normalizedForeground,
        background: normalizedBackground,
        ratio,
        bodyTextAtLeast4_5: ratio === null ? null : ratio >= 4.5,
        meaningfulGraphicAtLeast3: ratio === null ? null : ratio >= 3,
      },
      limitations: [
        'Color and transparency statistics describe a downsample, not every original pixel.',
        'This is a measurement aid, not AI detection, historical verification, copyright clearance, or professional art approval.',
        'Contrast uses opaque sRGB colors; opacity, gradients, real image backgrounds and text size require separate checks.',
      ],
    });
  }

  const renderColorControl = (kind: 'foreground' | 'background', label: string, value: string, change: (value: string) => void) => {
    const normalized = normalizeHex(value);
    const selected = availableColors.find((color) => normalizeHex(color.hex) === normalized)?.hex ?? '';
    return <div className="quality-color-control">
      <label htmlFor={`quality-${kind}`}>{label}</label>
      <div className="quality-color-input-row">
        <input type="color" aria-label={`选择${label}`} value={normalized ?? '#000000'} onChange={(event) => change(event.target.value.toUpperCase())} />
        <input id={`quality-${kind}`} data-testid={`quality-${kind}`} type="text" value={value} maxLength={9} spellCheck={false} placeholder="#RRGGBB" aria-invalid={!normalized} aria-describedby={`quality-${kind}-help`} onChange={(event) => change(event.target.value)} />
      </div>
      <select aria-label={`从色板选择${label}`} data-testid={`quality-${kind}-select`} value={selected} onChange={(event) => { if (event.target.value) change(event.target.value); }}>
        <option value="">手动输入色值</option>
        {availableColors.map((color, index) => <option key={`${kind}-${color.hex}-${index}`} value={color.hex}>{color.name} · {color.hex}</option>)}
      </select>
      <span id={`quality-${kind}-help`} className={normalized ? 'quality-input-help' : 'quality-input-error'}>{normalized ? '支持 #RGB 或 #RRGGBB，不含透明度。' : '请输入有效的 #RGB 或 #RRGGBB。'}</span>
    </div>;
  };

  return <section className="quality-lab" aria-labelledby="quality-heading">
    <header className="quality-heading">
      <div><span className="eyebrow">从感觉到可检验的细节</span><h2 id="quality-heading">美术检验室</h2><p>把生成的素材带进真实尺寸与真实界面，检查配色、透明底和可读性。</p></div>
      <span className="quality-local-badge"><ShieldCheck size={16} aria-hidden="true" /> 浏览器本地处理</span>
    </header>
    <div className="quality-layout">
      <div className="quality-image-panel">
        <div className={`quality-dropzone${dragging ? ' quality-dropzone-active' : ''}`} data-testid="quality-dropzone" onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
          <ImagePlus size={28} aria-hidden="true" />
          <h3>带一张自己的图片来</h3>
          <p>拖放文件，或选择本地图片。最长边 640 px 采样，不上传图片；动画只取当前解码画面。</p>
          <button className="quality-upload-button" type="button" onClick={() => inputRef.current?.click()}>{busy ? '选择另一张图片' : '选择本地图片'}</button>
          <span className="quality-file-note">PNG / JPEG / WebP / AVIF · ≤ 20 MB</span>
          <input ref={inputRef} data-testid="quality-upload" aria-label="上传本地素材进行分析" className="quality-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/avif,.png,.jpg,.jpeg,.webp,.avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); event.target.value = ''; }} />
        </div>
        <p className="quality-read-status" data-testid="quality-read-status" role="status" aria-live="polite">{busy ? '正在本地解码图片并读取像素…' : report ? `已分析 ${report.filename}` : '图片尚未载入。你也可以先检验右侧研究色板。'}</p>
        {error && <p className="quality-error" role="alert" data-testid="quality-error"><X size={16} aria-hidden="true" />{error}{report ? ' 上一张图片的报告仍保留。' : ''}</p>}
        {report && previewUrl && <div className="quality-image-result" data-testid="quality-analysis" aria-busy={busy}>
          <div className="quality-image-toolbar">
            <h3><ScanLine size={18} aria-hidden="true" /> 素材预览</h3>
            <div className="quality-segmented" aria-label="素材显示尺寸">
              <button type="button" aria-pressed={!nativeSize} onClick={() => setNativeSize(false)}>缩小预览</button>
              <button type="button" aria-pressed={nativeSize} onClick={() => setNativeSize(true)}>100% 原尺寸</button>
            </div>
          </div>
          <div className="quality-checkerboard" data-testid="quality-preview" style={{ overflow: 'auto', height: 280, backgroundColor: '#ECEBE7', backgroundImage: 'linear-gradient(45deg, #D7D7D2 25%, transparent 25%), linear-gradient(-45deg, #D7D7D2 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #D7D7D2 75%), linear-gradient(-45deg, transparent 75%, #D7D7D2 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}>
            <img src={previewUrl} alt={`本地素材预览：${report.filename}`} style={{ width: nativeSize ? report.width : Math.min(previewSize, report.width), height: 'auto', maxWidth: 'none', imageRendering: pixelated ? 'pixelated' : 'auto' }} />
          </div>
          <div className="quality-preview-controls">
            <label htmlFor="quality-preview-size">预览宽度 <strong>{Math.min(previewSize, report.width)} px</strong><input id="quality-preview-size" data-testid="quality-preview-size" type="range" min={32} max={512} step={8} value={previewSize} disabled={nativeSize} onChange={(event) => setPreviewSize(Number(event.target.value))} /></label>
            <label className="quality-checkbox"><input type="checkbox" checked={pixelated} onChange={(event) => setPixelated(event.target.checked)} />像素素材锐利缩放</label>
          </div>
          <p className="quality-method-note">棋盘格表示透明背景。100% 模式为 1 图像像素对应 1 CSS 像素，大图可滚动查看；缩小后再判断轮廓与细线是否仍清楚。</p>
          <dl className="quality-metrics">
            <div><dt>原始尺寸</dt><dd data-testid="quality-dimensions">{report.width} × {report.height} px</dd></div>
            <div><dt>文件大小</dt><dd>{(report.bytes / 1024).toFixed(1)} KB</dd></div>
            <div><dt>含透明像素</dt><dd data-testid="quality-transparency">{percent(report.transparentRatio)}</dd></div>
            <div><dt>完全透明 / 半透明</dt><dd>{percent(report.fullyTransparentRatio)} / {percent(report.partiallyTransparentRatio)}</dd></div>
          </dl>
          <h3 className="quality-palette-heading"><Palette size={18} aria-hidden="true" /> {report.colors.length} 个代表主色</h3>
          {report.colors.length ? <div className="quality-extracted-palette">{report.colors.map((color, index) => <button type="button" key={color.hex} className="quality-extracted-color" data-testid={`quality-extracted-color-${index}`} onClick={() => setForeground(color.hex)} title={`用 ${color.hex} 作为前景色`}><span className="quality-swatch" style={{ backgroundColor: color.hex }} /><strong>{color.hex}</strong><span>{percent(color.share)} 可见色占比</span></button>)}</div> : <p className="quality-empty-colors">采样像素全部透明，没有可见颜色；不会用隐藏的 RGB 值拼出假色板。</p>}
          <p className="quality-method-note">对 {report.sampleWidth} × {report.sampleHeight} 采样做 alpha 加权颜色归并，最多提取 5 色。色占比按可见透明度权重计算；透明统计来自采样，大图细节与边缘会有近似误差。</p>
          <div className="quality-actions"><button type="button" data-testid="quality-copy-palette" disabled={!report.colors.length || busy} onClick={() => void copyColors()}><Copy size={15} aria-hidden="true" />复制主色</button><button type="button" data-testid="quality-export" disabled={busy} onClick={exportReport}><Download size={15} aria-hidden="true" />导出分析 JSON</button></div>
          <p role="status" aria-live="polite" className="quality-copy-status">{copyMessage}</p>
        </div>}
      </div>
      <div className="quality-contrast-panel">
        <div className="quality-panel-heading"><span className="quality-kicker">WCAG 2.x · sRGB</span><h3>色板可读性</h3><p>选两种实色，查看文字与关键图形的对比度。</p></div>
        <div className="quality-color-controls">{renderColorControl('foreground', '前景色', foreground, setForeground)}{renderColorControl('background', '背景色', background, setBackground)}</div>
        <div className="quality-ratio" data-testid="quality-contrast-ratio" aria-live="polite"><span>对比度</span><strong>{ratio === null ? '待输入有效色值' : `${ratio.toFixed(2)} : 1`}</strong></div>
        <div className="quality-thresholds" data-testid="quality-contrast-status">
          {[{ threshold: 4.5, label: '普通正文', note: '至少 4.5 : 1' }, { threshold: 3, label: '关键图形 / 大字', note: '至少 3 : 1' }].map((check) => {
            const passed = ratio !== null && ratio >= check.threshold;
            return <div key={check.threshold} className={`quality-threshold ${ratio === null ? 'quality-threshold-pending' : passed ? 'quality-threshold-pass' : 'quality-threshold-fail'}`}>{passed ? <Check size={17} aria-hidden="true" /> : <X size={17} aria-hidden="true" />}<span><strong>{check.label}</strong><small>{check.note}</small></span><b>{ratio === null ? '待计算' : passed ? '达到门槛' : '未达门槛'}</b></div>;
          })}
        </div>
        <div className="quality-ui-preview" data-testid="quality-ui-preview" style={{ color: normalizedForeground ?? '#24352D', backgroundColor: normalizedBackground ?? '#F7F1E5' }}>
          <span className="quality-preview-eyebrow">界面中的颜色</span><h4>山行小记</h4><p>把细线、正文与按钮放在一起，看看美感能否在使用中保留下来。</p><div className="quality-ui-divider" style={{ borderColor: 'currentColor' }} />{previewExpanded && <p className="quality-preview-detail">山色与纸色都可以很轻，但承载信息的文字必须清楚。点击色块，比较另一组颜色。</p>}<button type="button" aria-expanded={previewExpanded} style={{ color: normalizedBackground ?? '#F7F1E5', backgroundColor: normalizedForeground ?? '#24352D', borderColor: 'currentColor' }} onClick={() => setPreviewExpanded((expanded) => !expanded)}>{previewExpanded ? '收起文字' : '展开卡片'} <span aria-hidden="true">↗</span></button>
        </div>
        <p className="quality-method-note">3:1 的大字条件为至少 18 pt，或至少 14 pt 的粗体字。关键图形要和实际相邻背景比较；渐变、半透明、图片背景与细线需要另做检查。预览不代替真实页面测试。</p>
        <div className="quality-limits"><h4>这份报告能说明什么</h4><p>它提供尺寸、颜色与对比度的可复查测量，帮助你比较生成版本。没有调用 AI 检测，也不能证明史实准确、版权清晰或美术质量已通过。</p></div>
      </div>
    </div>
  </section>;
}
