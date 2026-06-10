import {
  ActionManager,
  Animation,
  ArcRotateCamera,
  Color3,
  Engine,
  ExecuteCodeAction,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  type AbstractMesh,
} from '@babylonjs/core';
import type { HierarchyBox, WarehouseHierarchy } from '../../types/warehouse';

const COLORS = {
  bg: '#0f172a',
  primary: '#4f46e5',
  highlight: '#3b82f6',
  success: '#10b981',
  empty: '#334155',
  search: '#818cf8',
};

const BOX_W = 0.35;
const BOX_H = 0.25;
const BOX_D = 0.3;
const BOX_GAP = 0.06;
const LEVEL_HEIGHT = 0.32;

const RACK_TRANSFORMS: Array<{ position: [number, number, number]; rotationY: number }> = [
  { position: [-4.5, 0, 0], rotationY: -Math.PI / 2 },
  { position: [-1.6, 0, 4.5], rotationY: 0 },
  { position: [1.6, 0, 4.5], rotationY: 0 },
  { position: [4.5, 0, 1.6], rotationY: Math.PI / 2 },
  { position: [4.5, 0, -1.6], rotationY: Math.PI / 2 },
];

export interface WarehouseSceneCallbacks {
  onBoxClick: (boxId: number) => void;
}

export interface WarehouseSceneHandle {
  focusBox: (boxId: number, slotId?: number | null) => Promise<void>;
  applyHighlight: (boxId: number, slotId?: number | null) => void;
  clearHighlight: () => void;
  setSearchQuery: (query: string) => void;
  resize: () => void;
}

let engine: Engine | null = null;
let scene: Scene | null = null;
let camera: ArcRotateCamera | null = null;
const boxMeshes = new Map<number, AbstractMesh>();
const boxMaterials = new Map<number, StandardMaterial>();
let highlightedBoxId: number | null = null;
let searchQuery = '';

function hexToColor3(hex: string): Color3 {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  return new Color3(r, g, b);
}

function boxHasProduct(box: HierarchyBox): boolean {
  return box.slots.some((s) => s.product && s.product.qty > 0);
}

function boxMatchesSearch(box: HierarchyBox, query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase();
  if (box.boxCode.toLowerCase().includes(q)) return true;
  return box.slots.some(
    (s) => s.product?.name.toLowerCase().includes(q) || s.product?.name.toLowerCase() === q,
  );
}

function applyMaterialState(boxId: number, box: HierarchyBox): void {
  const mat = boxMaterials.get(boxId);
  if (!mat) return;

  if (highlightedBoxId === boxId) {
    mat.diffuseColor = hexToColor3(COLORS.highlight);
    mat.emissiveColor = hexToColor3(COLORS.highlight).scale(0.45);
  } else if (searchQuery && boxMatchesSearch(box, searchQuery)) {
    mat.diffuseColor = hexToColor3(COLORS.search);
    mat.emissiveColor = hexToColor3(COLORS.search).scale(0.3);
  } else if (boxHasProduct(box)) {
    mat.diffuseColor = hexToColor3(COLORS.success);
    mat.emissiveColor = hexToColor3(COLORS.success).scale(0.15);
  } else {
    mat.diffuseColor = hexToColor3(COLORS.empty);
    mat.emissiveColor = Color3.Black();
  }
}

function refreshAllMaterials(hierarchy: WarehouseHierarchy): void {
  for (const rack of hierarchy.racks) {
    for (const level of rack.levels) {
      for (const box of level.boxes) {
        applyMaterialState(box.id, box);
      }
    }
  }
}

function getMeshWorldPosition(mesh: AbstractMesh): Vector3 {
  return mesh.getAbsolutePosition().clone();
}

async function animateCameraTo(target: Vector3): Promise<void> {
  if (!scene || !camera) return;

  const offset = new Vector3(2.8, 2.2, 2.8);
  const desiredPos = target.add(offset);
  const frameRate = 60;
  const duration = 1.2;
  const totalFrames = Math.round(frameRate * duration);

  const animAlpha = new Animation(
    'camAlpha',
    'alpha',
    frameRate,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );
  const animBeta = new Animation(
    'camBeta',
    'beta',
    frameRate,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );
  const animRadius = new Animation(
    'camRadius',
    'radius',
    frameRate,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );
  const animTargetX = new Animation(
    'camTargetX',
    'target.x',
    frameRate,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );
  const animTargetY = new Animation(
    'camTargetY',
    'target.y',
    frameRate,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );
  const animTargetZ = new Animation(
    'camTargetZ',
    'target.z',
    frameRate,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );

  const desiredAlpha = Math.atan2(desiredPos.x - target.x, desiredPos.z - target.z);
  const distance = Vector3.Distance(desiredPos, target);
  const desiredBeta = Math.acos(
    Math.min(1, Math.max(-1, (desiredPos.y - target.y) / distance)),
  );
  const desiredRadius = Vector3.Distance(desiredPos, target);

  animAlpha.setKeys([
    { frame: 0, value: camera.alpha },
    { frame: totalFrames, value: desiredAlpha },
  ]);
  animBeta.setKeys([
    { frame: 0, value: camera.beta },
    { frame: totalFrames, value: desiredBeta },
  ]);
  animRadius.setKeys([
    { frame: 0, value: camera.radius },
    { frame: totalFrames, value: desiredRadius },
  ]);
  animTargetX.setKeys([
    { frame: 0, value: camera.target.x },
    { frame: totalFrames, value: target.x },
  ]);
  animTargetY.setKeys([
    { frame: 0, value: camera.target.y },
    { frame: totalFrames, value: target.y },
  ]);
  animTargetZ.setKeys([
    { frame: 0, value: camera.target.z },
    { frame: totalFrames, value: target.z },
  ]);

  scene.beginDirectAnimation(
    camera,
    [animAlpha, animBeta, animRadius, animTargetX, animTargetY, animTargetZ],
    0,
    totalFrames,
    false,
    1,
  );

  await new Promise<void>((resolve) => {
    setTimeout(resolve, duration * 1000 + 50);
  });
}

function buildRacks(
  activeScene: Scene,
  hierarchy: WarehouseHierarchy,
  callbacks: WarehouseSceneCallbacks,
): void {
  hierarchy.racks.forEach((rack, rackIndex) => {
    const transform = RACK_TRANSFORMS[rackIndex] ?? {
      position: [rackIndex * 2.5, 0, 0] as [number, number, number],
      rotationY: 0,
    };

    const rackRoot = new TransformNode(`rack-${rack.id}`, activeScene);
    rackRoot.position = new Vector3(...transform.position);
    rackRoot.rotation.y = transform.rotationY;

    const rackLabel = MeshBuilder.CreateBox(
      `rack-base-${rack.id}`,
      { width: 0.08, height: 0.05, depth: 2.4 },
      activeScene,
    );
    rackLabel.position = new Vector3(0, 0.02, 0);
    rackLabel.parent = rackRoot;
    const baseMat = new StandardMaterial(`rack-base-mat-${rack.id}`, activeScene);
    baseMat.diffuseColor = hexToColor3(COLORS.primary);
    baseMat.alpha = 0.35;
    rackLabel.material = baseMat;
    rackLabel.isPickable = false;

    rack.levels.forEach((level) => {
      const levelY = (level.levelNo - 1) * LEVEL_HEIGHT + BOX_H / 2 + 0.05;

      level.boxes.forEach((box, boxIndex) => {
        const posInLevel = box.positionInLevel ?? boxIndex;
        const mesh = MeshBuilder.CreateBox(
          `box-${box.id}`,
          { width: BOX_W, height: BOX_H, depth: BOX_D },
          activeScene,
        );
        mesh.position = new Vector3(posInLevel * (BOX_W + BOX_GAP), levelY, 0);
        mesh.parent = rackRoot;
        mesh.metadata = { boxId: box.id, box, rackName: rack.name, levelNo: level.levelNo };

        const mat = new StandardMaterial(`box-mat-${box.id}`, activeScene);
        mesh.material = mat;
        boxMeshes.set(box.id, mesh);
        boxMaterials.set(box.id, mat);
        applyMaterialState(box.id, box);

        mesh.actionManager = new ActionManager(activeScene);
        mesh.actionManager.registerAction(
          new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
            callbacks.onBoxClick(box.id);
          }),
        );
      });
    });
  });
}

export async function initScene(
  canvas: HTMLCanvasElement,
  hierarchy: WarehouseHierarchy,
  callbacks: WarehouseSceneCallbacks,
): Promise<WarehouseSceneHandle> {
  disposeScene();

  engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  scene = new Scene(engine);
  scene.clearColor = hexToColor3(COLORS.bg).toColor4(1);

  camera = new ArcRotateCamera(
    'camera',
    -Math.PI / 4,
    1.1,
    18,
    new Vector3(0, 1.5, 0),
    scene,
  );
  camera.lowerRadiusLimit = 4;
  camera.upperRadiusLimit = 40;
  camera.wheelPrecision = 20;
  camera.attachControl(canvas, true);

  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 0.9;

  MeshBuilder.CreateGround('ground', { width: 24, height: 24 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = hexToColor3('#1e293b');
  groundMat.specularColor = Color3.Black();
  const ground = scene.getMeshByName('ground');
  if (ground) {
    ground.material = groundMat;
    ground.isPickable = false;
  }

  buildRacks(scene, hierarchy, callbacks);

  engine.runRenderLoop(() => {
    scene?.render();
  });

  const handleResize = () => engine?.resize();
  window.addEventListener('resize', handleResize);

  const hierarchyRef = hierarchy;

  const handle: WarehouseSceneHandle = {
    async focusBox(boxId: number, slotId?: number | null) {
      const mesh = boxMeshes.get(boxId);
      if (!mesh) return;
      highlightedBoxId = boxId;
      refreshAllMaterials(hierarchyRef);
      const pos = getMeshWorldPosition(mesh);
      if (slotId) {
        pos.y += 0.15;
      }
      await animateCameraTo(pos);
    },

    applyHighlight(boxId: number, _slotId?: number | null) {
      highlightedBoxId = boxId;
      refreshAllMaterials(hierarchyRef);
      for (const rack of hierarchyRef.racks) {
        for (const level of rack.levels) {
          for (const box of level.boxes) {
            if (box.id === boxId) {
              applyMaterialState(box.id, box);
            }
          }
        }
      }
    },

    clearHighlight() {
      highlightedBoxId = null;
      refreshAllMaterials(hierarchyRef);
    },

    setSearchQuery(query: string) {
      searchQuery = query.trim();
      refreshAllMaterials(hierarchyRef);
      if (!searchQuery) return;
      for (const rack of hierarchyRef.racks) {
        for (const level of rack.levels) {
          for (const box of level.boxes) {
            if (boxMatchesSearch(box, searchQuery)) {
              void handle.focusBox(box.id);
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

  (engine as Engine & { __vlResizeHandler?: () => void }).__vlResizeHandler = handleResize;

  return handle;
}

export function disposeScene(): void {
  const eng = engine as Engine & { __vlResizeHandler?: () => void };
  if (eng?.__vlResizeHandler) {
    window.removeEventListener('resize', eng.__vlResizeHandler);
  }

  boxMeshes.clear();
  boxMaterials.clear();
  highlightedBoxId = null;
  searchQuery = '';

  scene?.dispose();
  engine?.dispose();
  scene = null;
  engine = null;
  camera = null;
}
