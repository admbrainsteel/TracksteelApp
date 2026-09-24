import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { PieceInfo, LoadedIFCResult, getColorForMaterialName } from '@/lib/ifc/ifcLoaderService';
import { ViewCube } from './ViewCube';
import { Viewer3DSidebar } from './Viewer3DSidebar';
import { PieceHoverTooltip } from './PieceHoverTooltip';
import { SelectionListModal, SelectedPieceItem } from './SelectionListModal';
import { Trash2, FileSpreadsheet, RotateCcw, RotateCw, Lock, Unlock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

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
  initialRotation?: { x: number; y: number; z: number } | null;
  onSelectPiece?: (piece: PieceInfo | null) => void;
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  modelData,
  productionData,
  selectedPieceMark,
  selectedOF,
  selectedPhase,
  initialRotation,
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
  const [colorMode, setColorMode] = useState<'description' | 'production'>('production');
  const [selectedProcess, setSelectedProcess] = useState<string>('all');

  // Hover Tooltip States (1.0 second delay)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [hoveredPiece, setHoveredPiece] = useState<PieceInfo | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Seleção Permanente Magenta indexada por Peça Física Real (expressID / montagem única)
  interface SelectedElement {
    expressID: number;
    piece: PieceInfo;
    meshes: THREE.Mesh[];
  }

  const [selectedElementsMap, setSelectedElementsMap] = useState<Map<number, SelectedElement>>(new Map());
  const selectedElementsMapRef = useRef(selectedElementsMap);
  useEffect(() => {
    selectedElementsMapRef.current = selectedElementsMap;
  }, [selectedElementsMap]);

  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState<boolean>(false);
  const pointerDownInfoRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // Material Magenta Permanente (#FF00FF)
  const magentaMaterialRef = useRef<THREE.MeshStandardMaterial>(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FF00FF'),
      emissive: new THREE.Color('#C000C0'),
      emissiveIntensity: 0.4,
      metalness: 0.25,
      roughness: 0.35,
      side: THREE.DoubleSide,
    })
  );

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

  // Estados de Rotação 3D e Bloqueio com Cadeado
  const [rotationX, setRotationX] = useState<number>(0);
  const [rotationY, setRotationY] = useState<number>(0);
  const [isRotationLocked, setIsRotationLocked] = useState<boolean>(false);
  const { toast } = useToast();

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

  // Update Model in Scene & Carregar Rotação Memorizada
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

    // Recupera rotação memorizada para esta OF (localStorage ou banco de dados)
    const storageKey = selectedOF ? `tracksteel_model_rot_${selectedOF}` : null;
    let savedX = 0;
    let savedY = 0;
    let isLocked = false;

    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (typeof parsed.x === 'number') savedX = parsed.x;
          if (typeof parsed.y === 'number') savedY = parsed.y;
          isLocked = true;
        } catch (e) {}
      }
    }

    if (!isLocked && initialRotation) {
      if (typeof initialRotation.x === 'number') savedX = initialRotation.x;
      if (typeof initialRotation.y === 'number') savedY = initialRotation.y;
      isLocked = true;
    }

    setRotationX(savedX);
    setRotationY(savedY);
    setIsRotationLocked(isLocked);

    // Aplica rotação inicial no grupo do modelo (garantindo que se comporte em pé/adequado)
    group.rotation.set(
      THREE.MathUtils.degToRad(savedX),
      THREE.MathUtils.degToRad(savedY),
      0
    );
    group.updateMatrixWorld(true);

    // Fit View (Center Model)
    fitModelToView(group);
  }, [modelData, selectedOF, initialRotation, fitModelToView]);

  // Gira o modelo em 90 graus no eixo X (tombamento vertical para alinhar Z-Up do CAD com Y-Up)
  const handleRotate90X = useCallback(() => {
    if (!modelGroupRef.current) return;

    const nextX = (rotationX + 90) % 360;
    setRotationX(nextX);
    setIsRotationLocked(false); // Destrava temporariamente para indicar alteração pendente de trava

    modelGroupRef.current.rotation.x = THREE.MathUtils.degToRad(nextX);
    modelGroupRef.current.rotation.y = THREE.MathUtils.degToRad(rotationY);
    modelGroupRef.current.updateMatrixWorld(true);

    fitModelToView(modelGroupRef.current);
  }, [rotationX, rotationY, fitModelToView]);

  // Alterna o bloqueio/gravação da posição ideal de visualização no banco e no navegador
  const handleToggleLockRotation = useCallback(async () => {
    if (!selectedOF) {
      toast({
        title: 'Aviso',
        description: 'Selecione uma OF para memorizar a rotação do modelo.',
      });
      return;
    }

    if (!isRotationLocked) {
      // Trava e grava a rotação
      setIsRotationLocked(true);
      const rotData = { x: rotationX, y: rotationY, z: 0 };

      // 1. Grava no localStorage para acesso instantâneo
      localStorage.setItem(`tracksteel_model_rot_${selectedOF}`, JSON.stringify(rotData));

      // 2. Persiste na nuvem/Supabase na tabela ordens_fabricacao
      try {
        await supabase
          .from('ordens_fabricacao' as any)
          .update({ model_3d_rotation: rotData })
          .eq('num_of', selectedOF);
      } catch (err) {
        console.error('Erro ao salvar rotação no banco:', err);
      }

      toast({
        title: 'Posição Travada e Salva',
        description: `Posição ideal de visualização (${rotationX}°) gravada com sucesso para a OF ${selectedOF}.`,
      });
    } else {
      // Destrava para permitir novo ajuste
      setIsRotationLocked(false);
      toast({
        title: 'Posição Destravada',
        description: 'Clique em "Girar 90°" para ajustar e trave no cadeado novamente quando estiver na posição correta.',
      });
    }
  }, [selectedOF, isRotationLocked, rotationX, rotationY, toast]);

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

        // 4. Mapeamento de Processos Industriais (Corte, Solda, Pintura, Expedição, Montagem)
        const PROCESS_COLOR_MAP: Record<string, string> = {
          'corte': '#3b82f6',
          'solda': '#f97316',
          'pintura': '#10b981',
          'pintura/galv': '#10b981',
          'pintura/galvanizacao': '#10b981',
          'pintura / galvanizacao': '#10b981',
          'galvanizacao': '#10b981',
          'expedicao': '#06b6d4',
          'expedição': '#06b6d4',
          'montagem': '#8b5cf6',
          'montagem obra': '#8b5cf6',
          'montagem de obra': '#8b5cf6',
        };

        const normalizeStr = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const targetProcKey = normalizeStr(String(selectedProcess || 'all'));
        const targetColorHex = PROCESS_COLOR_MAP[targetProcKey] || '#22c55e';

        let isPointedInTargetProcess = false;
        if (selectedProcess !== 'all' && prod) {
          const procsDone: string[] = Array.isArray(prod.processesCompleted) ? prod.processesCompleted : [];
          const procPointedMap: Record<string, number> = prod.processPointedQtds || {};

          // Checagem estrita de apontamento real no processo selecionado
          if (targetProcKey === 'corte') {
            isPointedInTargetProcess = (procPointedMap['corte'] && procPointedMap['corte'] > 0) || procsDone.includes('corte');
          } else if (targetProcKey === 'solda') {
            isPointedInTargetProcess = (procPointedMap['solda'] && procPointedMap['solda'] > 0) || procsDone.includes('solda');
          } else if (targetProcKey === 'pintura') {
            isPointedInTargetProcess =
              (procPointedMap['pintura'] && procPointedMap['pintura'] > 0) ||
              (procPointedMap['pintura/galv'] && procPointedMap['pintura/galv'] > 0) ||
              (procPointedMap['pintura / galvanizacao'] && procPointedMap['pintura / galvanizacao'] > 0) ||
              (procPointedMap['galvanizacao'] && procPointedMap['galvanizacao'] > 0) ||
              procsDone.some(p => p.includes('pint') || p.includes('galv'));
          } else if (targetProcKey === 'expedicao') {
            isPointedInTargetProcess = (procPointedMap['expedicao'] && procPointedMap['expedicao'] > 0) || procsDone.some(p => p.includes('exped'));
          } else if (targetProcKey === 'montagem') {
            isPointedInTargetProcess = (procPointedMap['montagem'] && procPointedMap['montagem'] > 0) || procsDone.some(p => p.includes('montag'));
          } else {
            isPointedInTargetProcess = Boolean(procPointedMap[targetProcKey] && procPointedMap[targetProcKey] > 0) || procsDone.includes(targetProcKey);
          }
        }

        // 5. Aplicação de Cores / Materiais (Sólido vs Aramado Híbrido)
        const procPointedMap: Record<string, number> = (prod && prod.processPointedQtds) || {};
        const procsDone: string[] = Array.isArray(prod?.processesCompleted) ? prod.processesCompleted : [];

        const hasMontagem = Boolean(procPointedMap['montagem'] > 0 || procsDone.some((p: string) => p.includes('montag')));
        const hasExpedicao = Boolean(procPointedMap['expedicao'] > 0 || procsDone.some((p: string) => p.includes('exped')));
        const hasPintura = Boolean(
          procPointedMap['pintura'] > 0 ||
          procPointedMap['pintura/galv'] > 0 ||
          procPointedMap['pintura / galvanizacao'] > 0 ||
          procPointedMap['galvanizacao'] > 0 ||
          procsDone.some((p: string) => p.includes('pint') || p.includes('galv'))
        );
        const hasSolda = Boolean(procPointedMap['solda'] > 0 || procsDone.some((p: string) => p.includes('sold')));
        const hasCorte = Boolean(procPointedMap['corte'] > 0 || procsDone.some((p: string) => p.includes('corte')));
        const hasDetalhamento = Boolean(
          (procPointedMap['detalhamento'] && procPointedMap['detalhamento'] > 0) ||
          (procPointedMap['detalh'] && procPointedMap['detalh'] > 0) ||
          procsDone.some((p: string) => p.includes('detalh')) ||
          prod?.hasDetalhamento
        );

        const hasAnyApontamento = hasMontagem || hasExpedicao || hasPintura || hasSolda || hasCorte || hasDetalhamento;

        if (selectedProcess !== 'all') {
          // --- FILTRO POR PROCESSO ESPECÍFICO ---
          let isPointedInThisProcess = false;
          if (targetProcKey === 'corte') isPointedInThisProcess = hasCorte;
          else if (targetProcKey === 'solda') isPointedInThisProcess = hasSolda;
          else if (targetProcKey === 'pintura') isPointedInThisProcess = hasPintura;
          else if (targetProcKey === 'expedicao') isPointedInThisProcess = hasExpedicao;
          else if (targetProcKey === 'montagem') isPointedInThisProcess = hasMontagem;
          else isPointedInThisProcess = Boolean(procPointedMap[targetProcKey] > 0 || procsDone.includes(targetProcKey));

          if (isPointedInThisProcess) {
            // SÓLIDO COM A COR DO PROCESSO SELECIONADO (OPACO 100%)
            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(targetColorHex),
              metalness: 0.35,
              roughness: 0.45,
              transparent: opacity < 100,
              opacity: opacity / 100,
              depthWrite: true,
              side: THREE.DoubleSide,
            });
            if (mesh.userData.edgesLine) {
              mesh.userData.edgesLine.visible = false;
            }
          } else {
            // SÓLIDO TRANSLÚCIDO ATENUADO (Ghost Solid volumétrico a 8% - sem linhas de aramado)
            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#94a3b8'), // Cinza industrial translúcido
              metalness: 0.1,
              roughness: 0.8,
              transparent: true,
              opacity: 0.08, // 8% de opacidade volumétrica suave
              depthWrite: false,
              side: THREE.DoubleSide,
            });
            if (mesh.userData.edgesLine) {
              mesh.userData.edgesLine.visible = false;
            }
          }
        } else {
          // --- MODO "TODOS" ---
          if (colorMode === 'production' && productionData && productionData.size > 0) {
            if (hasAnyApontamento) {
              // A PEÇA TEM APONTAMENTO: RENDERIZA EM SÓLIDO COM A COR DA SUA ETAPA MAIS AVANÇADA
              let pieceColorHex = '#a1a1aa'; // Detalhamento (Cinza Claro Sólido sem atenuação)

              if (hasMontagem) {
                pieceColorHex = '#8b5cf6'; // Roxo Montagem
              } else if (hasExpedicao) {
                pieceColorHex = '#06b6d4'; // Ciano Expedição
              } else if (hasPintura) {
                pieceColorHex = '#10b981'; // Verde Pintura
              } else if (hasSolda) {
                pieceColorHex = '#f97316'; // Laranja Solda
              } else if (hasCorte) {
                pieceColorHex = '#3b82f6'; // Azul Corte
              } else if (hasDetalhamento) {
                pieceColorHex = '#a1a1aa'; // Cinza Claro Industrial Sólido (sem atenuação!)
              }

              mesh.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(pieceColorHex),
                metalness: 0.35,
                roughness: 0.45,
                transparent: opacity < 100,
                opacity: opacity / 100,
                depthWrite: true,
                side: THREE.DoubleSide,
              });

              if (mesh.userData.edgesLine) {
                mesh.userData.edgesLine.visible = false;
              }
            } else {
              // A PEÇA NÃO TEM NENHUM APONTAMENTO: SÓLIDO TRANSLÚCIDO ATENUADO (Ghost Solid a 8%)
              mesh.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#94a3b8'),
                metalness: 0.1,
                roughness: 0.8,
                transparent: true,
                opacity: 0.08,
                depthWrite: false,
                side: THREE.DoubleSide,
              });

              if (mesh.userData.edgesLine) {
                mesh.userData.edgesLine.visible = false;
              }
            }
          } else {
            // Modo Padrão / Descrição: toda a geometria sólida em cinza industrial
            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0xa1a1aa),
              metalness: 0.25,
              roughness: 0.65,
              transparent: opacity < 100,
              opacity: opacity / 100,
              depthWrite: true,
              side: THREE.DoubleSide,
            });
            if (mesh.userData.edgesLine) {
              mesh.userData.edgesLine.visible = false;
            }
          }
        }

        // Se a peça física pertencer à seleção permanente, preserva a cor magenta
        const ifcId = mesh.userData.ifcId;
        if (ifcId !== undefined && selectedElementsMapRef.current.has(ifcId)) {
          mesh.userData.originalMaterial = mesh.material;
          mesh.material = magentaMaterialRef.current;
        } else {
          mesh.userData.originalMaterial = mesh.material;
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
  }, [modelData, colorMode, productionData, selectedPhase, selectedOF, opacity, selectedProcess]);

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

  // 1.5-Second Hover Detection com Magnetismo e Tolerância para Peças Esbeltas / Finas (ex: barras de 13mm)
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
      if (!activeCameraRef.current || !modelGroupRef.current) return;

      const camera = activeCameraRef.current;
      const raycaster = raycasterRef.current;
      raycaster.params.Line = { threshold: 4.0 };
      raycaster.params.Points = { threshold: 4.0 };

      // 1. Tenta o ponto central do mouse
      raycaster.setFromCamera(mousePosRef.current, camera);
      let intersects = raycaster.intersectObjects(modelGroupRef.current.children, true);

      // 2. Se não houver acerto direto, faz amostragem circular de tolerância (magnetismo para peças finas como barras de 13mm e tirantes)
      if (intersects.length === 0) {
        const radiusOffsetsPx = [6, 12, 18];
        const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];

        for (const rPx of radiusOffsetsPx) {
          if (intersects.length > 0) break;
          for (const angle of angles) {
            const dx = ((rPx * Math.cos(angle)) / rect.width) * 2;
            const dy = -((rPx * Math.sin(angle)) / rect.height) * 2;
            const samplePos = new THREE.Vector2(mouseX + dx, mouseY + dy);

            raycaster.setFromCamera(samplePos, camera);
            const sampleIntersects = raycaster.intersectObjects(modelGroupRef.current.children, true);
            if (sampleIntersects.length > 0) {
              intersects = sampleIntersects;
              break;
            }
          }
        }
      }

      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        let hitMesh: THREE.Mesh | null = null;

        if ((hitObj as THREE.Mesh).isMesh) {
          hitMesh = hitObj as THREE.Mesh;
        } else if (hitObj.parent && (hitObj.parent as THREE.Mesh).isMesh) {
          hitMesh = hitObj.parent as THREE.Mesh;
        } else {
          hitMesh = hitObj as any;
        }

        if (hitMesh) {
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
      }
    }, 1000); // Exato 1.0 segundo de tempo de pouso do mouse
  };

  const handlePointerLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredPiece(null);
    setHoverPosition(null);
  };

  // Pointer Down para diferenciar clique simples de arraste de câmera dos OrbitControls
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownInfoRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  // 1 Clique: Marcação e Desmarcação Permanente em Magenta (#FF00FF)
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !activeCameraRef.current || !modelGroupRef.current) return;

    const dx = e.clientX - pointerDownInfoRef.current.x;
    const dy = e.clientY - pointerDownInfoRef.current.y;
    const dt = Date.now() - pointerDownInfoRef.current.time;

    // Se houve arraste de rotação/pan (mais de 6px ou clique longo > 400ms), ignora
    if (Math.hypot(dx, dy) > 6 || dt > 400) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), activeCameraRef.current);
    const intersects = raycaster.intersectObjects(modelGroupRef.current.children, true);

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      let hitMesh: THREE.Mesh | null = null;
      if ((hitObj as THREE.Mesh).isMesh) {
        hitMesh = hitObj as THREE.Mesh;
      } else if (hitObj.parent && (hitObj.parent as THREE.Mesh).isMesh) {
        hitMesh = hitObj.parent as THREE.Mesh;
      }

      if (hitMesh && hitMesh.visible) {
        const targetIfcId = hitMesh.userData.ifcId;
        if (targetIfcId === undefined) return;

        const nextMap = new Map(selectedElementsMapRef.current);

        if (nextMap.has(targetIfcId)) {
          // Desmarcar peça física inteira: restaura todas as suas sub-malhas geométricas
          const element = nextMap.get(targetIfcId)!;
          element.meshes.forEach((m) => {
            if (m.userData.originalMaterial) {
              m.material = m.userData.originalMaterial;
            }
            m.userData.isMagentaSelected = false;
          });
          nextMap.delete(targetIfcId);
        } else {
          // Marcar peça física inteira: localiza e pinta todas as sub-malhas do mesmo ifcId
          const relatedMeshes: THREE.Mesh[] = [];
          if (modelGroupRef.current) {
            modelGroupRef.current.traverse((child) => {
              if ((child as THREE.Mesh).isMesh && child.userData.ifcId === targetIfcId) {
                const m = child as THREE.Mesh;
                m.userData.originalMaterial = m.material;
                m.userData.isMagentaSelected = true;
                m.material = magentaMaterialRef.current;
                relatedMeshes.push(m);
              }
            });
          }

          const pmark = hitMesh.userData.pieceMark;
          const piece: PieceInfo = (modelData && modelData.pieceByExpressID.get(targetIfcId)) || {
            expressID: targetIfcId,
            guid: '',
            name: hitMesh.userData.section || 'Peça',
            type: 'PIECE',
            pieceMark: pmark,
            section: hitMesh.userData.section,
            phase: hitMesh.userData.phase,
          };

          nextMap.set(targetIfcId, {
            expressID: targetIfcId,
            piece,
            meshes: relatedMeshes,
          });
          onSelectPiece?.(piece);
        }

        setSelectedElementsMap(nextMap);
      }
    }
  };

  // 2 Cliques (Duplo Clique): Seleciona TODAS as peças físicas idênticas no modelo (mesma marca e mesma fase)
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !activeCameraRef.current || !modelGroupRef.current || !controlsRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(new THREE.Vector2(mouseX, mouseY), activeCameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(modelGroupRef.current.children, true);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      const hitObj = intersects[0].object;
      let hitMesh: THREE.Mesh | null = null;
      if ((hitObj as THREE.Mesh).isMesh) {
        hitMesh = hitObj as THREE.Mesh;
      } else if (hitObj.parent && (hitObj.parent as THREE.Mesh).isMesh) {
        hitMesh = hitObj.parent as THREE.Mesh;
      }

      if (hitMesh) {
        const targetPieceMark = String(hitMesh.userData.pieceMark || '').trim().toUpperCase();
        const targetPhase = hitMesh.userData.phase ? String(hitMesh.userData.phase).trim() : '';

        if (targetPieceMark) {
          const nextMap = new Map(selectedElementsMapRef.current);

          // Agrupa todas as sub-malhas por elemento físico (ifcId único)
          const meshesByIfcId = new Map<number, { meshes: THREE.Mesh[]; sampleMesh: THREE.Mesh }>();

          modelGroupRef.current.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && child.visible) {
              const mesh = child as THREE.Mesh;
              const pmark = String(mesh.userData.pieceMark || '').trim().toUpperCase();
              const phase = mesh.userData.phase ? String(mesh.userData.phase).trim() : '';

              // Mesma marca e mesma fase
              const isMatch = pmark === targetPieceMark && (!targetPhase || !phase || phase === targetPhase);
              if (isMatch) {
                const ifcId = mesh.userData.ifcId;
                if (ifcId !== undefined) {
                  if (!meshesByIfcId.has(ifcId)) {
                    meshesByIfcId.set(ifcId, { meshes: [], sampleMesh: mesh });
                  }
                  meshesByIfcId.get(ifcId)!.meshes.push(mesh);
                }
              }
            }
          });

          // Pinta e adiciona cada peça física real como 1 unidade
          meshesByIfcId.forEach(({ meshes, sampleMesh }, ifcId) => {
            meshes.forEach((m) => {
              if (!m.userData.isMagentaSelected) {
                m.userData.originalMaterial = m.material;
              }
              m.userData.isMagentaSelected = true;
              m.material = magentaMaterialRef.current;
            });

            const piece: PieceInfo = (modelData && modelData.pieceByExpressID.get(ifcId)) || {
              expressID: ifcId,
              guid: '',
              name: sampleMesh.userData.section || 'Peça',
              type: 'PIECE',
              pieceMark: sampleMesh.userData.pieceMark,
              section: sampleMesh.userData.section,
              phase: sampleMesh.userData.phase || targetPhase,
            };

            nextMap.set(ifcId, {
              expressID: ifcId,
              piece,
              meshes,
            });
          });

          setSelectedElementsMap(nextMap);
        }

        // Foca suavemente o alvo dos controles na peça clicada
        controlsRef.current.target.copy(hitPoint);
        controlsRef.current.update();
      }
    }
  };

  // Limpar Seleção Completa
  const handleClearSelection = useCallback(() => {
    selectedElementsMapRef.current.forEach(({ meshes }) => {
      meshes.forEach((m) => {
        if (m.userData.originalMaterial) {
          m.material = m.userData.originalMaterial;
        }
        m.userData.isMagentaSelected = false;
      });
    });
    setSelectedElementsMap(new Map());
  }, []);

  // Quantidade real de peças físicas selecionadas na obra
  const selectedCount = selectedElementsMap.size;

  // Lista consolidada de peças físicas para o modal de seleção
  const selectedPiecesList: SelectedPieceItem[] = Array.from(selectedElementsMap.values()).map(
    ({ expressID, piece }) => {
      const pmark = piece.pieceMark || 'Sem Marca';
      const prod = productionData?.get(pmark);
      return {
        id: String(expressID),
        pieceMark: pmark,
        phase: piece.phase,
        section: piece.section,
        name: piece.name,
        pointedQty: prod?.pointedQtd,
        totalQty: prod?.totalQtd,
        currentStage: prod?.currentProcessName,
        stageColor: prod?.processColor,
      };
    }
  );

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
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
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        selectedProcess={selectedProcess}
        onSelectProcess={setSelectedProcess}
        onFitView={() => fitModelToView()}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Top Right: ViewCube + Painel de Ações de Seleção de Peças */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2.5 pointer-events-auto">
        <ViewCube onSelectView={handleViewCubeSelect} mainCameraRef={activeCameraRef} />

        {/* Card de Controle de Seleção Flutuante Harmonizado Abaixo do Cubo */}
        <div
          className={`flex flex-col items-stretch gap-1.5 p-2 rounded-2xl backdrop-blur-md border transition-all duration-200 shadow-lg ${
            selectedCount > 0
              ? 'bg-white/95 dark:bg-slate-900/95 border-slate-300 dark:border-slate-700 shadow-slate-300/40 dark:shadow-slate-950/60 ring-1 ring-blue-500/20'
              : 'bg-white/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800/80 opacity-75 hover:opacity-100'
          }`}
          style={{ minWidth: '130px' }}
        >
          {/* Badge Indicador de Seleção Ativa Sóbrio */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 mb-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-mono font-bold animate-in fade-in zoom-in-95 duration-200">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 shadow-sm" />
              <span>
                {selectedCount} {selectedCount === 1 ? 'peça' : 'peças'}
              </span>
            </div>
          )}

          {/* Botão Gerar Lista da Seleção (Azul Escuro no claro / Azul Elegante no escuro) */}
          <button
            onClick={() => setIsSelectionModalOpen(true)}
            disabled={selectedCount === 0}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 cursor-pointer ${
              selectedCount > 0
                ? 'bg-blue-950 hover:bg-blue-900 text-white shadow-sm dark:bg-blue-600 dark:hover:bg-blue-500 scale-[1.02] active:scale-[0.98]'
                : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50'
            }`}
            title={
              selectedCount > 0
                ? 'Abrir lista detalhada e exportar planilha das peças selecionadas'
                : 'Selecione peças no 3D para gerar a lista'
            }
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${selectedCount > 0 ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
            <span className="whitespace-nowrap">Gerar lista</span>
          </button>

          {/* Botão Limpar Seleção Harmonizado */}
          <button
            onClick={handleClearSelection}
            disabled={selectedCount === 0}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
              selectedCount > 0
                ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 dark:border-slate-700 dark:text-slate-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/30 active:scale-[0.98]'
                : 'text-slate-400 dark:text-slate-600 border border-transparent cursor-not-allowed opacity-40'
            }`}
            title="Desmarcar todas as peças"
          >
            <Trash2 className="w-3 h-3" />
            <span className="whitespace-nowrap">Limpar Seleção</span>
          </button>
        </div>

        {/* Card de Ajuste e Travamento de Rotação 3D (Tombamento 90° + Cadeado Memorizável) */}
        <div
          className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 shadow-lg shadow-slate-300/30 dark:shadow-slate-950/50 pointer-events-auto"
          style={{ minWidth: '130px' }}
        >
          {/* Botão Rotacionar / Tombar 90° */}
          <button
            onClick={handleRotate90X}
            disabled={!modelData}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150 active:scale-95 ${
              modelData
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer shadow-sm'
                : 'bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title="Girar o modelo 90° no eixo de tombamento (adequar orientação Z/Y)"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="whitespace-nowrap">Girar 90°</span>
            <span className="text-[10px] font-mono font-normal text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-950 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-800">
              {rotationX}°
            </span>
          </button>

          {/* Botão Cadeado: Travar / Gravar ou Destravar */}
          <button
            onClick={handleToggleLockRotation}
            disabled={!modelData}
            className={`flex items-center justify-center p-1.5 rounded-xl transition-all duration-200 active:scale-95 border ${
              !modelData
                ? 'bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 border-transparent cursor-not-allowed opacity-40'
                : isRotationLocked
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 dark:border-emerald-700/80 shadow-sm cursor-pointer'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:hover:bg-amber-900/70 dark:text-amber-300 dark:border-amber-700/70 shadow-sm cursor-pointer animate-pulse'
            }`}
            title={
              isRotationLocked
                ? 'Posição TRAVADA e salva para esta OF. Clique para destravar e ajustar.'
                : 'Posição DESTRAVADA. Clique aqui no cadeado para travar e salvar a posição ideal.'
            }
          >
            {isRotationLocked ? (
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Unlock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* Hover Tooltip (1.0s delay trigger) */}
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

      {/* Modal de Lista e Exportação da Seleção 3D */}
      <SelectionListModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        selectedPieces={selectedPiecesList}
        selectedOF={selectedOF}
        onClearSelection={handleClearSelection}
      />
    </div>
  );
};
