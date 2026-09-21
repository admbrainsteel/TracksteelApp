import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { PieceInfo, LoadedIFCResult, getColorForMaterialName } from '@/lib/ifc/ifcLoaderService';
import { ViewCube } from './ViewCube';
import { Viewer3DSidebar } from './Viewer3DSidebar';
import { PieceHoverTooltip } from './PieceHoverTooltip';

interface ProductionPieceStatus {
  marca: string;
  fase: string;
  totalQtd: number;
  pointedQtd: number;
  currentProcessName?: string;
  processColor?: string;
  processOrdem?: number;
}

interface ModelViewer3DProps {
  modelData: LoadedIFCResult | null;
  productionData?: Map<string, ProductionPieceStatus>;
  selectedPieceMark?: string | null;
  selectedOF?: string;
  selectedPhase?: string;
  onSelectPiece?: (piece: PieceInfo | null) => void;
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  modelData,
  productionData,
  selectedPieceMark,
  selectedOF,
  selectedPhase,
  onSelectPiece,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
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
  const [colorMode, setColorMode] = useState<'description' | 'production'>('production');
  const [selectedProcess, setSelectedProcess] = useState<string>('all');

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
    if (!canvasContainerRef.current) return;

    const width = canvasContainerRef.current.clientWidth || 800;
    const height = canvasContainerRef.current.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = null; // Permite que o fundo da div (claro ou escuro) apareça
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

    // 3. Renderer com padronizacao grafica idêntica ao SteelXR
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    canvasContainerRef.current.innerHTML = '';
    canvasContainerRef.current.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(perspCamera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1500;
    controls.minDistance = 0.1;
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

    // 6. Floor Grid (Cores refinadas e ultrafinas para modo claro e escuro)
    const updateGridTheme = (gridHelper: THREE.GridHelper) => {
      const isDark = document.documentElement.classList.contains('dark');
      // No modo escuro: tom ligeiramente mais claro (slate-800 #1e293b e centro #475569)
      const centerColor = isDark ? new THREE.Color(0x475569) : new THREE.Color(0x94a3b8);
      const gridColor = isDark ? new THREE.Color(0x1e293b) : new THREE.Color(0xe2e8f0);

      const colors = (gridHelper.geometry.attributes.color as THREE.BufferAttribute);
      if (colors) {
        const colorArray = colors.array as Float32Array;
        for (let i = 0; i < colorArray.length; i += 6) {
          const isCenter = i === Math.floor(colorArray.length / 2);
          const c = isCenter ? centerColor : gridColor;
          colorArray[i] = c.r;
          colorArray[i + 1] = c.g;
          colorArray[i + 2] = c.b;
          colorArray[i + 3] = c.r;
          colorArray[i + 4] = c.g;
          colorArray[i + 5] = c.b;
        }
        colors.needsUpdate = true;
      }

      if (gridHelper.material && (gridHelper.material as THREE.Material)) {
        (gridHelper.material as THREE.Material).transparent = true;
        (gridHelper.material as THREE.Material).opacity = isDark ? 0.45 : 0.45;
      }
    };

    const isDarkMode = document.documentElement.classList.contains('dark');
    const centerLineColor = isDarkMode ? 0x475569 : 0x94a3b8;
    const gridLineColor = isDarkMode ? 0x1e293b : 0xe2e8f0;

    const grid = new THREE.GridHelper(300, 150, centerLineColor, gridLineColor);
    grid.position.y = 0;
    if (grid.material && (grid.material as THREE.Material)) {
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = isDarkMode ? 0.45 : 0.45;
    }
    scene.add(grid);
    gridHelperRef.current = grid;

    // Observador para atualizar cores do grid automaticamente quando o tema mudar
    const themeObserver = new MutationObserver(() => {
      if (gridHelperRef.current) {
        updateGridTheme(gridHelperRef.current);
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

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
      if (!canvasContainerRef.current || !rendererRef.current) return;
      const w = canvasContainerRef.current.clientWidth;
      const h = canvasContainerRef.current.clientHeight;

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
      themeObserver.disconnect();
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
    let matchedCount = 0;
    let pointedCount = 0;
    let totalMeshCount = 0;
    let sampleMatch: any = null;

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        totalMeshCount++;

        const pmark = String(mesh.userData.pieceMark || '').trim().toUpperCase();
        const cleanMark = String(mesh.userData.cleanMark || pmark).trim().toUpperCase();
        const assMark = String(mesh.userData.assemblyMark || '').trim().toUpperCase();
        const cleanAssMark = String(mesh.userData.cleanAssemblyMark || cleanMark).trim().toUpperCase();
        const section = String(mesh.userData.section || '').trim().toUpperCase();

        // 1. Extração da fase deste elemento (Propriedade IFC > Regex na Marca)
        let elementPhase = '';
        if (mesh.userData.phase) {
          elementPhase = String(mesh.userData.phase).trim();
        }
        if (!elementPhase) {
          const raw = assMark || pmark;
          const match = raw.match(/^(?:[A-Za-z0-9]+-)?(\d+)-/i);
          if (match) {
            elementPhase = match[1];
          }
        }

        // 2. Determinação do vínculo de produção (com matching rigoroso de fase)
        let prod: any = undefined;

        if (productionData && productionData.size > 0) {
          const searchKeys = [
            elementPhase && selectedOF ? `${selectedOF}-${elementPhase}-${cleanAssMark}` : '',
            elementPhase ? `${elementPhase}-${cleanAssMark}` : '',
            elementPhase && selectedOF ? `${selectedOF}-${elementPhase}-${cleanMark}` : '',
            elementPhase ? `${elementPhase}-${cleanMark}` : '',
            assMark,
            pmark,
            cleanAssMark,
            cleanMark
          ].filter(Boolean).map(k => k.toUpperCase());

          for (const key of searchKeys) {
            const match = productionData.get(key);
            if (match) {
               if (!elementPhase || !match.fase || String(match.fase) === String(elementPhase)) {
                   prod = match;
                   break;
               }
            }
          }
        }

        // 3. Controle Estrito de Visibilidade por Fase
        const isVisibleByPhase =
          !selectedPhase ||
          selectedPhase === 'all' ||
          elementPhase === selectedPhase ||
          String(elementPhase).toLowerCase() === String(selectedPhase).toLowerCase();

        mesh.visible = isVisibleByPhase;

        // Se o elemento não estiver visível na fase atual, pula estilização detalhada
        if (!isVisibleByPhase) return;

        // 4. Mapeamento de Processos Industriais para Inovação Híbrida (Corte -> Solda -> Pintura -> Expedição -> Montagem)
        const PROCESS_ORDER_MAP: Record<string, number> = {
          'corte': 1,
          'solda': 2,
          'pintura': 3,
          'pintura/galv': 3,
          'pintura/galvanizacao': 3,
          'pintura / galvanizacao': 3,
          'galvanizacao': 3,
          'expedicao': 4,
          'expedição': 4,
          'montagem': 5,
          'montagem obra': 5,
          'montagem de obra': 5,
        };

        const targetProcKey = String(selectedProcess || 'all').toLowerCase();
        const targetOrder = PROCESS_ORDER_MAP[targetProcKey] || 0;

        let isPointedInTargetProcess = false;
        if (selectedProcess !== 'all' && prod && prod.pointedQtd > 0) {
          const pieceProcOrder = Number(prod.processOrdem || 0);
          const pieceProcName = String(prod.currentProcessName || '').toLowerCase();
          const procsDone: string[] = Array.isArray(prod.processesCompleted) ? prod.processesCompleted : [];

          const normalizeStr = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          const normTarget = normalizeStr(targetProcKey);

          const hasDirectProcess =
            procsDone.some((p: string) => normalizeStr(p).includes(normTarget)) ||
            normalizeStr(pieceProcName).includes(normTarget);

          isPointedInTargetProcess =
            hasDirectProcess ||
            (targetOrder > 0 && pieceProcOrder >= targetOrder);
        }

        // 5. Aplicação de Cores / Materiais (Sólido vs Aramado Híbrido)
        if (selectedProcess !== 'all') {
          // --- MODO INOVAÇÃO: Destaque por Processo ---
          if (isPointedInTargetProcess) {
            // Peça apontada no processo: SÓLIDO VERDE BRILHANTE
            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#22c55e'), // Verde Sólido
              metalness: 0.35,
              roughness: 0.45,
              transparent: opacity < 100,
              opacity: opacity / 100,
              side: THREE.DoubleSide,
            });
            if (mesh.userData.edgesLine) {
              mesh.userData.edgesLine.visible = false;
            }
          } else {
            // Peça NÃO apontada no processo: ARAMADO CINZA CLARO FANTASMA ULTRA-SUAVE (Atenuação a 5% - Quase invisível)
            if (!mesh.userData.edgesLine) {
              const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 24);
              const lineMat = new THREE.LineBasicMaterial({
                color: 0x94a3b8, // Cinza claro industrial
                transparent: true,
                opacity: 0.05, // 5% de opacidade para foco total nas peças verdes
              });
              const edgesLine = new THREE.LineSegments(edgesGeo, lineMat);
              mesh.userData.edgesLine = edgesLine;
              mesh.add(edgesLine);
            } else {
              if (mesh.userData.edgesLine.material) {
                mesh.userData.edgesLine.material.color.set(0x94a3b8);
                mesh.userData.edgesLine.material.transparent = true;
                mesh.userData.edgesLine.material.opacity = 0.05;
              }
            }
            mesh.userData.edgesLine.visible = true;

            // Oculta sólido
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => { m.visible = false; });
            } else if (mesh.material) {
              mesh.material.visible = false;
            }
          }
        } else {
          // --- MODO GERAL (Todas as peças) ---
          if (colorMode === 'production' && productionData && productionData.size > 0) {
            if (prod) {
              matchedCount++;
              if (!sampleMatch && prod.pointedQtd > 0) {
                sampleMatch = { pmark: assMark || pmark, dbMarca: prod.marca, proc: prod.currentProcessName, cor: prod.processColor };
              }
            }

            if (prod && prod.pointedQtd > 0) {
              pointedCount++;
              const qtyPercent = Math.min(prod.pointedQtd / prod.totalQtd, 1.0);
              const processPercent = Math.min((prod.processOrdem || 1) / 5, 1.0);
              const percent = qtyPercent * processPercent;
              
              const colorLight = new THREE.Color('#4ade80');
              const colorDark = new THREE.Color('#14532d');
              const finalColor = new THREE.Color().lerpColors(colorLight, colorDark, percent);

              mesh.material = new THREE.MeshStandardMaterial({
                color: finalColor,
                metalness: 0.35,
                roughness: 0.45,
                side: THREE.DoubleSide,
              });
            } else {
              // Cinza Claro Industrial (#a1a1aa)
              mesh.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0xa1a1aa),
                metalness: 0.25,
                roughness: 0.65,
                transparent: opacity < 100,
                opacity: opacity / 100,
                side: THREE.DoubleSide,
              });
            }
          } else {
            // Modo Padrão / Descrição
            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0xa1a1aa),
              metalness: 0.25,
              roughness: 0.65,
              transparent: opacity < 100,
              opacity: opacity / 100,
              side: THREE.DoubleSide,
            });
          }

          // Controle de Aramado Geral (Botão Sólido / Aramado)
          if (isWireframe) {
            if (!mesh.userData.edgesLine) {
              const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 24);
              const lineMat = new THREE.LineBasicMaterial({
                color: 0x94a3b8, // Cinza claro industrial idêntico às peças não apontadas
                transparent: true,
                opacity: 0.85,
              });
              const edgesLine = new THREE.LineSegments(edgesGeo, lineMat);
              mesh.userData.edgesLine = edgesLine;
              mesh.add(edgesLine);
            } else {
              if (mesh.userData.edgesLine.material) {
                mesh.userData.edgesLine.material.color.set(0x94a3b8);
                mesh.userData.edgesLine.material.opacity = 0.85;
              }
            }
            mesh.userData.edgesLine.visible = true;

            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => { m.visible = false; });
            } else if (mesh.material) {
              mesh.material.visible = false;
            }
          } else {
            if (mesh.userData.edgesLine) {
              mesh.userData.edgesLine.visible = false;
            }

            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => {
                m.visible = true;
                m.transparent = opacity < 100;
                m.opacity = opacity / 100;
                if ('wireframe' in m) (m as any).wireframe = false;
              });
            } else if (mesh.material) {
              mesh.material.visible = true;
              mesh.material.transparent = opacity < 100;
              mesh.material.opacity = opacity / 100;
              if ('wireframe' in mesh.material) (mesh.material as any).wireframe = false;
            }
          }
        }
      }
    });

    if (selectedPhase && selectedPhase !== 'all') {
      console.log(`[Viewer3D] Filtrando modelo 3D pela Fase: "${selectedPhase}"`);
    }
    if (selectedProcess && selectedProcess !== 'all') {
      console.log(`[Viewer3D] Modo Híbrido Ativo: Destacando Processo "${selectedProcess}" em Verde Sólido + Aramado Fantasma Cinza`);
    }

    if (totalMeshCount > 0 && productionData && productionData.size > 0) {
      console.log(
        `%c[IFC Sync] Amarração de Peças: ${matchedCount}/${totalMeshCount} malhas vinculadas | ${pointedCount} apontadas na produção | ${totalMeshCount - pointedCount} pendentes em cinza claro`,
        'color: #06b6d4; font-weight: bold;'
      );
      if (sampleMatch) {
        console.log(
          `[IFC Sync] Exemplo de amarração: IFC "${sampleMatch.pmark}" -> Banco "${sampleMatch.dbMarca}" (Processo: ${sampleMatch.proc}, Cor: ${sampleMatch.cor})`
        );
      }
    }
  }, [modelData, colorMode, productionData, selectedPhase, selectedOF, opacity, isWireframe, selectedProcess]);

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
        const expressID = hitMesh.userData.ifcId;
        const pmark = hitMesh.userData.pieceMark;

        if (modelData && expressID !== undefined) {
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

  // Double Click to focus camera target
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !activeCameraRef.current || !modelGroupRef.current || !controlsRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    const v = new THREE.Vector2(mouseX, mouseY);
    raycasterRef.current.setFromCamera(v, activeCameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(modelGroupRef.current.children, true);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      controlsRef.current.target.copy(hitPoint);
      controlsRef.current.update();
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onDoubleClick={handleDoubleClick}
      className="relative w-full h-full bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl select-none"
    >
      {/* Three.js Canvas Container Dedicado */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Top Left: Sub-Menu / Barra Lateral Retrátil de Ferramentas SteelXR */}
      <Viewer3DSidebar
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
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        selectedProcess={selectedProcess}
        onSelectProcess={setSelectedProcess}
        onFitView={() => fitModelToView()}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Top Right: Interactive ViewCube WebGL sincronizado */}
      <div className="absolute top-4 right-4 z-20">
        <ViewCube onSelectView={handleViewCubeSelect} mainCameraRef={activeCameraRef} />
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
    </div>
  );
};
