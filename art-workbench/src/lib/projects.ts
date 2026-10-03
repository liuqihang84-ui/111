import type { ArtTradition, BriefInput, SavedProject } from '../types';

export const STORAGE_KEY = 'guanwu-projects-v1';
const targets = new Set(['game', 'app']);
const kinds = new Set(['scene', 'character', 'prop', 'icon', 'interface']);

function isBriefInput(value: unknown, ids: Set<string>): value is BriefInput {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.traditionId === 'string' && ids.has(v.traditionId)
    && typeof v.target === 'string' && targets.has(v.target)
    && typeof v.assetKind === 'string' && kinds.has(v.assetKind)
    && ['subject', 'feeling', 'format'].every(k => typeof v[k] === 'string' && (v[k] as string).length <= 1000)
    && ['detail', 'colorIntensity', 'whitespace'].every(k => typeof v[k] === 'number' && Number.isFinite(v[k]) && (v[k] as number) >= 0 && (v[k] as number) <= 100);
}

export function parseProjects(value: unknown, traditions: ArtTradition[]): SavedProject[] {
  const ids = new Set(traditions.map(t => t.id));
  const envelope = value as { version?: unknown; projects?: unknown } | null;
  const items = Array.isArray(value) ? value : envelope?.version === 1 && Array.isArray(envelope.projects) ? envelope.projects : null;
  if (!items || items.length > 100) throw new Error('请导入观物导出的项目册 JSON，最多 100 个项目。');
  const seen = new Set<string>();
  return items.map(item => {
    if (!item || typeof item !== 'object') throw new Error('项目格式不完整。');
    const p = item as SavedProject;
    if (typeof p.id !== 'string' || !p.id || p.id.length > 100 || seen.has(p.id)
      || typeof p.name !== 'string' || p.name.length > 1000
      || typeof p.createdAt !== 'string' || !Number.isFinite(Date.parse(p.createdAt))
      || !isBriefInput(p.input, ids) || !p.brief || typeof p.brief !== 'object'
      || !['title', 'positive', 'negative', 'specification', 'markdown'].every(k => typeof (p.brief as unknown as Record<string, unknown>)[k] === 'string' && ((p.brief as unknown as Record<string, unknown>)[k] as string).length < 100_000)
      || !Array.isArray(p.brief.checklist) || p.brief.checklist.some(x => typeof x !== 'string')
      || !p.brief.tokens || typeof p.brief.tokens !== 'object' || Object.values(p.brief.tokens).some(v => typeof v !== 'string')) throw new Error('项目文件含有不支持的字段、重复项目或无效的制作参数。');
    seen.add(p.id);
    return p;
  });
}

export function loadProjects(traditions: ArtTradition[]): SavedProject[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseProjects(JSON.parse(stored), traditions) : [];
  } catch { return []; }
}

export function saveProjects(projects: SavedProject[]): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, projects })); return true; }
  catch { return false; }
}

export function downloadText(filename: string, text: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
