import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { PieceInfo, LoadedIFCResult } from '@/lib/ifc/ifcLoaderService';
import { ViewCube } from './ViewCube';
import { Viewer3DToolbar } from './Viewer3DToolbar';
import { PieceHoverTooltip } from './PieceHoverTooltip';

interface ProductionPieceStatus {
  marca: string;
  fase: string;
  totalQtd: number;
  pointedQtd: number;
  currentProcessName?: string;
  processColor?: string;
}

interface ModelViewer3DProps {
  modelData: LoadedIFCResult | null;
  productionData?: Map<string, ProductionPieceStatus>;
  selectedPieceMark?: string | null;
  onSelectPiece?: (piece: PieceInfo | null) => void;
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  modelData,
  productionData,
  selectedPieceMark,
  onSelectPiece,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const perspCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mousePosRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Tool states
  const [opacity, setOpacity] = useState<number>(100);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isOrthographic, setIsOrthographic] = useState<boolean>(false);
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [navMode, setNavMode] = useState<'orbit' | 'walk'>('orbit');
  const [colorMode, setColorMode] = useState<'description' | 'production'>('production');
  const [hasSectionPlanes, setHasSectionPlanes] = useState<boolean>(false);
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);

  // Hover Tooltip States (1.5 seconds)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [hoveredPiece, setHoveredPiece] = useState<PieceInfo | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Highlight Material (Light Green #4ade80)
  const highlightMaterialRef = useRef<THREE.MeshStandardMaterial>(
    new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      emissive: 0x22c55e,
      emissiveIntensity: 0.35,
      metalness: 0.3,
      roughness: 0.4,
      side: THREE.DoubleSide,
    })
  );

  // Initialize Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    sceneRef.current = scene;

    // 2. Cameras
    const perspCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    perspCamera.position.set(50, 40, 60);
    perspCameraRef.current = perspCamera;

    const frustumSize = 80;
    const aspect = width / height;
    const orthoCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      2000
    );
    orthoCamera.position.copy(perspCamera.position);
    orthoCameraRef.current = orthoCamera;

    activeCameraRef.current = perspCamera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(perspCamera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1500;
    controls.minDistance = 1;
    controlsRef.current = controls;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(100, 200, 100);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x94a3b8, 0.6);
    dirLight2.position.set(-100, -50, -100);
    scene.add(dirLight2);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.5);
    scene.add(hemiLight);

    // 6. Floor Grid
    const grid = new THREE.GridHelper(200, 100, 0x06b6d4, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);
    gridHelperRef.current = grid;

    // 7. Render Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      if (rendererRef.current && sceneRef.current && activeCameraRef.current) {
        rendererRef.current.render(sceneRef.current, activeCameraRef.current);
      }
    };
    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      perspCamera.aspect = w / h;
      perspCamera.updateProjectionMatrix();

      const newAspect = w / h;
      orthoCamera.left = (frustumSize * newAspect) / -2;
      orthoCamera.right = (frustumSize * newAspect) / 2;
      orthoCamera.top = frustumSize / 2;
      orthoCamera.bottom = frustumSize / -2;
      orthoCamera.updateProjectionMatrix();

      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update Model in Scene
  useEffect(() => {
    if (!sceneRef.current || !modelData) return;

    // Remove old model if present
    if (modelGroupRef.current) {
      sceneRef.current.remove(modelGroupRef.current);
      modelGroupRef.current = null;
    }

    const group = modelData.sceneGroup;
    modelGroupRef.current = group;
    sceneRef.current.add(group);

    // Fit View (Center Model)
    fitModelToView(group);
  }, [modelData]);

  // Function: Fit Model to View
  const fitModelToView = useCallback((group?: THREE.Group | null) => {
    const targetGroup = group || modelGroupRef.current;
    if (!targetGroup || !activeCameraRef.current || !controlsRef.current) return;

    const box = new THREE.Box3().setFromObject(targetGroup);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const fov = 45 * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
    cameraZ = Math.max(cameraZ, 20);

    const camera = activeCameraRef.current;
    camera.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.5, center.z + cameraZ * 0.7);
    camera.lookAt(center);

    controlsRef.current.target.copy(center);
    controlsRef.current.update();

    if (gridHelperRef.current) {
      gridHelperRef.current.position.y = box.min.y;
    }
  }, []);

  // Color Mode & Proportional Apontamentos Application
  useEffect(() => {
    if (!modelData || !modelGroupRef.current) return;

    const group = modelGroupRef.current;

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const pmark = String(mesh.userData.pieceMark || '').trim();
        const cleanMark = String(mesh.userData.cleanMark || pmark).trim();

        if (colorMode === 'production' && productionData) {
          // Look up production pointing status: tenta pmark, depois cleanMark, depois busca flexível
          let prod = productionData.get(pmark) || productionData.get(cleanMark);
          if (!prod) {
            for (const [key, val] of productionData.entries()) {
              if (
                pmark === key ||
                cleanMark === key ||
                pmark === val.marca ||
                cleanMark === val.marca ||
                pmark.endsWith(`-${key}`) ||
                pmark.endsWith(`-${val.marca}`) ||
                key.endsWith(`-${pmark}`) ||
                key.endsWith(`-${cleanMark}`)
              ) {
                prod = val;
                break;
              }
            }
          }

          // Debug log (primeiras 10 peças para validação no console)
          if ((window as any)._debugIfcColors === undefined) (window as any)._debugIfcColors = 0;
          if ((window as any)._debugIfcColors < 10) {
            console.log(
              `[IFC Color Debug] IFC pmark: "${pmark}" (clean: "${cleanMark}") -> DB match:`,
              prod
                ? `ACHOU! Marca DB: "${prod.marca}", Apontadas: ${prod.pointedQtd}/${prod.totalQtd}, Processo: "${prod.currentProcessName}", Cor: ${prod.processColor}`
                : `NÃO ACHOU. Chaves DB disponíveis: ${Array.from(productionData.keys()).slice(0, 8).join(', ')}...`
            );
            (window as any)._debugIfcColors++;
          }

          if (prod && prod.pointedQtd > 0) {
            // Peça apontada: aplica a cor do estágio de fabricação
            const stageHex = prod.processColor || '#10b981';
            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(stageHex),
              metalness: 0.35,
              roughness: 0.45,
              side: THREE.DoubleSide,
            });
          } else {
            // Não apontada / Pendente: Cinza claro padrão industrial
            mesh.material = new THREE.MeshStandardMaterial({
              color: 0x94a3b8,
              metalness: 0.25,
              roughness: 0.65,
              transparent: opacity < 100,
              opacity: opacity / 100,
              side: THREE.DoubleSide,
            });
          }
        } else {
          // Color Mode "Descrição" (Palette by Profile/Section)
          const colorKey = mesh.userData.colorKey;
          const cachedMat = modelData.materialsByColor.get(colorKey);
          if (cachedMat) {
            mesh.material = cachedMat;
          }
        }

        // Apply Opacity & Wireframe
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            m.transparent = opacity < 100;
            m.opacity = opacity / 100;
            if ('wireframe' in m) (m as any).wireframe = isWireframe;
          });
        } else if (mesh.material) {
          mesh.material.transparent = opacity < 100;
          mesh.material.opacity = opacity / 100;
          if ('wireframe' in mesh.material) (mesh.material as any).wireframe = isWireframe;
        }
      }
    });
  }, [modelData, colorMode, productionData, opacity, isWireframe]);

  // Camera Toggle (Ortogonal / Perspectiva)
  const handleToggleCamera = useCallback(() => {
    if (!perspCameraRef.current || !orthoCameraRef.current || !controlsRef.current) return;

    const nextOrtho = !isOrthographic;
    setIsOrthographic(nextOrtho);

    const prevCamera = activeCameraRef.current!;
    const nextCamera = nextOrtho ? orthoCameraRef.current : perspCameraRef.current;

    nextCamera.position.copy(prevCamera.position);
    nextCamera.quaternion.copy(prevCamera.quaternion);

    activeCameraRef.current = nextCamera;
    controlsRef.current.object = nextCamera;
    controlsRef.current.update();
  }, [isOrthographic]);

  // ViewCube Direction Switcher
  const handleViewCubeSelect = useCallback(
    (view: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'iso') => {
      if (!controlsRef.current || !activeCameraRef.current) return;
      const target = controlsRef.current.target;
      const camera = activeCameraRef.current;
      const distance = camera.position.distanceTo(target);

      const newPos = target.clone();
      switch (view) {
        case 'top':
          newPos.y += distance;
          break;
        case 'bottom':
          newPos.y -= distance;
          break;
        case 'front':
          newPos.z += distance;
          break;
        case 'back':
          newPos.z -= distance;
          break;
        case 'left':
          newPos.x -= distance;
          break;
        case 'right':
          newPos.x += distance;
          break;
        case 'iso':
          newPos.x += distance * 0.7;
          newPos.y += distance * 0.5;
          newPos.z += distance * 0.7;
          break;
      }

      camera.position.copy(newPos);
      camera.lookAt(target);
      controlsRef.current.update();
    },
    []
  );

  // Fullscreen Toggle
  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // 1.5-Second Hover Detection
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !activeCameraRef.current || !modelGroupRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    mousePosRef.current.set(mouseX, mouseY);

    // Clear previous timer on movement
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredPiece(null);
    setHoverPosition(null);

    // Set 1.5s delay timer for stable hover
    const clientX = e.clientX;
    const clientY = e.clientY;

    hoverTimerRef.current = setTimeout(() => {
      raycasterRef.current.setFromCamera(mousePosRef.current, activeCameraRef.current!);
      const intersects = raycasterRef.current.intersectObjects(modelGroupRef.current!.children, true);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const expressID = hitMesh.userData.expressID;
        const pmark = hitMesh.userData.pieceMark;

        if (modelData && expressID) {
          const piece = modelData.pieceByExpressID.get(expressID) || {
            expressID,
            guid: '',
            name: hitMesh.userData.section || 'Peça',
            type: 'PIECE',
            pieceMark: pmark,
            section: hitMesh.userData.section,
          };
          setHoveredPiece(piece);
          setHoverPosition({ x: clientX, y: clientY });
        }
      }
    }, 1500); // 1.5 seconds exact requirement
  };

  const handlePointerLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredPiece(null);
    setHoverPosition(null);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-full min-h-[600px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none"
    >
      {/* Top Right: Interactive ViewCube */}
      <div className="absolute top-4 right-4 z-20">
        <ViewCube onSelectView={handleViewCubeSelect} />
      </div>

      {/* Hover Tooltip (1.5s delay trigger) */}
      <PieceHoverTooltip
        piece={hoveredPiece}
        position={hoverPosition}
        productionInfo={
          hoveredPiece?.pieceMark && productionData
            ? {
                pointedQty: productionData.get(hoveredPiece.pieceMark)?.pointedQtd,
                totalQty: productionData.get(hoveredPiece.pieceMark)?.totalQtd,
                currentStage: productionData.get(hoveredPiece.pieceMark)?.currentProcessName,
                stageColor: productionData.get(hoveredPiece.pieceMark)?.processColor,
              }
            : undefined
        }
      />

      {/* Bottom Floating Toolbar */}
      <div className="absolute bottom-4 left-4 right-4 z-20 max-w-5xl mx-auto">
        <Viewer3DToolbar
          opacity={opacity}
          onOpacityChange={setOpacity}
          showGrid={showGrid}
          onToggleGrid={() => {
            setShowGrid(!showGrid);
            if (gridHelperRef.current) gridHelperRef.current.visible = !showGrid;
          }}
          isOrthographic={isOrthographic}
          onToggleCamera={handleToggleCamera}
          isWireframe={isWireframe}
          onToggleWireframe={() => setIsWireframe(!isWireframe)}
          navMode={navMode}
          onNavModeChange={setNavMode}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          onFitView={() => fitModelToView()}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleSectionPlanes={() => setHasSectionPlanes(!hasSectionPlanes)}
          onToggleMeasure={() => setIsMeasuring(!isMeasuring)}
          hasSectionPlanes={hasSectionPlanes}
          isMeasuring={isMeasuring}
        />
      </div>
    </div>
  );
};
