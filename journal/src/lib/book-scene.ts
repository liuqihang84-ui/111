import * as THREE from 'three';

/** Coordinates are CSS pixels relative to the live canvas. */
export interface WritingRect { left: number; top: number; width: number; height: number }
export interface BookSceneState {
  renderer: 'three-webgl'; ready: boolean; open: boolean; mode: 'browse' | 'write';
  phase: 'open' | 'closed' | 'opening' | 'closing' | 'turning' | 'focusing';
  settled: boolean; opening: number; turnProgress: number; meshCount: number;
  triangles: number; frames: number; writingRect: WritingRect | null;
  camera: { x: number; y: number; z: number };
}
export interface BookSceneOptions {
  onPageClick?: () => void; onError?: (message: string) => void;
  onStateChange?: (state: BookSceneState) => void; reducedMotion?: boolean;
  /** Kept for saved integrations; the digital canvas is always open. */
  startClosed?: boolean; coverColor?: string; coverTitle?: string;
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
  pageYRange: { min: number; max: number }; turnVertices: number[];
  turnProgress: number; phase: BookSceneState['phase']; frames: number;
  textureVersion: number; textureHash: string; objectCount: number; triangles: number;
  projectedPageCenter: { x: number; y: number };
  objectMeshes: { id: string; position: number[]; vertices: number }[];
}

type TextureSource = string | HTMLCanvasElement;
type Turn = {
  began: number; duration: number; progress: number; halfway: boolean;
  next: THREE.Texture; old: THREE.Texture | null; options: TurnOptions; resolve: () => void;
};
const PAGE_W = 3;
const PAGE_H = PAGE_W * 840 / 640;
const PAGE_X = -PAGE_W / 2;
const PAPER_Y = 0.28;
const PAGE_RADIUS_PX = 22;
const PAGE_RADIUS = PAGE_W * PAGE_RADIUS_PX / 640;
const COLORS = { paper: '#fcfbf6', plate: '#cbd8ca' };
const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const ease = (value: number) => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
const lerp = THREE.MathUtils.lerp;

/** A single, lightly suspended digital writing surface, never a bound book. */
export class BookScene {
  readonly canvas: HTMLCanvasElement;
  private readonly host: HTMLElement;
  private readonly options: BookSceneOptions;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  private readonly book = new THREE.Group();
  private readonly objectSheets = new THREE.Group();
  private readonly rightPage: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly turningFront: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly backplate: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly blankTexture: THREE.CanvasTexture;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly materials = new Set<THREE.Material>();
  private readonly textures = new Set<THREE.Texture>();
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly objectTextures = new Map<string, { source: TextureSource; texture: THREE.Texture }>();
  private readonly resizeObserver: ResizeObserver;
  private readonly reduced: boolean;
  private objectRevision = 0;
  private pageTexture: THREE.Texture | null = null;
  private turn: Turn | null = null;
  private mode: 'browse' | 'write' = 'write';
  private focus = 1;
  private focusTarget = 1;
  private focusTween: { from: number; began: number; duration: number } | null = null;
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
  private dragStart: { x: number; y: number; moved: boolean; wasPage: boolean; pointerId: number } | null = null;
  private meshCount = 0;
  private textureRevision = 0;
  private lastTextureKey: TextureSource | null = null;

  constructor(host: HTMLElement, options: BookSceneOptions = {}) {
    this.host = host;
    this.options = options;
    this.reduced = options.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
    } catch {
      options.onError?.('当前浏览器无法绘制空间画布，已保留普通书写方式。');
      throw new Error('WebGL writing canvas is unavailable');
    }
    this.canvas = this.renderer.domElement;
    this.canvas.dataset.renderer = 'three-webgl';
    this.canvas.dataset.material = 'digital-floating-sheet';
    (this.canvas as HTMLCanvasElement & { __journal3D?: { inspect: () => BookSceneInspection } }).__journal3D = { inspect: () => this.inspect() };
    this.canvas.setAttribute('aria-label', '轻盈空间画布：在预览中拖动查看层次，点画布继续书写');
    this.canvas.setAttribute('role', 'img');
    this.canvas.style.width = this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.touchAction = 'pan-y';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.setClearColor(0x000000, 0);
    this.blankTexture = this.keepTexture(new THREE.CanvasTexture(this.paperCanvas()));
    this.blankTexture.colorSpace = THREE.SRGBColorSpace;
    this.blankTexture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    this.scene.add(this.book);
    this.objectSheets.name = 'individual-digital-fragments';
    this.book.add(this.objectSheets);
    this.makeLightsAndGround();
    // One continuous rounded edge, rather than a stack of offset sheets.
    this.backplate = this.makeUnderlay();
    this.backplate.name = 'rounded-jade-underlay';
    this.rightPage = new THREE.Mesh(this.pageGeometry(), this.digitalMaterial(this.blankTexture));
    this.rightPage.name = 'digital-writing-surface';
    this.rightPage.receiveShadow = this.rightPage.castShadow = true;
    this.book.add(this.rightPage);
    this.turningFront = new THREE.Mesh(this.pageGeometry(), this.digitalMaterial(this.blankTexture, true));
    this.turningFront.name = 'digital-page-flow';
    this.turningFront.receiveShadow = this.turningFront.castShadow = true;
    this.turningFront.visible = false;
    this.book.add(this.turningFront);
    this.updatePaperShape();
    this.countMeshes();
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
    // Compile the hidden flow material too, before the first date change.
    this.renderer.compile(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.render);
  }

  get state(): BookSceneState {
    const phase = this.turn ? 'turning' : this.focusTween ? 'focusing' : 'open';
    const settled = !this.turn && !this.focusTween;
    return {
      renderer: 'three-webgl', ready: this.frameCount > 0, open: true, mode: this.mode,
      phase, settled, opening: 1, turnProgress: this.turn?.progress ?? 0,
      meshCount: this.meshCount, triangles: this.renderer.info.render.triangles,
      frames: this.frameCount, writingRect: settled && this.mode === 'write' ? this.getWritingRect() : null,
      camera: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
    };
  }

  resetView(): void {
    this.hover.set(0, 0); this.hoverTarget.set(0, 0);
    this.orbit.set(0, 0); this.orbitTarget.set(0, 0);
    this.dirty = true;
  }

  inspect(): BookSceneInspection {
    this.scene.updateMatrixWorld(true); this.camera.updateMatrixWorld(true);
    const positions = this.rightPage.geometry.getAttribute('position') as THREE.BufferAttribute;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < positions.count; i++) { min = Math.min(min, positions.getY(i)); max = Math.max(max, positions.getY(i)); }
    const turning = this.turningFront.geometry.getAttribute('position') as THREE.BufferAttribute;
    const turnVertices: number[] = [];
    for (const index of [0, 12, 24, 340, turning.count - 1]) turnVertices.push(turning.getX(index), turning.getY(index), turning.getZ(index));
    const center = new THREE.Vector3(0, PAPER_Y, 0).applyMatrix4(this.book.matrixWorld).project(this.camera);
    const bounds = this.canvas.getBoundingClientRect();
    return {
      cameraMatrix: this.camera.matrixWorld.toArray(), bookMatrix: this.book.matrixWorld.toArray(),
      coverMatrix: this.backplate.matrixWorld.toArray(),
      camera: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
      pageYRange: { min, max }, turnVertices, turnProgress: this.turn?.progress ?? 0,
      phase: this.state.phase, frames: this.frameCount, textureVersion: this.textureRevision,
      textureHash: String(this.pageTexture?.userData.pixelHash ?? 'blank'), objectCount: this.objectSheets.children.length,
      triangles: this.renderer.info.render.triangles,
      projectedPageCenter: { x: bounds.left + (center.x + 1) * bounds.width / 2, y: bounds.top + (1 - center.y) * bounds.height / 2 },
      objectMeshes: this.objectSheets.children.map(mesh => ({ id: mesh.name, position: mesh.position.toArray(), vertices: (mesh as THREE.Mesh).geometry.getAttribute('position').count })),
    };
  }

  async setObjects(objects: BookObjectSurface[]): Promise<void> {
    const revision = ++this.objectRevision;
    const decoded = await Promise.all(objects.map(async object => {
      const cached = this.objectTextures.get(object.id);
      const texture = cached && cached.source === object.src ? cached.texture : await this.decodeTexture(object.src);
      return { object, texture, fresh: texture !== cached?.texture };
    }));
    if (this.disposed || revision !== this.objectRevision) {
      for (const item of decoded) if (item.fresh) this.releaseTexture(item.texture);
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
    for (const { object, texture } of decoded) {
      const previous = this.objectTextures.get(object.id);
      if (previous && previous.texture !== texture) this.releaseTexture(previous.texture);
      this.objectTextures.set(object.id, { source: object.src, texture });
      const material = this.digitalMaterial(texture, true);
      const mesh = new THREE.Mesh(this.objectGeometry(object), material);
      mesh.name = object.id; mesh.castShadow = mesh.receiveShadow = true;
      mesh.renderOrder = this.objectSheets.children.length + 1;
      this.objectSheets.add(mesh);
    }
    this.objectSheets.visible = this.mode !== 'write' && !this.turn;
    this.renderer.shadowMap.needsUpdate = true;
    this.countMeshes(); this.dirty = true; this.publish(true);
  }

  async setPageTexture(source: TextureSource): Promise<void> {
    if (this.disposed || source === this.lastTextureKey) return;
    const revision = ++this.textureRevision;
    const texture = await this.decodeTexture(source);
    if (this.disposed || revision !== this.textureRevision) { this.releaseTexture(texture); return; }
    if (this.turn) this.completeTurn();
    const old = this.pageTexture;
    this.lastTextureKey = source; this.pageTexture = texture;
    this.rightPage.material.map = this.mode === 'write' ? this.blankTexture : texture;
    this.rightPage.material.emissiveMap = this.rightPage.material.map; this.rightPage.material.needsUpdate = true;
    if (old) this.releaseTexture(old);
    this.dirty = true;
  }

  /** Legacy cover selection now supplies only a faint collection tint. */
  async setCover(options: CoverOptions): Promise<void> {
    if (this.disposed || !options.color) return;
    const tint = new THREE.Color(COLORS.plate).lerp(new THREE.Color(options.color), 0.06);
    this.backplate.material.color.copy(tint).multiplyScalar(0.34);
    this.backplate.material.emissive.copy(tint).multiplyScalar(0.68);
    this.dirty = true;
  }

  setMode(mode: 'browse' | 'write'): void {
    if (this.disposed) return;
    if (this.turn) this.completeTurn();
    this.mode = mode;
    this.objectSheets.visible = mode !== 'write';
    this.focusTarget = mode === 'write' ? 1 : 0;
    this.focusTween = Math.abs(this.focus - this.focusTarget) > 0.001 ? { from: this.focus, began: performance.now(), duration: 360 } : null;
    this.hoverTarget.set(0, 0); this.orbitTarget.set(0, 0);
    this.rightPage.material.map = mode === 'write' ? this.blankTexture : this.pageTexture ?? this.blankTexture;
    this.rightPage.material.emissiveMap = this.rightPage.material.map; this.rightPage.material.needsUpdate = true;
    if (this.reduced) { this.focus = this.focusTarget; this.focusTween = null; this.updatePaperShape(); this.updateCamera(); }
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true; this.publish();
  }

  getWritingRect(): WritingRect | null {
    if (this.disposed || this.mode !== 'write' || this.focusTween || Math.abs(this.focus - 1) > 0.001 || this.turn) return null;
    this.book.updateMatrixWorld(true); this.camera.updateMatrixWorld(true);
    const projected = [
      new THREE.Vector3(PAGE_X, PAPER_Y, -PAGE_H / 2),
      new THREE.Vector3(PAGE_X + PAGE_W, PAPER_Y, -PAGE_H / 2),
      new THREE.Vector3(PAGE_X + PAGE_W, PAPER_Y, PAGE_H / 2),
      new THREE.Vector3(PAGE_X, PAPER_Y, PAGE_H / 2),
    ].map(point => {
      point.applyMatrix4(this.book.matrixWorld).project(this.camera);
      return { x: (point.x + 1) * this.width / 2, y: (1 - point.y) * this.height / 2 };
    });
    const left = Math.min(...projected.map(p => p.x)), top = Math.min(...projected.map(p => p.y));
    return { left, top, width: Math.max(...projected.map(p => p.x)) - left, height: Math.max(...projected.map(p => p.y)) - top };
  }

  /** Compatibility methods; a digital canvas has no opening ceremony. */
  open(_animated = true): Promise<void> { return Promise.resolve(); }
  close(_animated = true): Promise<void> { this.setMode('browse'); return Promise.resolve(); }

  async flipTo(source: TextureSource, options: TurnOptions = {}): Promise<void> {
    if (this.disposed) return;
    const revision = ++this.textureRevision;
    const next = await this.decodeTexture(source);
    if (this.disposed || revision !== this.textureRevision) { this.releaseTexture(next); return; }
    if (this.turn) this.completeTurn();
    this.lastTextureKey = source;
    if (this.reduced) {
      const previous = this.pageTexture;
      options.onHalfway?.(); this.pageTexture = next;
      this.rightPage.material.map = this.mode === 'write' ? this.blankTexture : next;
      this.rightPage.material.emissiveMap = this.rightPage.material.map; this.rightPage.material.needsUpdate = true;
      if (previous) this.releaseTexture(previous);
      this.dirty = true; this.publish(true); return;
    }
    this.turningFront.material.map = this.pageTexture ?? this.blankTexture;
    this.turningFront.material.opacity = 1;
    this.turningFront.material.emissiveMap = this.turningFront.material.map; this.turningFront.material.needsUpdate = true;
    this.turningFront.visible = true;
    this.rightPage.visible = this.objectSheets.visible = false;
    return new Promise<void>(resolve => {
      this.turn = { began: performance.now(), duration: 620, progress: 0, halfway: false, next, old: this.pageTexture, options, resolve };
      this.dirty = true; this.publish();
    });
  }

  resize(width = this.host.clientWidth, height = this.host.clientHeight): void {
    if (this.disposed) return;
    this.width = Math.max(1, width); this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix(); this.updateCamera();
    this.dirty = true; this.publish(true);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; cancelAnimationFrame(this.frameId); this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.turn?.resolve();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.textures.clear(); this.renderer.dispose(); this.canvas.remove();
  }

  private standard(parameters: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial(parameters); this.materials.add(material); return material;
  }
  private digitalMaterial(texture: THREE.Texture, transparent = true): THREE.MeshStandardMaterial {
    // Most color comes from the designed artwork. A small lit component keeps
    // real relief/shadows while avoiding the grey paper of a physical mockup.
    return this.standard({ map: texture, emissiveMap: texture, emissive: 0xffffff,
      emissiveIntensity: 0.89, color: new THREE.Color().setRGB(0.14, 0.14, 0.14),
      roughness: 0.84, metalness: 0, transparent, alphaTest: transparent ? 0.01 : 0,
      side: THREE.DoubleSide });
  }
  private geometry<T extends THREE.BufferGeometry>(value: T): T { this.geometries.add(value); return value; }
  private keepTexture<T extends THREE.Texture>(value: T): T { this.textures.add(value); return value; }
  private releaseTexture(value: THREE.Texture): void { if (value !== this.blankTexture) { this.textures.delete(value); value.dispose(); } }
  private countMeshes(): void { this.meshCount = 0; this.scene.traverse(object => { if (object instanceof THREE.Mesh) this.meshCount++; }); }

  private paperCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 840;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Writing canvas unavailable');
    context.fillStyle = COLORS.paper;
    context.beginPath(); context.roundRect(0, 0, 640, 840, PAGE_RADIUS_PX); context.fill();
    return canvas;
  }

  private makeLightsAndGround(): void {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xe4ebdf, 1.3));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(-3, 7, 4); key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 3.5; key.shadow.camera.bottom = -3.5;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 14;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.012;
    key.shadow.radius = 4; this.scene.add(key);
    const groundGeometry = this.geometry(new THREE.PlaneGeometry(24, 24));
    // The scene stays transparent; the app owns its designed background.
    const shadowMaterial = new THREE.ShadowMaterial({ color: '#65775f', opacity: 0.055 }); this.materials.add(shadowMaterial);
    const catcher = new THREE.Mesh(groundGeometry, shadowMaterial);
    catcher.name = 'quiet-surface-shadow';
    catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; catcher.position.y = 0.244; this.scene.add(catcher);
  }

  private makeUnderlay(): THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
    const edge = PAGE_W * 2.5 / 640;
    const halfWidth = PAGE_W / 2 + edge, halfHeight = PAGE_H / 2 + edge;
    const radius = PAGE_RADIUS + edge, thickness = 0.012;
    const shape = new THREE.Shape();
    shape.moveTo(-halfWidth + radius, -halfHeight);
    shape.lineTo(halfWidth - radius, -halfHeight);
    shape.absarc(halfWidth - radius, -halfHeight + radius, radius, -Math.PI / 2, 0, false);
    shape.lineTo(halfWidth, halfHeight - radius);
    shape.absarc(halfWidth - radius, halfHeight - radius, radius, 0, Math.PI / 2, false);
    shape.lineTo(-halfWidth + radius, halfHeight);
    shape.absarc(-halfWidth + radius, halfHeight - radius, radius, Math.PI / 2, Math.PI, false);
    shape.lineTo(-halfWidth, -halfHeight + radius);
    shape.absarc(-halfWidth + radius, -halfHeight + radius, radius, Math.PI, Math.PI * 1.5, false);
    shape.closePath();
    const geometry = this.geometry(new THREE.ExtrudeGeometry(shape, {
      depth: thickness, steps: 1, curveSegments: 12,
      bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.0015, bevelSegments: 2,
    }));
    geometry.rotateX(-Math.PI / 2);
    geometry.userData.cornerRadiusPixels = PAGE_RADIUS_PX;
    const tint = new THREE.Color(COLORS.plate);
    const material = new THREE.MeshPhysicalMaterial({
      color: tint.clone().multiplyScalar(0.34), emissive: tint.clone().multiplyScalar(0.68),
      roughness: 0.62, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.7,
      transparent: true, opacity: 0.94,
    });
    this.materials.add(material);
    const layer = new THREE.Mesh(geometry, material);
    layer.position.set(0, PAPER_Y - 0.02, 0);
    layer.castShadow = layer.receiveShadow = true; layer.renderOrder = -1;
    this.book.add(layer);
    return layer;
  }

  private pageGeometry(): THREE.BufferGeometry {
    const columns = 24, rows = 28;
    const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
    const uvs = new Float32Array((columns + 1) * (rows + 1) * 2);
    const indices: number[] = [];
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const index = row * (columns + 1) + column, u = column / columns, v = row / rows;
      positions[index * 3] = PAGE_X + u * PAGE_W;
      positions[index * 3 + 1] = this.pageHeight(u, v);
      positions[index * 3 + 2] = (v - 0.5) * PAGE_H;
      uvs[index * 2] = u; uvs[index * 2 + 1] = 1 - v;
      if (row < rows && column < columns) { const c = index + columns + 1; indices.push(index, c, index + 1, index + 1, c, c + 1); }
    }
    const geometry = this.geometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    geometry.userData.columns = columns; geometry.userData.rows = rows; return geometry;
  }

  private objectGeometry(object: BookObjectSurface): THREE.BufferGeometry {
    const columns = 6, rows = 6, positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    const angle = THREE.MathUtils.degToRad(object.rotation), cosine = Math.cos(angle), sine = Math.sin(angle);
    const cx = object.x + object.width / 2, cy = object.y + object.height / 2;
    const offset = 0.009 + this.objectSheets.children.length * 0.001;
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const u = column / columns, v = row / rows;
      const dx = (u - 0.5) * object.width, dy = (v - 0.5) * object.height;
      const pageU = (cx + dx * cosine - dy * sine) / 640, pageV = (cy + dx * sine + dy * cosine) / 840;
      const lift = 0.0035 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
      positions.push(PAGE_X + pageU * PAGE_W, this.pageHeight(pageU, pageV) + offset + lift, (pageV - 0.5) * PAGE_H);
      uvs.push(u, 1 - v);
      const index = row * (columns + 1) + column;
      if (row < rows && column < columns) { const c = index + columns + 1; indices.push(index, c, index + 1, index + 1, c, c + 1); }
    }
    const geometry = this.geometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
  }

  private pageHeight(u: number, v: number): number {
    // Deliberately restrained curvature, without a binding edge or worn paper.
    return PAPER_Y + 0.018 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) + 0.007 * (u - 0.5) ** 2;
  }

  private updatePaperShape(): void {
    const geometry = this.rightPage.geometry, positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const columns = geometry.userData.columns as number, rows = geometry.userData.rows as number;
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const u = column / columns, v = row / rows;
      positions.setY(row * (columns + 1) + column, lerp(this.pageHeight(u, v), PAPER_Y, this.focus));
    }
    positions.needsUpdate = true; geometry.computeVertexNormals();
  }

  private updateTurn(progress: number): void {
    const turn = this.turn;
    if (!turn) return;
    const geometry = this.turningFront.geometry, positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const columns = geometry.userData.columns as number, rows = geometry.userData.rows as number;
    const direction = turn.options.direction === 'previous' ? -1 : 1;
    const segment = progress < 0.5 ? progress * 2 : (progress - 0.5) * 2;
    const weight = progress < 0.5 ? ease(segment) : 1 - ease(segment);
    const side = progress < 0.5 ? -direction : direction;
    const shift = side * weight * 0.34;
    const tilt = side * weight * 0.085;
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const u = column / columns, v = row / rows, x = PAGE_X + u * PAGE_W;
      const wave = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * weight * 0.055;
      positions.setXYZ(row * (columns + 1) + column,
        x * Math.cos(tilt) + shift,
        lerp(this.pageHeight(u, v), PAPER_Y, this.focus) + 0.028 + x * Math.sin(tilt) + wave,
        (v - 0.5) * PAGE_H - weight * 0.055);
    }
    positions.needsUpdate = true; geometry.computeVertexNormals();
    this.turningFront.material.opacity = 1 - weight;
  }

  private completeTurn(): void {
    const turn = this.turn;
    if (!turn) return;
    if (!turn.halfway) turn.options.onHalfway?.();
    this.pageTexture = turn.next;
    this.rightPage.material.map = this.mode === 'write' ? this.blankTexture : turn.next;
    this.rightPage.material.emissiveMap = this.rightPage.material.map; this.rightPage.material.needsUpdate = true;
    this.rightPage.visible = true; this.turningFront.visible = false;
    this.turningFront.material.map = this.blankTexture; this.turningFront.material.emissiveMap = this.blankTexture;
    this.turningFront.material.opacity = 1;
    this.objectSheets.visible = this.mode !== 'write';
    if (turn.old && turn.old !== turn.next) this.releaseTexture(turn.old);
    this.turn = null; this.renderer.shadowMap.needsUpdate = true;
    turn.resolve(); this.dirty = true; this.publish(true);
  }

  private async decodeTexture(source: TextureSource): Promise<THREE.Texture> {
    let image: HTMLImageElement | HTMLCanvasElement;
    if (typeof source !== 'string') image = source;
    else {
      if (!/^data:image\/(?:png|jpeg|webp|svg\+xml)[;,]/.test(source)) throw new Error('空间页图需使用手账导出的本地图片');
      image = new Image(); image.decoding = 'async'; image.src = source; await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('无法读取空间页图');
    }
    const texture = this.keepTexture(typeof source === 'string' ? new THREE.Texture(image) : new THREE.CanvasTexture(image as HTMLCanvasElement));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy()); texture.needsUpdate = true;
    const sample = document.createElement('canvas'); sample.width = 32; sample.height = 42;
    const context = sample.getContext('2d');
    if (context) {
      context.drawImage(image, 0, 0, 32, 42);
      let hash = 2166136261;
      for (const value of context.getImageData(0, 0, 32, 42).data) { hash ^= value; hash = Math.imul(hash, 16777619); }
      texture.userData.pixelHash = (hash >>> 0).toString(16).padStart(8, '0');
    }
    return texture;
  }

  private updateCamera(): void {
    const aspect = Math.max(0.1, this.camera.aspect);
    const tangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const marginX = Math.min(0.18, 20 / this.width), marginY = Math.min(0.18, 26 / this.height);
    const writeDistance = Math.max(PAGE_H / ((1 - 2 * marginY) * 2 * tangent), PAGE_W / ((1 - 2 * marginX) * 2 * tangent * aspect));
    const browseDistance = writeDistance * 1.06;
    const polar = 0.23 + this.orbit.y * 0.12;
    const azimuth = -0.18 + this.orbit.x * 0.25;
    const browse = new THREE.Vector3(Math.sin(polar) * Math.sin(azimuth), Math.cos(polar), Math.sin(polar) * Math.cos(azimuth)).multiplyScalar(browseDistance);
    browse.y += PAPER_Y;
    const write = new THREE.Vector3(0, PAPER_Y + writeDistance, 0.00001);
    this.camera.position.copy(browse).lerp(write, this.focus);
    const hoverFactor = (1 - this.focus) * (this.reduced ? 0 : 1);
    this.camera.position.x += this.hover.x * 0.075 * hoverFactor;
    this.camera.position.z += this.hover.y * 0.055 * hoverFactor;
    this.camera.up.set(0, 0, -1); this.camera.lookAt(0, PAPER_Y, 0); this.camera.updateMatrixWorld(true);
  }

  private publish(force = false): void {
    if (this.disposed) return;
    const state = this.state;
    this.canvas.dataset.ready = String(state.ready); this.canvas.dataset.open = 'true';
    this.canvas.dataset.mode = state.mode; this.canvas.dataset.state = state.phase;
    this.canvas.dataset.settled = String(state.settled); this.canvas.dataset.opening = '1.0000';
    this.canvas.dataset.turnProgress = state.turnProgress.toFixed(4);
    this.canvas.dataset.meshCount = String(state.meshCount); this.canvas.dataset.triangles = String(state.triangles);
    this.canvas.dataset.frames = String(state.frames); this.canvas.dataset.camera = JSON.stringify(state.camera);
    if (state.writingRect) this.canvas.dataset.writingRect = JSON.stringify(state.writingRect); else delete this.canvas.dataset.writingRect;
    const key = `${state.ready}|${state.mode}|${state.phase}|${state.settled}|${state.writingRect ? JSON.stringify(state.writingRect) : ''}`;
    if (force || key !== this.published) { this.published = key; this.options.onStateChange?.(state); }
  }

  private render = (now: number): void => {
    if (this.disposed) return;
    const delta = Math.min(0.05, (now - (this.lastFrame || now)) / 1000); this.lastFrame = now;
    let animate = false;
    if (this.focusTween) {
      const tween = this.focusTween, progress = clamp((now - tween.began) / tween.duration);
      this.focus = lerp(tween.from, this.focusTarget, ease(progress));
      if (progress >= 1) { this.focus = this.focusTarget; this.focusTween = null; }
      this.updatePaperShape(); this.renderer.shadowMap.needsUpdate = true; animate = true;
    }
    if (this.turn) {
      const turn = this.turn;
      turn.progress = clamp((now - turn.began) / turn.duration);
      if (turn.progress >= 0.5 && !turn.halfway) {
        turn.halfway = true; turn.options.onHalfway?.();
        this.turningFront.material.map = turn.next; this.turningFront.material.emissiveMap = this.turningFront.material.map; this.turningFront.material.needsUpdate = true;
      }
      this.updateTurn(turn.progress); this.renderer.shadowMap.needsUpdate = true;
      if (turn.progress >= 1) this.completeTurn();
      animate = true;
    }
    if (this.orbit.distanceTo(this.orbitTarget) > 0.001) { this.orbit.lerp(this.orbitTarget, 1 - Math.exp(-delta * 9)); animate = true; }
    if (this.hover.distanceTo(this.hoverTarget) > 0.001) { this.hover.lerp(this.hoverTarget, 1 - Math.exp(-delta * 8)); animate = true; }
    if (this.dirty || animate) {
      this.updateCamera(); this.renderer.render(this.scene, this.camera); this.frameCount++;
      this.dirty = false; this.publish();
    }
    this.frameId = requestAnimationFrame(this.render);
  };

  private hitPage(event: PointerEvent): boolean {
    if (this.turn) return false;
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects([this.rightPage, ...this.objectSheets.children], false).some(hit => {
      if (hit.object !== this.rightPage || !hit.uv) return true;
      const x = hit.uv.x * 640, y = (1 - hit.uv.y) * 840;
      const cx = clamp(x, PAGE_RADIUS_PX, 640 - PAGE_RADIUS_PX);
      const cy = clamp(y, PAGE_RADIUS_PX, 840 - PAGE_RADIUS_PX);
      return Math.hypot(x - cx, y - cy) <= PAGE_RADIUS_PX;
    });
  }
  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.mode === 'write' || this.turn) return;
    this.dragStart = { x: event.clientX, y: event.clientY, moved: false, wasPage: this.hitPage(event), pointerId: event.pointerId };
    if (event.pointerType === 'mouse') this.canvas.setPointerCapture(event.pointerId);
  };
  private onPointerMove = (event: PointerEvent): void => {
    if (this.mode === 'write' || this.reduced) return;
    const bounds = this.canvas.getBoundingClientRect();
    if (this.dragStart && this.dragStart.pointerId === event.pointerId) {
      const dx = event.clientX - this.dragStart.x, dy = event.clientY - this.dragStart.y;
      if (Math.hypot(dx, dy) > 6) this.dragStart.moved = true;
      this.orbitTarget.set(clamp(dx / bounds.width * 5, -1.2, 1.2), clamp(dy / bounds.height * 5, -1, 1));
    } else if (event.pointerType === 'mouse') {
      this.hoverTarget.set((event.clientX - bounds.left) / bounds.width * 2 - 1, (event.clientY - bounds.top) / bounds.height * 2 - 1);
      this.canvas.style.cursor = this.hitPage(event) ? 'pointer' : 'grab';
    }
  };
  private onPointerUp = (event: PointerEvent): void => {
    const start = this.dragStart; this.dragStart = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.hoverTarget.set(0, 0); this.orbitTarget.set(0, 0);
    if (start?.pointerId === event.pointerId && !start.moved && start.wasPage && this.hitPage(event)) this.options.onPageClick?.();
  };
  private onPointerCancel = (): void => { this.dragStart = null; this.hoverTarget.set(0, 0); this.orbitTarget.set(0, 0); };
  private onPointerLeave = (): void => { if (!this.dragStart) this.hoverTarget.set(0, 0); };
  private onContextLost = (event: Event): void => {
    event.preventDefault(); this.options.onError?.('空间画布暂时中断，记录仍已保留，可以继续普通书写。');
  };
}
