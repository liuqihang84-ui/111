import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { JournalEntry } from './model';
import { createMemoryTextures, type MemoryCardKind, type MemoryCardTexture } from './memory-textures';

export type MemoryLayout = 'spread' | 'gather';
export interface MemorySceneState {
  renderer: 'memory-webgl'; ready: boolean; available: boolean; settled: boolean; layout: MemoryLayout;
  cards: number; noteCount: number; visiblePhotoCount: number; actualPhotoCount: number; taskCount: number;
  meshCount: number; triangles: number; frames: number; dragging: boolean;
  camera: { x: number; y: number; z: number };
}
export interface MemorySceneOptions {
  onCardSelect: (kind: MemoryCardKind) => void;
  onAvailability: (available: boolean) => void;
  onState?: (state: MemorySceneState) => void;
}
type Pose = { position: THREE.Vector3; rotation: THREE.Euler };
type Card = { descriptor: MemoryCardTexture; group: THREE.Group; body: THREE.Mesh; front: THREE.Mesh; texture: THREE.CanvasTexture; from: Pose; to: Pose };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const ease = (value: number) => 1 - (1 - value) ** 3;
const CARD_PITCH = -0.1;
const CARD_YAW = -0.22;
const CARD_LAYER_GAP = 0.17;
const CARD_NORMAL = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(CARD_PITCH, CARD_YAW, 0));

/** Parallel face planes retain a genuine clear gap, including throughout layout interpolation. */
function layeredPose(x: number, y: number, layer: number, angle: number): Pose {
  const z = (layer * CARD_LAYER_GAP - CARD_NORMAL.x * x - CARD_NORMAL.y * y) / CARD_NORMAL.z;
  return { position: new THREE.Vector3(x, y, z), rotation: new THREE.Euler(CARD_PITCH, CARD_YAW, angle) };
}

function roundedShape(width: number, height: number, radius: number): THREE.Shape {
  const x = -width / 2, y = -height / 2, r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y); shape.lineTo(x + width - r, y); shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r); shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/** Independent, shallow digital tiles. No book mesh, page turn, desk model, or projective DOM overlay. */
export class MemoryScene {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  private readonly cardsGroup = new THREE.Group();
  private readonly observer: ResizeObserver;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly orbit = new THREE.Vector2();
  private readonly orbitTarget = new THREE.Vector2();
  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly environment: THREE.WebGLRenderTarget;
  private cards: Card[] = [];
  private layout: MemoryLayout = 'spread';
  private width = 1;
  private height = 1;
  private frames = 0;
  private entryRevision = 0;
  private contentRevision = 0;
  private renderedRevision = 0;
  private availabilityAnnounced = false;
  private actualPhotoCount = 0;
  private taskCount = 0;
  private available = true;
  private disposed = false;
  private dirty = true;
  private animation: { began: number; duration: number } | null = null;
  private pointerStart: { id: number; x: number; y: number; moved: boolean; orbit: THREE.Vector2; card: Card | undefined } | null = null;
  private frameId = 0;
  private lastFrame = 0;
  private published = '';

  constructor(private readonly host: HTMLElement, private readonly options: MemorySceneOptions) {
    try {
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
    } catch {
      options.onAvailability(false); throw new Error('当前浏览器无法绘制记忆卡片');
    }
    this.canvas = this.renderer.domElement;
    this.canvas.dataset.renderer = 'memory-webgl'; this.canvas.dataset.material = 'beveled-jade-memory-tiles';
    this.canvas.setAttribute('role', 'img'); this.canvas.setAttribute('aria-label', '立体记忆卡组：拖动转动视角，点击文字、照片或小事卡片编辑');
    this.canvas.style.display = 'block'; this.canvas.style.width = this.canvas.style.height = '100%';
    this.canvas.style.touchAction = 'pan-y'; this.canvas.style.cursor = 'grab';
    (this.canvas as HTMLCanvasElement & { __memory3D?: { inspect: () => ReturnType<MemoryScene['inspect']> } }).__memory3D = { inspect: () => this.inspect() };
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.04;
    this.renderer.setClearColor(0x000000, 0);
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(room, 0.06); this.scene.environment = this.environment.texture;
    room.dispose(); pmrem.dispose();
    const key = new THREE.DirectionalLight('#fff5de', 2.8); key.position.set(-3.5, 4.5, 6); this.scene.add(key);
    const rim = new THREE.DirectionalLight('#cfdfcf', 1.4); rim.position.set(4, -1, -3); this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight('#d9e5d7', 0.5)); this.scene.add(this.cardsGroup);
    this.cardsGroup.name = 'real-independent-memory-cards';
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.host.append(this.canvas);
    this.observer = new ResizeObserver(this.resize); this.observer.observe(host); this.resize();
    this.frameId = requestAnimationFrame(this.render);
  }

  get state(): MemorySceneState {
    const drift = this.orbit.distanceTo(this.orbitTarget) > 0.001;
    const ready = this.frames > 0 && this.cards.length > 0 && this.renderedRevision === this.entryRevision;
    return {
      renderer: 'memory-webgl', ready, available: this.available,
      settled: ready && !this.animation && !drift && !this.pointerStart?.moved, layout: this.layout,
      cards: this.cards.length, noteCount: this.cards.filter(card => card.descriptor.kind === 'note').length,
      visiblePhotoCount: this.cards.filter(card => card.descriptor.kind === 'photo').length, actualPhotoCount: this.actualPhotoCount,
      taskCount: this.taskCount, meshCount: this.cards.length * 2, triangles: this.renderer.info.render.triangles, frames: this.frames,
      dragging: !!this.pointerStart?.moved,
      camera: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
    };
  }

  async setEntry(entry: JournalEntry, bookTitle: string): Promise<void> {
    const revision = ++this.entryRevision;
    this.publish(true);
    const textures = await createMemoryTextures(entry, bookTitle);
    if (this.disposed || !this.available || revision !== this.entryRevision) return;
    const previous = this.cards;
    this.cards = textures.cards.map(descriptor => this.makeCard(descriptor));
    this.contentRevision = revision;
    this.actualPhotoCount = textures.actualPhotoCount; this.taskCount = textures.taskCount;
    for (const card of previous) this.releaseCard(card);
    this.arrange(false); this.updateCamera(); this.dirty = true; this.publish(true);
  }

  setLayout(layout: MemoryLayout): void {
    if (this.disposed || (layout !== 'spread' && layout !== 'gather') || layout === this.layout) return;
    this.layout = layout; this.arrange(!this.reduced); this.dirty = true; this.publish(true);
  }

  resetView(): void {
    this.orbitTarget.set(0, 0); if (this.reduced) this.orbit.set(0, 0);
    this.dirty = true; this.publish(true);
  }

  inspect() {
    this.scene.updateMatrixWorld(true); this.camera.updateMatrixWorld(true);
    const bounds = this.canvas.getBoundingClientRect();
    return {
      ...this.state, cameraMatrix: this.camera.matrixWorld.toArray(), cameraProjection: this.camera.projectionMatrix.toArray(),
      groupMatrix: this.cardsGroup.matrixWorld.toArray(),
      cards: this.cards.map(card => {
        const projected = card.group.getWorldPosition(new THREE.Vector3()).project(this.camera);
        const material = card.body.material as THREE.MeshPhysicalMaterial;
        const normal = new THREE.Vector3(0, 0, 1).transformDirection(card.group.matrixWorld);
        const point = new THREE.Vector3();
        let planeMin = Infinity, planeMax = -Infinity;
        for (const mesh of [card.body, card.front]) {
          const positions = mesh.geometry.getAttribute('position');
          for (let index = 0; index < positions.count; index++) {
            point.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
            const distance = point.dot(normal); planeMin = Math.min(planeMin, distance); planeMax = Math.max(planeMax, distance);
          }
        }
        return {
          id: card.descriptor.id, kind: card.descriptor.kind, empty: card.descriptor.empty, sourceId: card.descriptor.sourceId ?? null,
          position: card.group.position.toArray(), rotation: [card.group.rotation.x, card.group.rotation.y, card.group.rotation.z], matrix: card.group.matrixWorld.toArray(),
          textureHash: card.descriptor.hash, textureWidth: card.descriptor.canvas.width, textureHeight: card.descriptor.canvas.height,
          width: card.descriptor.width, height: card.descriptor.height,
          vertices: card.body.geometry.getAttribute('position').count, geometryType: card.body.geometry.type,
          depth: 0.092, bevel: 0.014, color: `#${material.color.getHexString()}`, transmission: material.transmission,
          planeNormal: normal.toArray(), planeRange: { min: planeMin, max: planeMax }, measuredDepth: planeMax - planeMin,
          projectedCenter: { x: bounds.left + (projected.x + 1) * bounds.width / 2, y: bounds.top + (1 - projected.y) * bounds.height / 2 },
        };
      }),
      projectedCenters: this.cards.map(card => {
        const point = card.group.getWorldPosition(new THREE.Vector3()).project(this.camera);
        return { id: card.descriptor.id, kind: card.descriptor.kind, x: bounds.left + (point.x + 1) * bounds.width / 2, y: bounds.top + (1 - point.y) * bounds.height / 2 };
      }),
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.entryRevision++; cancelAnimationFrame(this.frameId); this.observer.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown); this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp); this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    for (const card of this.cards) this.releaseCard(card); this.cards = [];
    this.environment.dispose(); this.renderer.dispose(); this.canvas.remove();
  }

  private makeCard(descriptor: MemoryCardTexture): Card {
    const group = new THREE.Group(); group.name = descriptor.id;
    const { width, height } = descriptor;
    const bodyGeometry = new THREE.ExtrudeGeometry(roundedShape(width - 0.028, height - 0.028, 0.145), { depth: 0.064, steps: 1, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 3, curveSegments: 12 });
    bodyGeometry.translate(0, 0, -0.046);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: descriptor.kind === 'note' ? '#1f5045' : descriptor.kind === 'tasks' ? '#b7cc9f' : '#d9e2cd',
      roughness: descriptor.kind === 'note' ? 0.3 : 0.24, metalness: 0.03, clearcoat: 0.75, clearcoatRoughness: 0.21,
      transmission: descriptor.kind === 'note' ? 0 : 0.16, thickness: 0.05, ior: 1.36, envMapIntensity: 0.7,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial); body.name = `${descriptor.id}:jade-edge`;
    const faceGeometry = new THREE.ShapeGeometry(roundedShape(width - 0.009, height - 0.009, 0.148), 16);
    const positions = faceGeometry.getAttribute('position'), uv = faceGeometry.getAttribute('uv');
    for (let index = 0; index < positions.count; index++) uv.setXY(index, (positions.getX(index) + width / 2) / width, (positions.getY(index) + height / 2) / height);
    uv.needsUpdate = true;
    const texture = new THREE.CanvasTexture(descriptor.canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    // The readable face is unlit; the continuous PBR edge supplies the actual reflected light and depth.
    const front = new THREE.Mesh(faceGeometry, new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    front.name = `${descriptor.id}:actual-content`; front.position.z = 0.034;
    group.add(body, front); this.cardsGroup.add(group);
    const pose = { position: new THREE.Vector3(), rotation: new THREE.Euler() };
    return { descriptor, group, body, front, texture, from: pose, to: { position: new THREE.Vector3(), rotation: new THREE.Euler() } };
  }

  private releaseCard(card: Card): void {
    this.cardsGroup.remove(card.group);
    card.body.geometry.dispose(); (card.body.material as THREE.Material).dispose();
    card.front.geometry.dispose(); (card.front.material as THREE.Material).dispose(); card.texture.dispose();
  }

  private pose(card: Card, index: number, layout: MemoryLayout = this.layout): Pose {
    const mobile = this.width < 620;
    const photos = this.cards.filter(item => item.descriptor.kind === 'photo');
    const hasExtras = this.cards.length > 1;
    if (layout === 'gather') {
      const angle = (index - (this.cards.length - 1) / 2) * 0.105;
      return layeredPose((index - (this.cards.length - 1) / 2) * (mobile ? 0.2 : 0.33), (index - 1) * -0.14, index, angle);
    }
    if (card.descriptor.kind === 'note') return layeredPose(hasExtras ? (mobile ? -0.75 : -1.32) : 0, hasExtras ? (mobile ? 1.15 : 0.13) : 0, 0, -0.038);
    if (card.descriptor.kind === 'tasks') return layeredPose(mobile ? -0.15 : (photos.length ? 1.43 : 1.3), mobile ? -1.5 : -1.04, index, mobile ? 0.032 : -0.055);
    const photoIndex = photos.indexOf(card), depthIndex = photos.length - photoIndex - 1;
    return layeredPose((mobile ? 1.15 : 1.62) + depthIndex * (mobile ? 0.16 : 0.24), (mobile ? -0.35 : 0.51) + depthIndex * 0.1, index, 0.052 + depthIndex * 0.042);
  }

  private arrange(animate: boolean): void {
    this.cards.forEach((card, index) => {
      card.from = { position: card.group.position.clone(), rotation: card.group.rotation.clone() }; card.to = this.pose(card, index);
      if (!animate) {
        card.group.position.copy(card.to.position); card.group.rotation.copy(card.to.rotation);
        card.from = { position: card.to.position.clone(), rotation: card.to.rotation.clone() };
      }
    });
    this.animation = animate ? { began: performance.now(), duration: 560 } : null;
  }

  private resize = (): void => {
    if (this.disposed) return;
    this.width = Math.max(1, this.host.clientWidth); this.height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(this.width, this.height, false); this.camera.aspect = this.width / this.height; this.camera.updateProjectionMatrix();
    this.arrange(false); this.updateCamera(); this.dirty = true;
  };

  private updateCamera(): void {
    const bounds = new THREE.Box3();
    for (const [index, card] of this.cards.entries()) {
      // Both layouts share one stable framing. Animation changes only card transforms,
      // so replacing tween endpoints cannot cause a final-frame camera zoom.
      const halfW = card.descriptor.width / 2 + 0.12, halfH = card.descriptor.height / 2 + 0.18;
      for (const pose of [this.pose(card, index, 'spread'), this.pose(card, index, 'gather')]) {
        bounds.expandByPoint(new THREE.Vector3(pose.position.x - halfW, pose.position.y - halfH, pose.position.z));
        bounds.expandByPoint(new THREE.Vector3(pose.position.x + halfW, pose.position.y + halfH, pose.position.z));
      }
    }
    if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-2.5, -1.9, 0), new THREE.Vector3(2.5, 1.9, 0));
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const tangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const mobile = this.width < 620;
    const margin = mobile ? 1.07 : 1.2;
    const distance = Math.max(size.y / (2 * tangent), size.x / (2 * tangent * this.camera.aspect)) * margin + (mobile ? 0.16 : 0.55);
    const azimuth = 0.075 + this.orbit.x * 0.35, elevation = 0.09 + this.orbit.y * 0.24;
    this.camera.position.set(center.x + Math.sin(azimuth) * distance, center.y + Math.sin(elevation) * distance, center.z + Math.cos(azimuth) * Math.cos(elevation) * distance);
    this.camera.lookAt(center); this.camera.updateMatrixWorld(true);
  }

  private hitCard(event: PointerEvent): Card | undefined {
    if (!this.available || this.animation) return undefined;
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.cards.map(card => card.front), false)[0];
    return hit && this.cards.find(card => card.front === hit.object);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.available) return;
    this.pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, orbit: this.orbitTarget.clone(), card: this.hitCard(event) };
    if (event.pointerType === 'mouse') this.canvas.setPointerCapture(event.pointerId);
  };
  private onPointerMove = (event: PointerEvent): void => {
    const start = this.pointerStart;
    if (!start || start.id !== event.pointerId) { if (event.pointerType === 'mouse') this.canvas.style.cursor = this.hitCard(event) ? 'pointer' : 'grab'; return; }
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) > 7) start.moved = true;
    if (!start.moved) return;
    this.canvas.style.cursor = 'grabbing';
    this.orbitTarget.set(clamp(start.orbit.x - dx / this.width * 2.8, -1, 1), clamp(start.orbit.y + dy / this.height * 2.2, -0.75, 0.75));
    if (this.reduced) this.orbit.copy(this.orbitTarget); this.dirty = true; this.publish(true);
  };
  private onPointerUp = (event: PointerEvent): void => {
    const start = this.pointerStart; this.pointerStart = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.canvas.style.cursor = 'grab';
    if (start?.id === event.pointerId && !start.moved && start.card && this.hitCard(event) === start.card) this.options.onCardSelect(start.card.descriptor.kind);
    this.dirty = true; this.publish(true);
  };
  private onPointerCancel = (): void => { this.pointerStart = null; this.canvas.style.cursor = 'grab'; this.dirty = true; this.publish(true); };
  private onContextLost = (event: Event): void => {
    event.preventDefault(); this.available = false; this.entryRevision++; cancelAnimationFrame(this.frameId); this.publish(true); this.options.onAvailability(false);
  };

  private publish(force = false): void {
    if (this.disposed) return;
    const state = this.state;
    this.canvas.dataset.ready = String(state.ready); this.canvas.dataset.settled = String(state.settled); this.canvas.dataset.layout = this.layout;
    this.canvas.dataset.cardCount = String(state.cards); this.canvas.dataset.frames = String(state.frames); this.canvas.dataset.meshCount = String(state.meshCount);
    this.canvas.dataset.available = String(state.available);
    const key = `${state.ready}|${state.available}|${state.settled}|${state.layout}|${state.cards}|${state.dragging}`;
    if (force || key !== this.published) { this.published = key; this.options.onState?.(state); }
    if (state.ready && state.available && !this.availabilityAnnounced) { this.availabilityAnnounced = true; this.options.onAvailability(true); }
  }

  private render = (now: number): void => {
    if (this.disposed || !this.available) return;
    const delta = Math.min(0.05, (now - (this.lastFrame || now)) / 1000); this.lastFrame = now;
    let animate = false;
    if (this.animation) {
      const progress = clamp((now - this.animation.began) / this.animation.duration, 0, 1), factor = ease(progress);
      for (const card of this.cards) {
        card.group.position.lerpVectors(card.from.position, card.to.position, factor);
        card.group.rotation.set(THREE.MathUtils.lerp(card.from.rotation.x, card.to.rotation.x, factor), THREE.MathUtils.lerp(card.from.rotation.y, card.to.rotation.y, factor), THREE.MathUtils.lerp(card.from.rotation.z, card.to.rotation.z, factor));
      }
      if (progress >= 1) { this.animation = null; for (const card of this.cards) card.from = { position: card.to.position.clone(), rotation: card.to.rotation.clone() }; }
      animate = true;
    }
    if (this.orbit.distanceTo(this.orbitTarget) > 0.001) { this.orbit.lerp(this.orbitTarget, 1 - Math.exp(-delta * 11)); animate = true; }
    if (this.dirty || animate) { this.updateCamera(); this.renderer.render(this.scene, this.camera); this.frames++; this.renderedRevision = this.contentRevision; this.dirty = false; this.publish(); }
    this.frameId = requestAnimationFrame(this.render);
  };
}
