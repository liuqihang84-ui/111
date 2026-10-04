import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Coordinates are in CSS pixels relative to the canvas, never the viewport. */
export interface WritingRect { left: number; top: number; width: number; height: number }
export interface BookSceneState {
  renderer: 'three-webgl';
  ready: boolean;
  open: boolean;
  mode: 'browse' | 'write';
  phase: 'open' | 'closed' | 'opening' | 'closing' | 'turning' | 'focusing';
  settled: boolean;
  opening: number;
  turnProgress: number;
  meshCount: number;
  triangles: number;
  frames: number;
  writingRect: WritingRect | null;
  camera: { x: number; y: number; z: number };
}
export interface BookSceneOptions {
  onPageClick?: () => void;
  onError?: (message: string) => void;
  onStateChange?: (state: BookSceneState) => void;
  reducedMotion?: boolean;
  startClosed?: boolean;
  coverColor?: string;
  coverTitle?: string;
}
export interface CoverOptions { color?: string; title?: string; texture?: string }
export interface TurnOptions { direction?: 'next' | 'previous'; onHalfway?: () => void }
export interface BookObjectSurface {
  id: string; kind: 'sticker' | 'photo'; src: string | HTMLCanvasElement;
  x: number; y: number; width: number; height: number; rotation: number;
}
export interface BookSceneInspection {
  cameraMatrix: number[]; bookMatrix: number[]; coverMatrix: number[];
  camera: { x: number; y: number; z: number };
  pageYRange: { min: number; max: number };
  turnVertices: number[]; turnProgress: number; phase: BookSceneState['phase'];
  frames: number; textureVersion: number; textureHash: string; objectCount: number; triangles: number;
  projectedPageCenter: { x: number; y: number };
  objectMeshes: { id: string; position: number[]; vertices: number }[];
}

type TextureSource = string | HTMLCanvasElement;
type Tween = { from: number; to: number; began: number; duration: number; resolve: () => void };
type Turn = {
  began: number; duration: number; progress: number; halfway: boolean;
  next: THREE.Texture; old: THREE.Texture | null;
  options: TurnOptions; resolve: () => void;
};

const PAGE_W = 3;
const PAGE_H = PAGE_W * 840 / 640;
const INNER = 0.105;
const PAPER_Y = 0.415;
const COVER_Y = 0.075;
const SPINE_Y = PAPER_Y - 0.025;
const COLORS = { paper: '#fffef9', ink: '#242624', red: '#bd3e32', ground: '#edece6' };
const ease = (value: number) => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const lerp = THREE.MathUtils.lerp;

/**
 * A live, procedural WebGL book. Page vertices, binding, covers, paper block,
 * lighting and shadows are geometry; the only page image is the user's entry.
 * The DOM writing overlay is aligned to the real right page in overhead mode.
 */
export class BookScene {
  readonly canvas: HTMLCanvasElement;
  private readonly host: HTMLElement;
  private readonly options: BookSceneOptions;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  private readonly book = new THREE.Group();
  private readonly left = new THREE.Group();
  private readonly objectSheets = new THREE.Group();
  private readonly bindingPaper = new THREE.Group();
  private readonly coverMeshes: THREE.Object3D[] = [];
  private readonly objectTextures = new Map<string, { source: TextureSource; texture: THREE.Texture }>();
  private objectRevision = 0;
  private objectModels: BookObjectSurface[] = [];
  private coverFace: THREE.Mesh | null = null;
  private readonly rightPage: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly leftPage: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly turningFront: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly turningBack: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly cameraRest = new THREE.Vector3();
  private readonly cameraTarget = new THREE.Vector3();
  private readonly blankTexture: THREE.CanvasTexture;
  private readonly materials = new Set<THREE.Material>();
  private readonly textures = new Set<THREE.Texture>();
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly coverMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly coverLabelMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly resizeObserver: ResizeObserver;
  private readonly reduced: boolean;
  private pageTexture: THREE.Texture | null = null;
  private coverTexture: THREE.Texture | null = null;
  private turn: Turn | null = null;
  private coverTween: Tween | null = null;
  private mode: 'browse' | 'write' = 'browse';
  private focus = 0;
  private focusTarget = 0;
  private focusTween: { from: number; began: number; duration: number } | null = null;
  private opening = 1;
  private frameId = 0;
  private lastFrame = 0;
  private frameCount = 0;
  private published = '';
  private disposed = false;
  private dirty = true;
  private width = 1;
  private height = 1;
  private hover = new THREE.Vector2();
  private hoverTarget = new THREE.Vector2();
  private orbit = new THREE.Vector2();
  private orbitTarget = new THREE.Vector2();
  private dragStart: { x: number; y: number; moved: boolean; wasPage: boolean; wasCover: boolean; pointerId: number } | null = null;
  private meshCount = 0;
  private textureRevision = 0;
  private coverRevision = 0;
  private lastTextureKey: TextureSource | null = null;
  private coverColor: string;
  private coverTitle: string;

  constructor(host: HTMLElement, options: BookSceneOptions = {}) {
    this.host = host;
    this.options = options;
    this.reduced = options.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.opening = options.startClosed ? 0 : 1;
    this.coverColor = options.coverColor ?? COLORS.red;
    this.coverTitle = options.coverTitle ?? '日常';
    try {
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
    } catch {
      options.onError?.('当前浏览器暂时无法绘制 3D 册页，已保留普通书写方式。');
      throw new Error('WebGL notebook is unavailable');
    }
    this.canvas = this.renderer.domElement;
    this.canvas.dataset.renderer = 'three-webgl';
    this.canvas.dataset.material = 'procedural-paper-and-cloth';
    (this.canvas as HTMLCanvasElement & { __journal3D?: { inspect: () => BookSceneInspection } }).__journal3D = { inspect: () => this.inspect() };
    this.canvas.setAttribute('aria-label', '可翻动的三维手账册：点击右页进入书写，拖动空白处查看册页角度');
    this.canvas.setAttribute('role', 'img');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.touchAction = 'pan-y';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.setClearColor(0x000000, 0);
    this.blankTexture = this.keepTexture(new THREE.CanvasTexture(this.paperCanvas(false)));
    this.blankTexture.colorSpace = THREE.SRGBColorSpace;
    this.blankTexture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.scene.add(this.book);
    this.objectSheets.name = 'individual-paper-objects';
    this.book.add(this.objectSheets);
    this.left.position.y = SPINE_Y;
    this.book.add(this.left);
    this.makeLightsAndGround();
    this.makeBinding();
    this.makePageBlock(this.book, 1);
    this.makePageBlock(this.left, -1);
    this.makeCovers();
    const blank = this.standard({ map: this.blankTexture, roughness: 0.95, metalness: 0, color: 0xffffff, toneMapped: false });
    this.rightPage = new THREE.Mesh(this.pageGeometry(1), blank);
    this.rightPage.receiveShadow = true;
    this.rightPage.castShadow = true;
    this.rightPage.name = 'right-writing-page';
    this.book.add(this.rightPage);
    const leftPaper = this.keepTexture(new THREE.CanvasTexture(this.paperCanvas(true)));
    leftPaper.colorSpace = THREE.SRGBColorSpace;
    leftPaper.anisotropy = this.blankTexture.anisotropy;
    this.leftPage = new THREE.Mesh(this.pageGeometry(-1, -SPINE_Y), this.standard({ map: leftPaper, roughness: 0.98, metalness: 0, toneMapped: false }));
    this.leftPage.castShadow = true;
    this.leftPage.receiveShadow = true;
    this.leftPage.name = 'left-curved-page';
    this.left.add(this.leftPage);
    const turnGeometry = this.pageGeometry(1);
    this.turningFront = new THREE.Mesh(turnGeometry, this.standard({ map: this.blankTexture, roughness: 0.98, side: THREE.FrontSide, toneMapped: false }));
    this.turningBack = new THREE.Mesh(turnGeometry, this.standard({ map: leftPaper, roughness: 0.98, side: THREE.BackSide, toneMapped: false }));
    this.turningFront.name = 'deforming-turn-page-front';
    this.turningBack.name = 'deforming-turn-page-back';
    this.turningFront.castShadow = true;
    this.turningFront.receiveShadow = true;
    this.turningBack.castShadow = true;
    this.turningBack.receiveShadow = true;
    this.turningFront.visible = this.turningBack.visible = false;
    this.book.add(this.turningFront, this.turningBack);
    this.scene.traverse(object => { if (object instanceof THREE.Mesh) this.meshCount++; });
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.host.append(this.canvas);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.frameId = requestAnimationFrame(this.render);
  }

  get state(): BookSceneState {
    const phase = this.turn ? 'turning' : this.coverTween ? (this.coverTween.to > this.coverTween.from ? 'opening' : 'closing') : Math.abs(this.focus - this.focusTarget) > 0.001 ? 'focusing' : this.opening < 0.01 ? 'closed' : 'open';
    const settled = !this.turn && !this.coverTween && Math.abs(this.focus - this.focusTarget) <= 0.001;
    return {
      renderer: 'three-webgl', ready: this.frameCount > 0, open: this.opening > 0.999 && !this.coverTween, mode: this.mode, phase, settled,
      opening: this.opening, turnProgress: this.turn?.progress ?? 0,
      meshCount: this.meshCount, triangles: this.renderer.info.render.triangles,
      frames: this.frameCount, writingRect: settled && this.mode === 'write' ? this.getWritingRect() : null,
      camera: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
    };
  }

  resetView(): void {
    this.hover.set(0, 0); this.hoverTarget.set(0, 0);
    this.orbit.set(0, 0); this.orbitTarget.set(0, 0);
    this.setMode('browse'); this.dirty = true;
  }

  inspect(): BookSceneInspection {
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    const positions = this.rightPage.geometry.getAttribute('position') as THREE.BufferAttribute;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < positions.count; i++) { min = Math.min(min, positions.getY(i)); max = Math.max(max, positions.getY(i)); }
    const turnPositions = this.turningFront.geometry.getAttribute('position') as THREE.BufferAttribute;
    const turnVertices: number[] = [];
    for (const index of [0, 14, 28, 40, 320, 650, turnPositions.count - 1]) {
      turnVertices.push(turnPositions.getX(index), turnPositions.getY(index), turnPositions.getZ(index));
    }
    const center = new THREE.Vector3(INNER + PAGE_W / 2, this.pageHeight(0.5, 0.5), 0);
    center.applyMatrix4(this.book.matrixWorld).project(this.camera);
    const bounds = this.canvas.getBoundingClientRect();
    return {
      cameraMatrix: this.camera.matrixWorld.toArray(), bookMatrix: this.book.matrixWorld.toArray(),
      coverMatrix: this.coverFace?.matrixWorld.toArray() ?? this.left.matrixWorld.toArray(),
      camera: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
      pageYRange: { min, max }, turnVertices, turnProgress: this.turn?.progress ?? 0,
      phase: this.state.phase, frames: this.frameCount, textureVersion: this.textureRevision, textureHash: String(this.pageTexture?.userData.pixelHash ?? 'blank'),
      objectCount: this.objectSheets.children.length, triangles: this.renderer.info.render.triangles,
      projectedPageCenter: { x: bounds.left + (center.x + 1) * bounds.width / 2, y: bounds.top + (1 - center.y) * bounds.height / 2 },
      objectMeshes: this.objectSheets.children.map(mesh => ({ id: mesh.name, position: mesh.position.toArray(), vertices: (mesh as THREE.Mesh).geometry.getAttribute('position').count })),
    };
  }

  async setObjects(objects: BookObjectSurface[]): Promise<void> {
    const revision = ++this.objectRevision;
    const textures = await Promise.all(objects.map(async object => {
      const cached = this.objectTextures.get(object.id);
      const texture = cached && cached.source === object.src ? cached.texture : await this.decodeTexture(object.src);
      return { object, texture, fresh: texture !== cached?.texture };
    }));
    if (this.disposed || revision !== this.objectRevision) {
      for (const item of textures) if (item.fresh) this.releaseTexture(item.texture);
      return;
    }
    for (const child of [...this.objectSheets.children]) {
      this.objectSheets.remove(child);
      const mesh = child as THREE.Mesh;
      this.geometries.delete(mesh.geometry); mesh.geometry.dispose();
      const material = mesh.material as THREE.Material;
      this.materials.delete(material); material.dispose();
    }
    const kept = new Set(objects.map(object => object.id));
    for (const [id, cached] of this.objectTextures) if (!kept.has(id)) { this.releaseTexture(cached.texture); this.objectTextures.delete(id); }
    for (const { object, texture } of textures) {
      const previous = this.objectTextures.get(object.id);
      if (previous && previous.texture !== texture) this.releaseTexture(previous.texture);
      this.objectTextures.set(object.id, { source: object.src, texture });
      const material = this.standard({ map: texture, color: 0xffffff, transparent: true, alphaTest: 0.035, toneMapped: false, roughness: 0.93, metalness: 0, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(this.objectGeometry(object), material);
      mesh.name = object.id; mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.renderOrder = this.objectSheets.children.length + 1;
      this.objectSheets.add(mesh);
    }
    this.objectModels = objects;
    this.renderer.shadowMap.needsUpdate = true;
    this.objectSheets.visible = this.mode !== 'write';
    this.meshCount = 0;
    this.scene.traverse(object => { if (object instanceof THREE.Mesh) this.meshCount++; });
    this.dirty = true; this.publish(true);
  }

  async setPageTexture(source: TextureSource): Promise<void> {
    if (this.disposed || source === this.lastTextureKey) return;
    const revision = ++this.textureRevision;
    const texture = await this.decodeTexture(source);
    if (this.disposed || revision !== this.textureRevision) { this.releaseTexture(texture); return; }
    this.lastTextureKey = source;
    if (this.turn) this.completeTurn();
    const old = this.pageTexture;
    this.pageTexture = texture;
    this.rightPage.material.map = this.mode === 'write' ? this.blankTexture : texture;
    this.rightPage.material.needsUpdate = true;
    if (old && old !== this.turn?.old) this.releaseTexture(old);
    this.dirty = true;
  }

  async setCover(options: CoverOptions): Promise<void> {
    if (options.color) this.coverColor = options.color;
    if (options.title !== undefined) this.coverTitle = options.title;
    for (const material of this.coverMaterials) material.color.set(this.coverColor);
    const revision = ++this.coverRevision;
    let texture: THREE.Texture;
    if (options.texture) texture = await this.decodeTexture(options.texture);
    else texture = this.keepTexture(new THREE.CanvasTexture(this.coverCanvas()));
    texture.colorSpace = THREE.SRGBColorSpace;
    if (this.disposed || revision !== this.coverRevision) { this.releaseTexture(texture); return; }
    if (this.coverTexture) this.releaseTexture(this.coverTexture);
    this.coverTexture = texture;
    for (const material of this.coverLabelMaterials) { material.map = texture; material.needsUpdate = true; }
    this.dirty = true;
  }

  setMode(mode: 'browse' | 'write'): void {
    if (this.disposed) return;
    this.mode = mode;
    this.objectSheets.visible = mode !== 'write';
    this.focusTarget = mode === 'write' ? 1 : 0;
    this.focusTween = { from: this.focus, began: performance.now(), duration: 560 };
    this.hoverTarget.set(0, 0); this.orbitTarget.set(0, 0);
    if (mode === 'write') {
      if (this.turn) this.completeTurn();
      if (this.opening < 1 && this.coverTween?.to !== 1) void this.open(true);
      this.rightPage.material.map = this.blankTexture;
    } else this.rightPage.material.map = this.pageTexture ?? this.blankTexture;
    this.rightPage.material.needsUpdate = true;
    if (this.reduced) { this.focus = this.focusTarget; this.focusTween = null; this.updatePaperShape(); this.updateCamera(); this.renderer.shadowMap.needsUpdate = true; }
    this.dirty = true;
    this.publish();
  }

  /** True projected page corners after overhead focus has settled. */
  getWritingRect(): WritingRect | null {
    if (this.disposed || this.mode !== 'write' || Math.abs(this.focus - 1) > 0.001 || this.opening < 0.999 || this.turn) return null;
    this.book.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    const projected = [
      new THREE.Vector3(INNER, PAPER_Y, -PAGE_H / 2),
      new THREE.Vector3(INNER + PAGE_W, PAPER_Y, -PAGE_H / 2),
      new THREE.Vector3(INNER + PAGE_W, PAPER_Y, PAGE_H / 2),
      new THREE.Vector3(INNER, PAPER_Y, PAGE_H / 2),
    ].map(point => {
      point.applyMatrix4(this.book.matrixWorld).project(this.camera);
      return { x: (point.x + 1) * this.width / 2, y: (1 - point.y) * this.height / 2 };
    });
    const left = Math.min(...projected.map(p => p.x)), top = Math.min(...projected.map(p => p.y));
    return { left, top, width: Math.max(...projected.map(p => p.x)) - left, height: Math.max(...projected.map(p => p.y)) - top };
  }

  open(animated = true): Promise<void> { return this.animateCover(1, animated); }
  close(animated = true): Promise<void> {
    this.setMode('browse');
    return this.animateCover(0, animated);
  }

  async flipTo(source: TextureSource, options: TurnOptions = {}): Promise<void> {
    if (this.disposed) return;
    const revision = ++this.textureRevision;
    const next = await this.decodeTexture(source);
    if (this.disposed || revision !== this.textureRevision) { this.releaseTexture(next); return; }
    if (this.turn) this.completeTurn();
    if (this.mode === 'write') this.setMode('browse');
    if (this.opening < 0.999) await this.open();
    if (this.reduced) {
      options.onHalfway?.();
      const previous = this.pageTexture;
      this.pageTexture = next;
      this.lastTextureKey = source;
      this.rightPage.material.map = next;
      this.rightPage.material.needsUpdate = true;
      if (previous) this.releaseTexture(previous);
      this.dirty = true;
      this.publish();
      return;
    }
    this.turningFront.material.map = options.direction === 'previous' ? next : this.pageTexture ?? this.blankTexture;
    this.turningFront.material.needsUpdate = true;
    this.turningFront.visible = this.turningBack.visible = true;
    if (options.direction !== 'previous') {
      this.rightPage.material.map = next;
      this.rightPage.material.needsUpdate = true;
    }
    this.lastTextureKey = source;
    return new Promise<void>(resolve => {
      this.turn = { began: performance.now(), duration: 1000, progress: 0, halfway: false, next, old: this.pageTexture, options, resolve };
      this.dirty = true;
      this.publish();
    });
  }

  resize(width = this.host.clientWidth, height = this.host.clientHeight): void {
    if (this.disposed) return;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.updateCamera();
    this.dirty = true;
    this.publish(true);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.coverTween?.resolve();
    this.turn?.resolve();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.textures.clear();
    this.renderer.dispose();
    this.canvas.remove();
  }

  private standard(parameters: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial(parameters);
    this.materials.add(material);
    return material;
  }
  private geometry<T extends THREE.BufferGeometry>(geometry: T): T { this.geometries.add(geometry); return geometry; }
  private keepTexture<T extends THREE.Texture>(texture: T): T { this.textures.add(texture); return texture; }
  private releaseTexture(texture: THREE.Texture): void {
    if (texture === this.blankTexture) return;
    this.textures.delete(texture);
    texture.dispose();
  }

  private paperCanvas(left: boolean): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 840;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Paper canvas unavailable');
    context.fillStyle = COLORS.paper;
    context.fillRect(0, 0, 640, 840);
    // A seeded, tiny fiber modulation makes a material, never a full-page photo.
    let seed = 711;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 2800; i++) {
      context.strokeStyle = `rgba(111,104,85,${0.012 + random() * 0.014})`;
      context.beginPath();
      const x = random() * 640, y = random() * 840;
      context.moveTo(x, y); context.lineTo(x + random() * 2.2, y + random() * 0.8); context.stroke();
    }
    if (left) {
      context.strokeStyle = '#dcddd5'; context.lineWidth = 1;
      context.beginPath(); context.moveTo(48, 86); context.lineTo(592, 86); context.stroke();
      context.fillStyle = COLORS.red; context.fillRect(48, 64, 3, 20);
      context.fillStyle = '#a3a59d'; context.font = '13px "Guanwu Serif", serif';
      context.fillText('一日一笺', 62, 80);
    }
    return canvas;
  }

  private clothCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cloth canvas unavailable');
    context.fillStyle = '#808080'; context.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 3) {
      context.fillStyle = i % 2 ? '#969696' : '#717171'; context.fillRect(i, 0, 1, 256);
      context.fillStyle = '#8d8d8d'; context.fillRect(0, i, 256, 1);
    }
    return canvas;
  }

  private coverCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 840;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cover canvas unavailable');
    context.clearRect(0, 0, 640, 840);
    context.fillStyle = COLORS.paper; context.fillRect(140, 148, 360, 202);
    context.strokeStyle = 'rgba(36,38,36,.36)'; context.lineWidth = 1;
    context.strokeRect(156, 164, 328, 170);
    context.textAlign = 'center'; context.fillStyle = COLORS.ink;
    const title = this.coverTitle.slice(0, 12) || '日常';
    for (let size = 40; size >= 19; size--) {
      context.font = `600 ${size}px "Guanwu Serif", "Songti SC", serif`;
      if (context.measureText(title).width < 286) break;
    }
    context.fillText(title, 320, 239);
    context.fillStyle = '#85877f'; context.font = '16px "Guanwu Serif", serif'; context.fillText('一日一笺', 320, 298);
    context.fillStyle = COLORS.paper; context.fillRect(58, 756, 3, 24);
    context.textAlign = 'left'; context.font = '13px sans-serif'; context.fillText('01', 79, 774);
    return canvas;
  }

  private makeLightsAndGround(): void {
    this.scene.add(new THREE.HemisphereLight(0xfffdf8, 0xd6d8d1, 1.35));
    const key = new THREE.DirectionalLight(0xfffbf2, 2.3);
    key.position.set(-3.5, 8, 4.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5.5; key.shadow.camera.right = 5.5;
    key.shadow.camera.top = 5.5; key.shadow.camera.bottom = -5.5;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 18;
    key.shadow.bias = -0.0005; key.shadow.normalBias = 0.016;
    key.shadow.radius = 5;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4); fill.position.set(4, 4, -3); this.scene.add(fill);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: COLORS.ground, toneMapped: false });
    this.materials.add(groundMaterial);
    const groundGeometry = this.geometry(new THREE.PlaneGeometry(40, 40));
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.025;
    this.scene.add(ground);
    const shadowCatcherMaterial = new THREE.ShadowMaterial({ color: '#3b392f', opacity: 0.18 });
    this.materials.add(shadowCatcherMaterial);
    const shadowCatcher = new THREE.Mesh(groundGeometry, shadowCatcherMaterial);
    shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.receiveShadow = true; shadowCatcher.position.y = -0.022;
    this.scene.add(shadowCatcher);
    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
    const context = shadowCanvas.getContext('2d')!;
    const gradient = context.createRadialGradient(64, 64, 6, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(40,37,27,.19)'); gradient.addColorStop(0.55, 'rgba(40,37,27,.1)'); gradient.addColorStop(1, 'rgba(40,37,27,0)');
    context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
    const shadowTexture = this.keepTexture(new THREE.CanvasTexture(shadowCanvas));
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
    this.materials.add(shadowMaterial);
    const contact = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(7.25, 5.25)), shadowMaterial);
    contact.rotation.x = -Math.PI / 2; contact.position.y = -0.015; this.scene.add(contact);
  }

  private makeBinding(): void {
    // Rounded bound case with two raised shoulders and a recessed sewn gutter.
    const spine = new THREE.Mesh(this.geometry(new RoundedBoxGeometry(0.27, 0.43, PAGE_H + 0.12, 4, 0.09)), this.standard({ color: this.coverColor, roughness: 0.86 }));
    spine.position.y = 0.19; spine.castShadow = true; spine.receiveShadow = true; this.book.add(spine);
    this.coverMaterials.push(spine.material);
    const vertices: number[] = [], indices: number[] = [];
    for (let row = 0; row <= 2; row++) for (let column = 0; column <= 20; column++) {
      const x = (column / 20 - 0.5) * 0.25;
      vertices.push(x, PAPER_Y + 0.039 + 0.096 * Math.abs(x / 0.125) ** 1.8, (row / 2 - 0.5) * PAGE_H);
      const a = row * 21 + column;
      if (row < 2 && column < 20) indices.push(a, a + 21, a + 1, a + 1, a + 21, a + 22);
    }
    const gutterGeometry = this.geometry(new THREE.BufferGeometry());
    gutterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    gutterGeometry.setIndex(indices); gutterGeometry.computeVertexNormals();
    this.book.add(this.bindingPaper);
    const gutter = new THREE.Mesh(gutterGeometry, this.standard({ color: '#e5dfd3', roughness: 1, side: THREE.DoubleSide }));
    gutter.receiveShadow = true; gutter.castShadow = true; this.bindingPaper.add(gutter);
    for (const z of [-1.24, -0.4, 0.44, 1.28]) {
      const thread = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 6)), this.standard({ color: '#cec3af', roughness: 1 }));
      thread.rotation.z = Math.PI / 2; thread.position.set(0, PAPER_Y + 0.049, z); this.bindingPaper.add(thread);
    }
  }

  private makePageBlock(parent: THREE.Group, side: 1 | -1): void {
    const offset = side < 0 ? -SPINE_Y : 0;
    const block = new THREE.Mesh(this.geometry(new RoundedBoxGeometry(PAGE_W - 0.025, 0.285, PAGE_H - 0.018, 3, 0.018)), this.standard({ color: '#edeadf', roughness: 1 }));
    block.position.set(side * (INNER + PAGE_W / 2), 0.246 + offset, 0);
    block.castShadow = true; block.receiveShadow = true; parent.add(block);
    // Individually modeled visible fore-edge layers, not a flat printed stripe.
    for (let i = 0; i < 17; i++) {
      const layer = new THREE.Mesh(this.geometry(new RoundedBoxGeometry(PAGE_W - 0.027, 0.011, PAGE_H - 0.02, 1, 0.004)), this.standard({ color: i % 3 ? '#f8f6ed' : '#e3e0d5', roughness: 1 }));
      layer.position.set(side * (INNER + PAGE_W / 2 + (i % 3) * 0.002), 0.116 + i * 0.017 + offset, (i % 4) * 0.001);
      layer.receiveShadow = true; parent.add(layer);
    }
    // A shallow rolled edge catches light above the layered paper block.
    const lip = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.025, 0.025, PAGE_H - 0.08, 12)), this.standard({ color: '#fcfbf3', roughness: 1 }));
    lip.rotation.x = Math.PI / 2;
    lip.position.set(side * (INNER + PAGE_W - 0.028), PAPER_Y - 0.03 + offset, 0);
    lip.receiveShadow = true; parent.add(lip);
  }

  private makeCovers(): void {
    const weave = this.keepTexture(new THREE.CanvasTexture(this.clothCanvas()));
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping; weave.repeat.set(8, 12);
    const material = this.standard({ color: this.coverColor, roughness: 0.9, bumpMap: weave, bumpScale: 0.011 });
    this.coverMaterials.push(material);
    const coverGeometry = this.geometry(new RoundedBoxGeometry(PAGE_W + 0.18, 0.095, PAGE_H + 0.18, 5, 0.038));
    for (const side of [1, -1] as const) {
      const cover = new THREE.Mesh(coverGeometry, material);
      cover.position.set(side * (INNER + PAGE_W / 2 + 0.007), COVER_Y + (side < 0 ? -SPINE_Y : 0), 0);
      cover.castShadow = true; cover.receiveShadow = true;
      (side < 0 ? this.left : this.book).add(cover);
      this.coverMeshes.push(cover);
    }
    this.coverTexture = this.keepTexture(new THREE.CanvasTexture(this.coverCanvas()));
    this.coverTexture.colorSpace = THREE.SRGBColorSpace;
    const faceMaterial = this.standard({ map: this.coverTexture, roughness: 0.99, transparent: true, alphaTest: 0.035, toneMapped: false });
    this.coverLabelMaterials.push(faceMaterial);
    // The face lies under the open left case and becomes its upper face closed.
    const face = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(PAGE_W + 0.115, PAGE_H + 0.115)), faceMaterial);
    face.rotation.set(Math.PI / 2, 0, Math.PI);
    face.position.set(-(INNER + PAGE_W / 2 + 0.007), COVER_Y - 0.050 - SPINE_Y, 0);
    this.left.add(face);
    this.coverFace = face;
    this.coverMeshes.push(face);
  }

  private pageGeometry(side: 1 | -1, yOffset = 0): THREE.BufferGeometry {
    const columns = 40, rows = 26;
    const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
    const uvs = new Float32Array((columns + 1) * (rows + 1) * 2);
    const indices: number[] = [];
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const index = row * (columns + 1) + column, u = column / columns, v = row / rows;
      positions[index * 3] = side * (INNER + u * PAGE_W);
      positions[index * 3 + 1] = this.pageHeight(u, v) + yOffset;
      positions[index * 3 + 2] = (v - 0.5) * PAGE_H;
      uvs[index * 2] = side > 0 ? u : 1 - u;
      uvs[index * 2 + 1] = 1 - v;
      if (row < rows && column < columns) {
        const a = index, b = index + 1, c = index + columns + 1, d = c + 1;
        if (side > 0) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
    const geometry = this.geometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    geometry.userData.columns = columns; geometry.userData.rows = rows;
    return geometry;
  }

  private objectGeometry(object: BookObjectSurface): THREE.BufferGeometry {
    const columns = 12, rows = 12;
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    const angle = THREE.MathUtils.degToRad(object.rotation), cosine = Math.cos(angle), sine = Math.sin(angle);
    const cx = object.x + object.width / 2, cy = object.y + object.height / 2;
    const offset = 0.021 + this.objectSheets.children.length * 0.0016;
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const u = column / columns, v = row / rows;
      const dx = (u - 0.5) * object.width, dy = (v - 0.5) * object.height;
      const px = cx + dx * cosine - dy * sine, py = cy + dx * sine + dy * cosine;
      const pageU = px / 640, pageV = py / 840;
      const cornerLift = object.kind === 'photo' ? 0.012 * (u - 0.5) ** 2 * 4 : 0.008 * u ** 6;
      positions.push(INNER + pageU * PAGE_W, this.pageHeight(pageU, pageV) + offset + cornerLift, (pageV - 0.5) * PAGE_H);
      uvs.push(u, 1 - v);
      const index = row * (columns + 1) + column;
      if (row < rows && column < columns) { const c = index + columns + 1; indices.push(index, c, index + 1, index + 1, c, c + 1); }
    }
    // A real thin solid paper piece. Top, reverse and fore-edge are geometry;
    // photos carry a thicker backing while transparent stickers keep alpha.
    const faceCount = positions.length / 3;
    const topIndices = [...indices];
    const thickness = object.kind === 'photo' ? 0.009 : 0.004;
    for (let i = 0; i < faceCount; i++) {
      positions.push(positions[i * 3], positions[i * 3 + 1] - thickness, positions[i * 3 + 2]);
      uvs.push(uvs[i * 2], uvs[i * 2 + 1]);
    }
    for (let i = 0; i < topIndices.length; i += 3) indices.push(topIndices[i] + faceCount, topIndices[i + 2] + faceCount, topIndices[i + 1] + faceCount);
    const join = (a: number, b: number) => indices.push(a, b, a + faceCount, b, b + faceCount, a + faceCount);
    for (let column = 0; column < columns; column++) {
      join(column + 1, column); join(rows * (columns + 1) + column, rows * (columns + 1) + column + 1);
    }
    for (let row = 0; row < rows; row++) {
      join(row * (columns + 1), (row + 1) * (columns + 1));
      join((row + 1) * (columns + 1) + columns, row * (columns + 1) + columns);
    }
    const geometry = this.geometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    return geometry;
  }

  private pageHeight(u: number, v: number): number {
    const innerArch = 0.135 * Math.exp(-u * 11);
    const outerRoll = 0.018 * u ** 7;
    const slightWave = Math.sin(v * Math.PI) * Math.sin(u * Math.PI) * 0.017;
    return PAPER_Y + innerArch + outerRoll + slightWave;
  }

  private updatePaperShape(): void {
    const geometry = this.rightPage.geometry, positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const columns = geometry.userData.columns as number, rows = geometry.userData.rows as number;
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const u = column / columns, v = row / rows, index = row * (columns + 1) + column;
      positions.setY(index, lerp(this.pageHeight(u, v), PAPER_Y, this.focus));
    }
    positions.needsUpdate = true; geometry.computeVertexNormals();
  }

  private updateTurn(progress: number): void {
    const geometry = this.turningFront.geometry, positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const columns = geometry.userData.columns as number, rows = geometry.userData.rows as number;
    const p = this.turn?.options.direction === 'previous' ? 1 - progress : progress;
    const angle = Math.PI * p;
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const u = column / columns, v = row / rows, index = row * (columns + 1) + column;
      // A propagating cylindrical bend across the sheet, not rigid rotation.
      const curl = Math.sin(Math.PI * p) * 0.76 * u ** 1.8;
      const localAngle = angle + curl;
      const radius = INNER + u * PAGE_W;
      const cornerLift = Math.sin(Math.PI * p) * 0.09 * Math.sin(v * Math.PI) * u;
      positions.setXYZ(index,
        Math.cos(localAngle) * radius,
        PAPER_Y + 0.02 + Math.sin(localAngle) * radius + cornerLift + Math.cos(angle) * 0.10 * Math.exp(-u * 11),
        (v - 0.5) * PAGE_H + Math.sin(Math.PI * p) * 0.035 * u * (v - 0.5),
      );
    }
    positions.needsUpdate = true; geometry.computeVertexNormals();
  }

  private animateCover(to: number, animated: boolean): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.coverTween?.resolve();
    this.coverTween = null;
    if (!animated || this.reduced || Math.abs(this.opening - to) < 0.001) {
      this.opening = to;
      this.left.rotation.z = -(1 - this.opening) * Math.PI;
      this.renderer.shadowMap.needsUpdate = true;
      this.dirty = true; this.publish(true);
      return Promise.resolve();
    }
    return new Promise<void>(resolve => {
      this.coverTween = { from: this.opening, to, began: performance.now(), duration: 1100, resolve };
      this.dirty = true; this.publish();
    });
  }

  private completeTurn(): void {
    const turn = this.turn;
    if (!turn) return;
    if (!turn.halfway) turn.options.onHalfway?.();
    this.pageTexture = turn.next;
    this.rightPage.material.map = this.mode === 'write' ? this.blankTexture : turn.next;
    this.rightPage.material.needsUpdate = true;
    this.turningFront.visible = this.turningBack.visible = false;
    this.turningFront.material.map = this.blankTexture;
    if (turn.old && turn.old !== turn.next) this.releaseTexture(turn.old);
    this.turn = null;
    this.renderer.shadowMap.needsUpdate = true;
    turn.resolve();
    this.dirty = true; this.publish(true);
  }

  private async decodeTexture(source: TextureSource): Promise<THREE.Texture> {
    let image: HTMLImageElement | HTMLCanvasElement;
    if (typeof source !== 'string') image = source;
    else {
      // Parent exports already-normalized local PNGs. No remote texture loader.
      if (!/^data:image\/(?:png|jpeg|webp|svg\+xml)[;,]/.test(source)) throw new Error('3D 页图需使用当前手账导出的本地图片');
      image = new Image();
      image.decoding = 'async';
      image.src = source;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('无法读取 3D 页图');
    }
    const texture = this.keepTexture(typeof source === 'string' ? new THREE.Texture(image) : new THREE.CanvasTexture(image as HTMLCanvasElement));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    const sample = document.createElement('canvas'); sample.width = 32; sample.height = 42;
    const context = sample.getContext('2d');
    if (context) {
      context.drawImage(image, 0, 0, 32, 42);
      const pixels = context.getImageData(0, 0, 32, 42).data;
      let hash = 2166136261;
      for (const value of pixels) { hash ^= value; hash = Math.imul(hash, 16777619); }
      texture.userData.pixelHash = (hash >>> 0).toString(16).padStart(8, '0');
    }
    return texture;
  }

  private updateCamera(): void {
    const aspect = Math.max(0.1, this.camera.aspect);
    const tangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    // Browse fits the whole spread; write fits the editable right page exactly.
    const mobile = this.width < 560;
    const visibleWidth = lerp(3.85, mobile ? 5.15 : 7.24, this.opening);
    const browseDistance = Math.max((mobile ? 4.9 : 5.45) / (2 * tangent), visibleWidth / (2 * tangent * aspect));
    const azimuth = 0.10 + this.orbit.x * 0.32;
    const polar = 0.535 + this.orbit.y * 0.20;
    const browseDirection = new THREE.Vector3(Math.sin(polar) * Math.sin(azimuth), Math.cos(polar), Math.sin(polar) * Math.cos(azimuth));
    const browseTarget = new THREE.Vector3(lerp(INNER + PAGE_W / 2, mobile ? 0.95 : 0, this.opening), lerp(0.46, 0.27, this.opening), 0);
    const browse = browseTarget.clone().addScaledVector(browseDirection, browseDistance);
    const marginX = Math.min(0.18, 16 / this.width), marginY = Math.min(0.18, 16 / this.height);
    const writeDistance = Math.max(PAGE_H / ((1 - 2 * marginY) * 2 * tangent), PAGE_W / ((1 - 2 * marginX) * 2 * tangent * aspect));
    const writeTarget = new THREE.Vector3(INNER + PAGE_W / 2, PAPER_Y, 0);
    const write = new THREE.Vector3(writeTarget.x, PAPER_Y + writeDistance, 0.00001);
    this.cameraRest.copy(browse).lerp(write, this.focus);
    this.cameraTarget.copy(browseTarget).lerp(writeTarget, this.focus);
    const hoverFactor = (1 - this.focus) * (this.reduced ? 0 : 1);
    this.camera.position.copy(this.cameraRest);
    this.camera.position.x += this.hover.x * 0.28 * hoverFactor;
    this.camera.position.z += this.hover.y * 0.22 * hoverFactor;
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateMatrixWorld(true);
    this.left.rotation.z = -(1 - this.opening) * Math.PI;
    this.bindingPaper.visible = this.opening > 0.12;
  }

  private publish(force = false): void {
    if (this.disposed) return;
    const state = this.state;
    this.canvas.dataset.ready = String(state.ready);
    this.canvas.dataset.open = String(state.open);
    this.canvas.dataset.mode = state.mode;
    this.canvas.dataset.state = state.phase;
    this.canvas.dataset.settled = String(state.settled);
    this.canvas.dataset.opening = state.opening.toFixed(4);
    this.canvas.dataset.turnProgress = state.turnProgress.toFixed(4);
    this.canvas.dataset.meshCount = String(state.meshCount);
    this.canvas.dataset.triangles = String(state.triangles);
    this.canvas.dataset.frames = String(state.frames);
    this.canvas.dataset.camera = JSON.stringify(state.camera);
    if (state.writingRect) this.canvas.dataset.writingRect = JSON.stringify(state.writingRect);
    else delete this.canvas.dataset.writingRect;
    // Frame counters don't require a React re-render on every animation frame.
    const key = `${state.ready}|${state.open}|${state.mode}|${state.phase}|${state.settled}|${state.writingRect ? JSON.stringify(state.writingRect) : ''}`;
    if (force || key !== this.published) {
      this.published = key;
      this.options.onStateChange?.(state);
    }
  }

  private render = (now: number): void => {
    if (this.disposed) return;
    const delta = Math.min(0.05, (now - (this.lastFrame || now)) / 1000);
    this.lastFrame = now;
    let animate = false;
    if (this.focusTween) {
      const tween = this.focusTween;
      const progress = clamp((now - tween.began) / tween.duration);
      this.focus = lerp(tween.from, this.focusTarget, ease(progress));
      if (progress >= 1) { this.focus = this.focusTarget; this.focusTween = null; this.renderer.shadowMap.needsUpdate = true; }
      this.updatePaperShape(); animate = true;
    }
    if (this.coverTween) {
      const tween = this.coverTween;
      const progress = clamp((now - tween.began) / tween.duration);
      this.opening = lerp(tween.from, tween.to, ease(progress));
      this.renderer.shadowMap.needsUpdate = true;
      if (progress >= 1) { this.coverTween = null; tween.resolve(); }
      animate = true;
    }
    if (this.turn) {
      this.turn.progress = clamp((now - this.turn.began) / this.turn.duration);
      this.updateTurn(ease(this.turn.progress));
      this.renderer.shadowMap.needsUpdate = true;
      if (this.turn.progress >= 0.5 && !this.turn.halfway) { this.turn.halfway = true; this.turn.options.onHalfway?.(); }
      if (this.turn.progress >= 1) this.completeTurn();
      animate = true;
    }
    if (this.orbit.distanceTo(this.orbitTarget) > 0.002) {
      this.orbit.lerp(this.orbitTarget, 1 - Math.exp(-delta * 8)); animate = true;
    }
    if (this.hover.distanceTo(this.hoverTarget) > 0.002) {
      this.hover.lerp(this.hoverTarget, 1 - Math.exp(-delta * 6)); animate = true;
    }
    if (this.dirty || animate) {
      this.updateCamera();
      this.renderer.render(this.scene, this.camera);
      this.frameCount++;
      this.dirty = false;
      this.publish();
    }
    this.frameId = requestAnimationFrame(this.render);
  };

  private hitRightPage(event: PointerEvent): boolean {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([this.rightPage, this.leftPage, this.turningFront, this.turningBack, ...this.objectSheets.children], false);
    return !!hits[0] && (hits[0].object === this.rightPage || hits[0].object.parent === this.objectSheets) && this.opening > 0.999 && !this.turn;
  }

  private hitCover(event: PointerEvent): boolean {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(this.coverMeshes, false).length > 0;
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.mode === 'write') return;
    this.dragStart = { x: event.clientX, y: event.clientY, moved: false, wasPage: this.hitRightPage(event), wasCover: this.hitCover(event), pointerId: event.pointerId };
    if (event.pointerType === 'mouse') this.canvas.setPointerCapture(event.pointerId);
  };
  private onPointerMove = (event: PointerEvent): void => {
    if (this.mode === 'write' || this.reduced) return;
    const bounds = this.canvas.getBoundingClientRect();
    if (this.dragStart && this.dragStart.pointerId === event.pointerId) {
      const dx = event.clientX - this.dragStart.x, dy = event.clientY - this.dragStart.y;
      if (Math.hypot(dx, dy) > 6) this.dragStart.moved = true;
      this.orbitTarget.set(clamp(dx / bounds.width * 5, -1.4, 1.4), clamp(dy / bounds.height * 5, -1.4, 1.4));
    } else if (event.pointerType === 'mouse') {
      this.hoverTarget.set((event.clientX - bounds.left) / bounds.width * 2 - 1, (event.clientY - bounds.top) / bounds.height * 2 - 1);
      this.canvas.style.cursor = this.hitRightPage(event) ? 'pointer' : 'grab';
    }
  };
  private onPointerUp = (event: PointerEvent): void => {
    const start = this.dragStart;
    this.dragStart = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.hoverTarget.set(0, 0); this.orbitTarget.set(0, 0);
    if (!start || start.pointerId !== event.pointerId || start.moved) return;
    if (this.opening < 0.01 && start.wasCover && this.hitCover(event)) void this.open();
    else if (start.wasPage && this.hitRightPage(event)) this.options.onPageClick?.();
  };
  private onPointerCancel = (): void => { this.dragStart = null; this.hoverTarget.set(0, 0); this.orbitTarget.set(0, 0); };
  private onPointerLeave = (): void => { if (!this.dragStart) this.hoverTarget.set(0, 0); };
  private onContextLost = (event: Event): void => {
    event.preventDefault();
    this.options.onError?.('3D 画面暂时中断，记录仍已保留，请重新打开页面或继续普通书写。');
  };
}
