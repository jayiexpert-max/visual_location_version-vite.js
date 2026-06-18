/**
 * 3D warehouse scene — ported from PHP public/layout_3d.php (Babylon.js).
 */
import {
  ActionManager,
  Animation,
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  ExecuteCodeAction,
  HemisphericLight,
  Material,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  type AbstractMesh,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui';
import type { BoxLayout, HierarchyBox, WarehouseHierarchy } from '../../types/warehouse';
import {
  rackSlotGridCells,
  rackSlotPosition3D,
} from '../../utils/rackSlotLayout';

// --- Constants (layout_3d.php) ---
const RACK_WIDTH = 3.0;
const RACK_DEPTH = 1.2;
const LEVEL_HEIGHT = 1.4;
const DEFAULT_BOX_SIZE = 0.8;
const SHELF_THICKNESS = 0.08;

const BOX_COLORS = ['#ef4444', '#22c55e', '#eab308', '#3b82f6', '#ec4899'];

export interface TvHighlightData {
  productName?: string | null;
  puid?: string | null;
  rackName?: string | null;
  levelNo?: number | null;
  boxCode?: string | null;
  boxId?: number;
  slotId?: number | null;
  slotNo?: number | null;
  qty?: number;
  highlightSeq?: string;
}

export interface WarehouseSceneCallbacks {
  fetchBoxLayout: (boxId: number, highlightSlotId?: number) => Promise<BoxLayout>;
  onBoxFocused?: (boxId: number, layout: BoxLayout, highlight: TvHighlightData | null) => void;
  onFocusCleared?: () => void;
}

export interface WarehouseSceneHandle {
  applyTvHighlight: (data: TvHighlightData) => Promise<void>;
  clearHighlight: () => void;
  resetCamera: () => void;
  setSearchQuery: (query: string) => void;
  resize: () => void;
}

interface BoxMetadata {
  type: 'box';
  id: number;
  code: string;
  rack: string;
  level: number;
  layout: string;
  size: number;
  originalEmissive: Color3;
}

interface SlotMeshData {
  id: number;
  slot_no: number;
  highlight: boolean;
  name: string | null;
  qty: number;
  puids?: string[];
}

let engine: Engine | null = null;
let scene: Scene | null = null;
let camera: ArcRotateCamera | null = null;
let initialCameraState: {
  alpha: number;
  beta: number;
  radius: number;
  target: Vector3;
  position: Vector3;
} | null = null;

const boxMeshes = new Map<number, AbstractMesh>();
let currentFocusBox: AbstractMesh | null = null;
let originalBoxPosition: Vector3 | null = null;
let activeBlocks: AbstractMesh[] = [];
let activeBouncingSphere: AbstractMesh | null = null;
let lastHighlightData: TvHighlightData | null = null;
let hierarchyRef: WarehouseHierarchy | null = null;
let callbacksRef: WarehouseSceneCallbacks | null = null;

function colorFromHex(hex: string): Color3 {
  return Color3.FromHexString(hex);
}

function layoutToSlotsArray(layout: BoxLayout, highlightSlotId?: number): SlotMeshData[] {
  const maxSlot = Math.max(...layout.cells.map((c) => c.slotNo), 0);
  const arr: SlotMeshData[] = Array.from({ length: maxSlot }, (_, i) => ({
    id: 0,
    slot_no: i + 1,
    highlight: false,
    name: null,
    qty: 0,
    puids: [],
  }));

  for (const cell of layout.cells) {
    const idx = cell.slotNo - 1;
    if (idx < 0) continue;
    arr[idx] = {
      id: cell.slotId,
      slot_no: cell.slotNo,
      highlight: cell.highlighted || (highlightSlotId != null && cell.slotId === highlightSlotId),
      name: cell.product?.name ?? null,
      qty: cell.product?.qty ?? 0,
      puids: cell.puids ?? [],
    };
  }

  return arr;
}

function getRackTransform(rIndex: number): { xPos: number; zPos: number; yRot: number } {
  if (rIndex === 0) return { xPos: -4.5, zPos: 0, yRot: -Math.PI / 2 };
  if (rIndex === 1) return { xPos: -1.6, zPos: 4.5, yRot: 0 };
  if (rIndex === 2) return { xPos: 1.6, zPos: 4.5, yRot: 0 };
  if (rIndex === 3) return { xPos: 4.5, zPos: 1.6, yRot: Math.PI / 2 };
  if (rIndex === 4) return { xPos: 4.5, zPos: -1.6, yRot: Math.PI / 2 };
  return { xPos: -10 + rIndex * 4, zPos: -10, yRot: 0 };
}

function createLabelPlane(
  parent: TransformNode,
  name: string,
  text: string,
  rotationY: number,
  width: number,
  height: number,
  fontSize: number,
  color: string,
  outlineColor: string,
): void {
  if (!scene) return;
  const plane = MeshBuilder.CreatePlane(name, { width, height }, scene);
  plane.parent = parent;
  plane.rotation.y = rotationY;
  plane.isPickable = false;

  const adt = AdvancedDynamicTexture.CreateForMesh(plane, 512, 256);
  const block = new TextBlock();
  block.text = text;
  block.color = color;
  block.fontSize = fontSize;
  block.fontWeight = 'bold';
  block.outlineWidth = 5;
  block.outlineColor = outlineColor;
  adt.addControl(block);
}

function createBoxCodeLabel(parent: AbstractMesh, boxCode: string, boxScale: number): void {
  if (!scene) return;
  const labelPlane = MeshBuilder.CreatePlane(`boxLabel-${parent.name}`, {
    width: boxScale * 0.8,
    height: boxScale * 0.8,
  }, scene);
  labelPlane.parent = parent;
  labelPlane.position = new Vector3(0, 0, -(boxScale / 2) - 0.01);
  labelPlane.isPickable = false;

  const adt = AdvancedDynamicTexture.CreateForMesh(labelPlane, 512, 512);
  const block = new TextBlock();
  block.text = boxCode;
  block.color = 'white';
  block.fontSize = 180;
  block.fontWeight = 'bold';
  block.outlineWidth = 8;
  block.outlineColor = 'black';
  adt.addControl(block);
}

function buildRacks(activeScene: Scene, hierarchy: WarehouseHierarchy): void {
  const rackMat = new StandardMaterial('rackMat', activeScene);
  rackMat.diffuseColor = new Color3(0.3, 0.35, 0.4);

  const shelfMat = new StandardMaterial('shelfMat', activeScene);
  shelfMat.diffuseColor = new Color3(0.5, 0.55, 0.6);

  const rackBoxMats = BOX_COLORS.map((hex, idx) => {
    const mat = new StandardMaterial(`boxMatRack-${idx}`, activeScene);
    const color = colorFromHex(hex);
    mat.diffuseColor = color;
    mat.emissiveColor = color.scale(0.2);
    mat.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
    mat.alpha = 1;
    return mat;
  });

  const defaultBoxMat = new StandardMaterial('boxMatDefault', activeScene);
  defaultBoxMat.diffuseColor = new Color3(0.2, 0.4, 0.8);
  defaultBoxMat.emissiveColor = new Color3(0.05, 0.1, 0.2);
  defaultBoxMat.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;

  hierarchy.racks.forEach((rack, rIndex) => {
    const { xPos, zPos, yRot } = getRackTransform(rIndex);
    const rackRoot = new TransformNode(`rackRoot-${rack.id}`, activeScene);
    rackRoot.position = new Vector3(xPos, 0, zPos);
    rackRoot.rotation.y = yRot;

    const maxLevels = rack.levels.length;
    const rackHeight = maxLevels * LEVEL_HEIGHT;
    const poleHeight = rackHeight + 0.5;

    for (const px of [-RACK_WIDTH / 2, RACK_WIDTH / 2]) {
      for (const pz of [-RACK_DEPTH / 2, RACK_DEPTH / 2]) {
        const pole = MeshBuilder.CreateBox(`pole-${rack.id}-${px}-${pz}`, {
          height: poleHeight,
          width: 0.1,
          depth: 0.1,
        }, activeScene);
        pole.parent = rackRoot;
        pole.position = new Vector3(px, poleHeight / 2, pz);
        pole.material = rackMat;
        pole.isPickable = false;
      }
    }

    const topCover = MeshBuilder.CreateBox(`topCover-${rack.id}`, {
      width: RACK_WIDTH,
      height: SHELF_THICKNESS,
      depth: RACK_DEPTH,
    }, activeScene);
    topCover.parent = rackRoot;
    topCover.position = new Vector3(0, rackHeight, 0);
    topCover.material = shelfMat;
    topCover.isPickable = false;

    const labelRoot = new TransformNode(`labelRoot-${rack.id}`, activeScene);
    labelRoot.parent = rackRoot;
    labelRoot.position = new Vector3(0, poleHeight + 0.8, 0);
    createLabelPlane(labelRoot, `rackLabel1-${rack.id}`, rack.name, 0, 3, 1.5, 140, '#00f2fe', '#3b82f6');
    createLabelPlane(labelRoot, `rackLabel2-${rack.id}`, rack.name, Math.PI / 2, 3, 1.5, 140, '#00f2fe', '#3b82f6');

    rack.levels.forEach((level, lIndex) => {
      const yPos = (maxLevels - lIndex) * LEVEL_HEIGHT - LEVEL_HEIGHT / 2;

      const shelf = MeshBuilder.CreateBox(`shelf-${rack.id}-${level.id}`, {
        width: RACK_WIDTH,
        height: SHELF_THICKNESS,
        depth: RACK_DEPTH,
      }, activeScene);
      shelf.parent = rackRoot;
      shelf.position = new Vector3(0, yPos - LEVEL_HEIGHT / 2 + SHELF_THICKNESS / 2, 0);
      shelf.material = shelfMat;
      shelf.isPickable = false;

      const boxCount = level.boxes.length;
      if (boxCount === 0) return;

      const availableWidth = RACK_WIDTH - 0.2;
      const widthPerBox = availableWidth / boxCount;
      const boxScale = Math.min(DEFAULT_BOX_SIZE, widthPerBox * 0.9);
      const startBoxX = -(RACK_WIDTH / 2) + 0.1;

      level.boxes.forEach((box: HierarchyBox, bIndex: number) => {
        const bX = startBoxX + bIndex * widthPerBox + widthPerBox / 2;
        const shelfY = yPos - LEVEL_HEIGHT / 2 + SHELF_THICKNESS / 2;
        const bY = shelfY + SHELF_THICKNESS / 2 + boxScale / 2;

        const boxMesh = MeshBuilder.CreateBox(`box-${box.id}`, {
          width: boxScale,
          height: boxScale,
          depth: boxScale,
        }, activeScene);

        boxMesh.parent = rackRoot;
        boxMesh.position = new Vector3(bX, bY, 0);

        const baseMat = rIndex < rackBoxMats.length ? rackBoxMats[rIndex] : defaultBoxMat;
        const boxMat = baseMat.clone(`boxMat-${box.id}`);
        boxMesh.material = boxMat;

        createBoxCodeLabel(boxMesh, box.boxCode, boxScale);

        const meta: BoxMetadata = {
          type: 'box',
          id: box.id,
          code: box.boxCode,
          rack: rack.name,
          level: level.levelNo,
          layout: box.layout || '1x1',
          size: boxScale,
          originalEmissive: baseMat.emissiveColor.clone(),
        };
        boxMesh.metadata = meta;
        boxMeshes.set(box.id, boxMesh);

        boxMesh.actionManager = new ActionManager(activeScene);
        boxMesh.actionManager.registerAction(
          new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, (ev) => {
            const src = ev.source as AbstractMesh;
            if (currentFocusBox !== boxMesh && src?.material) {
              (src.material as StandardMaterial).emissiveColor = new Color3(0.4, 0.4, 0.6);
              document.body.style.cursor = 'pointer';
            }
          }),
        );
        boxMesh.actionManager.registerAction(
          new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, (ev) => {
            const src = ev.source as AbstractMesh;
            if (currentFocusBox !== boxMesh && src?.material) {
              const m = src.metadata as BoxMetadata;
              (src.material as StandardMaterial).emissiveColor =
                m?.originalEmissive ?? new Color3(0.05, 0.1, 0.2);
              document.body.style.cursor = 'default';
            }
          }),
        );
        boxMesh.actionManager.registerAction(
          new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
            if (currentFocusBox === boxMesh) {
              resetFocus();
            } else {
              void focusBox(boxMesh);
            }
          }),
        );
      });
    });
  });
}

function disposeActiveBlocks(): void {
  for (const m of activeBlocks) {
    m.dispose();
  }
  activeBlocks = [];
  if (activeBouncingSphere) {
    activeBouncingSphere.dispose();
    activeBouncingSphere = null;
  }
}

function resetFocusInstant(): void {
  disposeActiveBlocks();

  if (currentFocusBox && originalBoxPosition) {
    currentFocusBox.position = originalBoxPosition.clone();
    const mat = currentFocusBox.material as StandardMaterial | null;
    if (mat) {
      mat.alpha = 1;
      const meta = currentFocusBox.metadata as BoxMetadata;
      mat.emissiveColor = meta?.originalEmissive ?? new Color3(0.05, 0.1, 0.2);
    }
    currentFocusBox = null;
    originalBoxPosition = null;
  }
}

function resetFocus(): void {
  disposeActiveBlocks();

  if (currentFocusBox && originalBoxPosition && scene) {
    Animation.CreateAndStartAnimation(
      'animBack',
      currentFocusBox,
      'position',
      60,
      40,
      currentFocusBox.position,
      originalBoxPosition,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    const mat = currentFocusBox.material as StandardMaterial | null;
    if (mat) {
      mat.alpha = 1;
      const meta = currentFocusBox.metadata as BoxMetadata;
      mat.emissiveColor = meta?.originalEmissive ?? new Color3(0.05, 0.1, 0.2);
    }
    currentFocusBox = null;
    originalBoxPosition = null;
  }

  lastHighlightData = null;
  callbacksRef?.onFocusCleared?.();
}

function createBouncingIndicator(targetMesh: AbstractMesh, slotNo: number): void {
  if (!scene) return;
  if (activeBouncingSphere) activeBouncingSphere.dispose();

  const sphere = MeshBuilder.CreateSphere('ind', { diameter: 0.2 }, scene);
  if (targetMesh.parent) sphere.parent = targetMesh.parent;
  sphere.position = targetMesh.position.clone();
  sphere.position.y += 0.35;

  const mat = new StandardMaterial('indMat', scene);
  mat.diffuseColor = new Color3(1, 0.4, 0);
  mat.emissiveColor = new Color3(1, 0.2, 0);
  sphere.material = mat;

  const labelPlane = MeshBuilder.CreatePlane('ballLabel', { size: 0.35 }, scene);
  labelPlane.parent = sphere;
  labelPlane.position = new Vector3(0, 0.15, 0);
  labelPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;

  const adt = AdvancedDynamicTexture.CreateForMesh(labelPlane);
  const txt = new TextBlock();
  txt.text = String(slotNo);
  txt.color = 'black';
  txt.fontSize = 240;
  txt.fontWeight = 'bold';
  adt.addControl(txt);

  const baseY = sphere.position.y;
  const anim = new Animation(
    'float',
    'position.y',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  anim.setKeys([
    { frame: 0, value: baseY },
    { frame: 20, value: baseY + 0.25 },
    { frame: 40, value: baseY },
  ]);
  sphere.animations = [anim];
  scene.beginAnimation(sphere, 0, 40, true);

  activeBouncingSphere = sphere;
}

function generateSlotMeshes(
  parentBox: AbstractMesh,
  layoutStr: string,
  slotsData: SlotMeshData[],
  highlightSlotId: number | null | undefined,
  boxSize: number,
): void {
  if (!scene) return;
  disposeActiveBlocks();

  const innerSize = boxSize * 0.96;
  const cells = rackSlotGridCells(layoutStr, slotsData.length);

  const emptyMat = new StandardMaterial('emptyMat', scene);
  emptyMat.diffuseColor = new Color3(0.05, 0.05, 0.1);
  emptyMat.alpha = 0.8;

  const filledMat = new StandardMaterial('filledMat', scene);
  filledMat.diffuseColor = new Color3(0, 0.9, 0.5);

  const hlMat = new StandardMaterial('hlMat', scene);
  hlMat.diffuseColor = new Color3(1, 0.7, 0);

  const containerFrame = MeshBuilder.CreateBox('frame', {
    width: boxSize,
    height: boxSize,
    depth: boxSize,
  }, scene);
  containerFrame.parent = parentBox;
  containerFrame.position = Vector3.Zero();
  const frameMat = new StandardMaterial('frameMat', scene);
  frameMat.wireframe = true;
  frameMat.emissiveColor = new Color3(0.5, 0.5, 0.5);
  frameMat.alpha = 0.1;
  containerFrame.material = frameMat;
  activeBlocks.push(containerFrame);

  for (const cell of cells) {
    const slotData = slotsData[cell.slotIndex];
    const pos = rackSlotPosition3D(cell.col, cell.visRow, cell.gridCols, cell.gridRows, innerSize);

    const slotMesh = MeshBuilder.CreateBox('slot', {
      width: pos.cellW * 0.9,
      depth: pos.cellD * 0.9,
      height: boxSize * 0.8,
    }, scene);

    slotMesh.parent = parentBox;
    slotMesh.position = new Vector3(pos.x, 0, pos.z);

    if (slotData?.name) {
      slotMesh.material = filledMat;
    } else {
      slotMesh.material = emptyMat;
      slotMesh.scaling.y = 0.05;
      slotMesh.position.y -= boxSize * 0.38;
    }

    if (
      slotData &&
      (slotData.highlight ||
        (highlightSlotId != null && slotData.id === highlightSlotId))
    ) {
      slotMesh.material = hlMat;
      createBouncingIndicator(slotMesh, slotData.slot_no);
    }

    activeBlocks.push(slotMesh);
  }
}

async function showSlotsOnBox(mesh: AbstractMesh, highlightSlotId?: number | null): Promise<void> {
  const meta = mesh.metadata as BoxMetadata;
  if (!callbacksRef) return;

  try {
    const layout = await callbacksRef.fetchBoxLayout(meta.id, highlightSlotId ?? undefined);
    const slotsData = layoutToSlotsArray(layout, highlightSlotId ?? undefined);
    generateSlotMeshes(mesh, meta.layout, slotsData, highlightSlotId, meta.size);
    callbacksRef.onBoxFocused?.(meta.id, layout, lastHighlightData);
  } catch (err) {
    console.error('Error fetching box layout', err);
  }
}

function focusBox(mesh: AbstractMesh, highlightSlotId: number | null = null): Promise<void> {
  return new Promise((resolve) => {
    if (!scene || !camera) {
      resolve();
      return;
    }

    if (currentFocusBox && currentFocusBox !== mesh) {
      disposeActiveBlocks();
      if (originalBoxPosition) {
        currentFocusBox.position = originalBoxPosition.clone();
        const mat = currentFocusBox.material as StandardMaterial;
        mat.alpha = 1;
        const m = currentFocusBox.metadata as BoxMetadata;
        mat.emissiveColor = m.originalEmissive;
      }
      currentFocusBox = null;
      originalBoxPosition = null;
    }

    if (!mesh) {
      resolve();
      return;
    }

    if (currentFocusBox === mesh && highlightSlotId) {
      void showSlotsOnBox(mesh, highlightSlotId).then(() => resolve());
      return;
    }

    if (currentFocusBox === mesh) {
      resolve();
      return;
    }

    if (!currentFocusBox) {
      // camera state saved implicitly — reset uses initialCameraState
    }

    currentFocusBox = mesh;
    originalBoxPosition = mesh.position.clone();

    const targetPosLocal = originalBoxPosition.clone();
    targetPosLocal.z -= 1.6;

    const rackRoot = mesh.parent as TransformNode | null;
    const rotY = rackRoot?.rotation.y ?? 0;
    const worldTarget = mesh.getAbsolutePosition().clone();

    let targetAlpha = camera.alpha;
    const targetBeta = Math.PI / 3;

    if (Math.abs(rotY) < 0.1) {
      targetAlpha = -Math.PI / 2;
    } else if (rotY < -0.5) {
      targetAlpha = 0;
    } else {
      targetAlpha = -Math.PI;
    }

    while (targetAlpha - camera.alpha > Math.PI) targetAlpha -= 2 * Math.PI;
    while (targetAlpha - camera.alpha < -Math.PI) targetAlpha += 2 * Math.PI;

    const animTarget = new Animation(
      'animTarget',
      'target',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    animTarget.setKeys([
      { frame: 0, value: camera.target.clone() },
      { frame: 80, value: worldTarget },
    ]);

    const animAlpha = new Animation(
      'animAlpha',
      'alpha',
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    animAlpha.setKeys([
      { frame: 0, value: camera.alpha },
      { frame: 80, value: targetAlpha },
    ]);

    const animBeta = new Animation(
      'animBeta',
      'beta',
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    animBeta.setKeys([
      { frame: 0, value: camera.beta },
      { frame: 80, value: targetBeta },
    ]);

    const animRadius = new Animation(
      'animRadius',
      'radius',
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    animRadius.setKeys([
      { frame: 0, value: camera.radius },
      { frame: 80, value: 5.5 },
    ]);

    const mat = mesh.material as StandardMaterial;
    mat.emissiveColor = new Color3(0.3, 0.3, 0.6);
    mat.alpha = 0.2;

    scene.beginDirectAnimation(
      camera,
      [animTarget, animAlpha, animBeta, animRadius],
      0,
      80,
      false,
      1,
      () => {
        Animation.CreateAndStartAnimation(
          'animOut',
          mesh,
          'position',
          60,
          40,
          mesh.position,
          targetPosLocal,
          Animation.ANIMATIONLOOPMODE_CONSTANT,
          undefined,
          () => {
            void showSlotsOnBox(mesh, highlightSlotId).then(() => resolve());
          },
        );
      },
    );
  });
}

function resetCamera(): void {
  resetFocus();

  if (camera && initialCameraState && scene) {
    const animSpeed = 90;
    Animation.CreateAndStartAnimation(
      'camAlpha',
      camera,
      'alpha',
      60,
      animSpeed,
      camera.alpha,
      initialCameraState.alpha,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    Animation.CreateAndStartAnimation(
      'camBeta',
      camera,
      'beta',
      60,
      animSpeed,
      camera.beta,
      initialCameraState.beta,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    Animation.CreateAndStartAnimation(
      'camRadius',
      camera,
      'radius',
      60,
      animSpeed,
      camera.radius,
      initialCameraState.radius,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    Animation.CreateAndStartAnimation(
      'camTarget',
      camera,
      'target',
      60,
      animSpeed,
      camera.target,
      initialCameraState.target,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
  }
}

function boxMatchesSearch(box: HierarchyBox, query: string): boolean {
  const q = query.toLowerCase();
  if (box.boxCode.toLowerCase().includes(q)) return true;
  return box.slots.some(
    (s) => s.product?.name.toLowerCase().includes(q) || s.product?.name.toLowerCase() === q,
  );
}

export async function initScene(
  canvas: HTMLCanvasElement,
  hierarchy: WarehouseHierarchy,
  callbacks: WarehouseSceneCallbacks,
): Promise<WarehouseSceneHandle> {
  disposeScene();

  hierarchyRef = hierarchy;
  callbacksRef = callbacks;

  engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  scene = new Scene(engine);
  scene.clearColor = new Color4(220 / 255, 225 / 255, 235 / 255, 1);

  camera = new ArcRotateCamera(
    'camera',
    -Math.PI / 2,
    Math.PI / 2.5,
    20,
    new Vector3(0, 3, 2),
    scene,
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 2;
  camera.upperRadiusLimit = 80;
  camera.wheelPrecision = 50;

  initialCameraState = {
    alpha: camera.alpha,
    beta: camera.beta,
    radius: camera.radius,
    target: camera.target.clone(),
    position: camera.position.clone(),
  };

  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 0.8;

  buildRacks(scene, hierarchy);

  engine.runRenderLoop(() => {
    scene?.render();
  });

  const handleResize = () => engine?.resize();
  window.addEventListener('resize', handleResize);
  (engine as Engine & { __vlResizeHandler?: () => void }).__vlResizeHandler = handleResize;

  const handle: WarehouseSceneHandle = {
    async applyTvHighlight(data: TvHighlightData) {
      lastHighlightData = data;
      const boxId = data.boxId;
      if (!boxId) return;
      const mesh = boxMeshes.get(boxId);
      if (!mesh) return;
      resetFocusInstant();
      await focusBox(mesh, data.slotId ?? null);
    },

    clearHighlight() {
      lastHighlightData = null;
      resetFocus();
    },

    resetCamera() {
      resetCamera();
    },

    setSearchQuery(query: string) {
      const q = query.trim();
      if (!q || !hierarchyRef) return;
      for (const rack of hierarchyRef.racks) {
        for (const level of rack.levels) {
          for (const box of level.boxes) {
            if (boxMatchesSearch(box, q)) {
              const mesh = boxMeshes.get(box.id);
              if (mesh) void focusBox(mesh);
              return;
            }
          }
        }
      }
    },

    resize() {
      engine?.resize();
    },
  };

  return handle;
}

export function disposeScene(): void {
  const eng = engine as Engine & { __vlResizeHandler?: () => void };
  if (eng?.__vlResizeHandler) {
    window.removeEventListener('resize', eng.__vlResizeHandler);
  }

  resetFocusInstant();
  boxMeshes.clear();
  hierarchyRef = null;
  callbacksRef = null;
  lastHighlightData = null;
  originalBoxPosition = null;
  initialCameraState = null;

  scene?.dispose();
  engine?.dispose();
  scene = null;
  engine = null;
  camera = null;
}
