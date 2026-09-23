import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LoadedIFCResult, PieceInfo } from '@/lib/ifc/ifcLoaderService';
import { ViewCube } from './ViewCube';
import { SelectionListModal, SelectedPieceItem } from './SelectionListModal';
import { SmartNotificationsModal, useSmartNotificationsAlert } from '@/pages/smart/components/SmartNotificationsModal';
import { useTheme } from '@/hooks/useTheme';
import { smartAudio } from '@/utils/smartAudio';
import { 
  ArrowLeft, 
  Layers, 
  Activity, 
  Maximize2, 
  Trash2, 
  X, 
  CheckCircle2, 
  Clock, 
  Box,
  Check,
  Sun,
  Moon,
  FileSpreadsheet,
  Grid as GridIcon,
  Bell
} from 'lucide-react';

export interface ProductionPieceStatus {
  pecaId?: string;
  marca: string;
  fase?: string;
  etapa_fase?: string;
  totalQtd: number;
  pointedQtd: number;
  currentProcessName?: string;
  processColor?: string;
  processOrdem?: number;
  processesCompleted?: string[];
  processPointedQtds?: Record<string, number>;
  hasDetalhamento?: boolean;
}

interface SmartModelViewer3DProps {
  modelData: LoadedIFCResult | null;
  productionData?: Map<string, ProductionPieceStatus>;
  selectedOF: string;
  cliente?: string;
  phasesList: string[];
  onVoltar: () => void;
}

// Ordem e cores oficiais sincronizadas com o menu de processos do modo completo (Desktop)
const PROCESS_LIST = [
  { id: 'all', nome: 'Todos os Processos', cor: '#475569' },
  { id: 'corte', nome: 'Corte', cor: '#3b82f6' },
  { id: 'solda', nome: 'Solda', cor: '#f97316' },
  { id: 'pintura', nome: 'Pintura', cor: '#10b981' },
  { id: 'expedicao', nome: 'Expedição', cor: '#06b6d4' },
  { id: 'montagem', nome: 'Montagem', cor: '#8b5cf6' },
];

export const SmartModelViewer3D: React.FC<SmartModelViewer3DProps> = ({
  modelData,
  productionData,
  selectedOF,
  cliente,
  phasesList,
  onVoltar,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const perspCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());

  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  // Controles de Visualização: Grid e Câmera Ortogonal/Perspectiva
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isOrthographic, setIsOrthographic] = useState<boolean>(false);

  // Alerta e Modal de Notificações de Apontamentos
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const { unreadCount, hasNewAlert, clearAlert } = useSmartNotificationsAlert(selectedOF);

  // Filtros principais solicitados: Fase e Processo
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedProcess, setSelectedProcess] = useState<string>('all');

  // Modal de Lista da Seleção
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState<boolean>(false);

  // Seleção e Toast Discreto
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

  // Toast flutuante posicionado ao lado do toque
  const [toastInfo, setToastInfo] = useState<{
    piece: PieceInfo;
    position: { x: number; y: number };
    prod?: ProductionPieceStatus;
  } | null>(null);

  // Material Magenta Permanente (#FF00FF)
  const magentaMaterialRef = useRef<THREE.MeshStandardMaterial>(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FF00FF'),
      emissive: new THREE.Color('#C000C0'),
      emissiveIntensity: 0.45,
      metalness: 0.25,
      roughness: 0.35,
      side: THREE.DoubleSide,
    })
  );

  const gridRef = useRef<THREE.GridHelper | null>(null);

  // 1. Alternar Visibilidade da Grade de Piso (Grid)
  const handleToggleGrid = useCallback(() => {
    smartAudio.playClick();
    setShowGrid((prev) => {
      const next = !prev;
      if (gridRef.current) {
        gridRef.current.visible = next;
      }
      return next;
    });
  }, []);

  // 2. Alternar Câmera Ortogonal / Perspectiva
  const handleToggleCamera = useCallback(() => {
    if (!perspCameraRef.current || !orthoCameraRef.current || !controlsRef.current) return;
    smartAudio.playClick();

    const nextOrtho = !isOrthographic;
    setIsOrthographic(nextOrtho);

    const prevCamera = activeCameraRef.current || perspCameraRef.current;
    const nextCamera = nextOrtho ? orthoCameraRef.current : perspCameraRef.current;

    nextCamera.position.copy(prevCamera.position);
    nextCamera.quaternion.copy(prevCamera.quaternion);

    activeCameraRef.current = nextCamera;
    controlsRef.current.object = nextCamera;
    controlsRef.current.update();
  }, [isOrthographic]);

  // 3. Atualizar cores do piso quando o tema claro/escuro mudar (SEM recriar a cena Three.js!)
  useEffect(() => {
    if (!gridRef.current) return;
    const isDarkMode = document.documentElement.classList.contains('dark') || theme === 'dark';
    const centerColor = isDarkMode ? new THREE.Color(0x475569) : new THREE.Color(0x94a3b8);
    const gridColor = isDarkMode ? new THREE.Color(0x1e293b) : new THREE.Color(0xe2e8f0);

    const colors = gridRef.current.geometry.attributes.color as THREE.BufferAttribute;
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

    if (gridRef.current.material && (gridRef.current.material as THREE.Material)) {
      (gridRef.current.material as THREE.Material).transparent = true;
      (gridRef.current.material as THREE.Material).opacity = isDarkMode ? 0.35 : 0.45;
    }
  }, [theme]);

  // Rastreamento para diferenciar gesto touch/drag de toque simples (Tap)
  const pointerDownRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // 4. Inicialização ÚNICA do Three.js e OrbitControls Touch-First (independente de tema!)
  useEffect(() => {
    if (!containerRef.current || !canvasContainerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    // Cena única persistente
    const scene = new THREE.Scene();
    scene.background = null; // Fundo controlado por CSS do container (slate-50 / slate-950)
    sceneRef.current = scene;

    // Câmera Perspectiva
    const perspCamera = new THREE.PerspectiveCamera(48, width / height, 0.1, 10000);
    perspCamera.position.set(25, 20, 30);
    perspCameraRef.current = perspCamera;

    // Câmera Ortográfica
    const frustumSize = 40;
    const aspect = width / height;
    const orthoCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      10000
    );
    orthoCamera.position.copy(perspCamera.position);
    orthoCameraRef.current = orthoCamera;

    // Câmera Ativa
    activeCameraRef.current = perspCamera;

    // Renderer WebGL com antialias e color space SRGB
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    canvasContainerRef.current.innerHTML = '';
    canvasContainerRef.current.appendChild(renderer.domElement);

    // OrbitControls otimizado para toque (Touch-First)
    const controls = new OrbitControls(perspCamera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 0.8;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;

    // Iluminação industrial
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(40, 60, 40);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.45);
    dirLight2.position.set(-40, -20, -40);
    scene.add(dirLight2);

    // Grid de chão
    const grid = new THREE.GridHelper(60, 60, 0x06b6d4, 0x94a3b8);
    grid.position.y = -0.05;
    const isDarkInit = document.documentElement.classList.contains('dark');
    const centerColor = isDarkInit ? new THREE.Color(0x475569) : new THREE.Color(0x94a3b8);
    const gridColor = isDarkInit ? new THREE.Color(0x1e293b) : new THREE.Color(0xe2e8f0);
    const colors = grid.geometry.attributes.color as THREE.BufferAttribute;
    if (colors) {
      const arr = colors.array as Float32Array;
      for (let i = 0; i < arr.length; i += 6) {
        const isCenter = i === Math.floor(arr.length / 2);
        const c = isCenter ? centerColor : gridColor;
        arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b;
        arr[i + 3] = c.r; arr[i + 4] = c.g; arr[i + 5] = c.b;
      }
      colors.needsUpdate = true;
    }
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = isDarkInit ? 0.35 : 0.45;
    scene.add(grid);
    gridRef.current = grid;

    // Grupo de Modelo
    const group = new THREE.Group();
    scene.add(group);
    modelGroupRef.current = group;

    // Loop de renderização
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      const curCam = activeCameraRef.current || perspCamera;
      cameraRef.current = curCam;
      renderer.render(scene, curCam);
    };
    animate();

    // Redimensionamento responsivo
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const currentAspect = w / h;

      if (perspCameraRef.current) {
        perspCameraRef.current.aspect = currentAspect;
        perspCameraRef.current.updateProjectionMatrix();
      }

      if (orthoCameraRef.current) {
        orthoCameraRef.current.left = (frustumSize * currentAspect) / -2;
        orthoCameraRef.current.right = (frustumSize * currentAspect) / 2;
        orthoCameraRef.current.top = frustumSize / 2;
        orthoCameraRef.current.bottom = frustumSize / -2;
        orthoCameraRef.current.updateProjectionMatrix();
      }

      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []); // Executa apenas UMA VEZ na montagem! NUNCA reinicia ao alternar tema!

  // 5. Centralizar Modelo na Visão (Fit View)
  const fitModelToView = useCallback(() => {
    if (!modelGroupRef.current || !controlsRef.current) return;

    const box = new THREE.Box3().setFromObject(modelGroupRef.current);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);

    if (perspCameraRef.current) {
      const fov = perspCameraRef.current.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
      cameraZ = Math.max(cameraZ, 5);
      perspCameraRef.current.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.5, center.z + cameraZ * 0.9);
      perspCameraRef.current.lookAt(center);
      perspCameraRef.current.updateProjectionMatrix();
    }

    if (orthoCameraRef.current && containerRef.current) {
      const w = containerRef.current.clientWidth || 800;
      const h = containerRef.current.clientHeight || 600;
      const currentAspect = w / h;
      const frustum = maxDim * 1.5;
      orthoCameraRef.current.left = (frustum * currentAspect) / -2;
      orthoCameraRef.current.right = (frustum * currentAspect) / 2;
      orthoCameraRef.current.top = frustum / 2;
      orthoCameraRef.current.bottom = frustum / -2;
      orthoCameraRef.current.position.set(center.x + maxDim, center.y + maxDim * 0.8, center.z + maxDim);
      orthoCameraRef.current.lookAt(center);
      orthoCameraRef.current.updateProjectionMatrix();
    }

    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  }, []);

  // 3. Montar malhas do modelo IFC na cena Three.js
  useEffect(() => {
    if (!modelData || !sceneRef.current) return;

    if (modelGroupRef.current && modelGroupRef.current !== modelData.sceneGroup) {
      sceneRef.current.remove(modelGroupRef.current);
    }

    const group = modelData.sceneGroup;
    modelGroupRef.current = group;
    sceneRef.current.add(group);

    // Enquadra a câmera automaticamente após carregar o modelo
    setTimeout(() => {
      fitModelToView();
    }, 150);
  }, [modelData, fitModelToView]);

  // 4. Aplicação de Filtros (Fase e Processo) e Cores de Produção idêntico ao modo desktop
  useEffect(() => {
    if (!modelGroupRef.current) return;

    modelGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const pmark = String(mesh.userData.pieceMark || '').trim().toUpperCase();
        const cleanMark = String(mesh.userData.cleanMark || pmark).trim().toUpperCase();
        const assMark = String(mesh.userData.assemblyMark || '').trim().toUpperCase();
        const cleanAssMark = String(mesh.userData.cleanAssemblyMark || cleanMark).trim().toUpperCase();

        // 1. Extração da fase deste elemento
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
        let prod: ProductionPieceStatus | undefined = undefined;
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

        // 3. Filtro de Fase: visibilidade da malha
        const isPhaseVisible =
          !selectedPhase ||
          selectedPhase === 'all' ||
          elementPhase === selectedPhase ||
          String(elementPhase).toLowerCase() === String(selectedPhase).toLowerCase();

        mesh.visible = isPhaseVisible;
        if (!isPhaseVisible) return;

        // 4. Mapeamento de processos industriais (Corte, Solda, Pintura, Expedição, Montagem)
        const procPointedMap: Record<string, number> = (prod && prod.processPointedQtds) || {};
        const procsDone: string[] = Array.isArray(prod?.processesCompleted) ? prod.processesCompleted : [];

        const hasMontagem = Boolean(procPointedMap['montagem'] > 0 || procsDone.some((p) => p.includes('montag')));
        const hasExpedicao = Boolean(procPointedMap['expedicao'] > 0 || procsDone.some((p) => p.includes('exped')));
        const hasPintura = Boolean(
          procPointedMap['pintura'] > 0 ||
          procPointedMap['pintura/galv'] > 0 ||
          procPointedMap['pintura / galvanizacao'] > 0 ||
          procPointedMap['galvanizacao'] > 0 ||
          procsDone.some((p) => p.includes('pint') || p.includes('galv'))
        );
        const hasSolda = Boolean(procPointedMap['solda'] > 0 || procsDone.some((p) => p.includes('sold')));
        const hasCorte = Boolean(procPointedMap['corte'] > 0 || procsDone.some((p) => p.includes('corte')));
        const hasDetalhamento = Boolean(
          (procPointedMap['detalhamento'] && procPointedMap['detalhamento'] > 0) ||
          (procPointedMap['detalh'] && procPointedMap['detalh'] > 0) ||
          procsDone.some((p) => p.includes('detalh')) ||
          prod?.hasDetalhamento
        );

        const hasAnyApontamento = hasMontagem || hasExpedicao || hasPintura || hasSolda || hasCorte || hasDetalhamento;

        const normalizeStr = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const targetProcKey = normalizeStr(String(selectedProcess || 'all'));

        const PROCESS_COLOR_MAP: Record<string, string> = {
          'corte': '#3b82f6',
          'solda': '#f97316',
          'pintura': '#10b981',
          'expedicao': '#06b6d4',
          'montagem': '#8b5cf6',
        };

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
              color: new THREE.Color(PROCESS_COLOR_MAP[targetProcKey] || '#22c55e'),
              metalness: 0.35,
              roughness: 0.45,
              depthWrite: true,
              side: THREE.DoubleSide,
            });
          } else {
            // SÓLIDO TRANSLÚCIDO ATENUADO (Ghost Solid a 8% - sem linhas)
            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#94a3b8'),
              metalness: 0.1,
              roughness: 0.8,
              transparent: true,
              opacity: 0.08,
              depthWrite: false,
              side: THREE.DoubleSide,
            });
          }
        } else {
          // --- MODO "TODOS OS PROCESSOS" ---
          if (hasAnyApontamento) {
            // RENDERIZA EM SÓLIDO COM A COR DA ETAPA MAIS AVANÇADA
            let pieceColorHex = '#a1a1aa';
            if (hasMontagem) {
              pieceColorHex = '#8b5cf6';
            } else if (hasExpedicao) {
              pieceColorHex = '#06b6d4';
            } else if (hasPintura) {
              pieceColorHex = '#10b981';
            } else if (hasSolda) {
              pieceColorHex = '#f97316';
            } else if (hasCorte) {
              pieceColorHex = '#3b82f6';
            } else if (hasDetalhamento) {
              pieceColorHex = '#a1a1aa';
            }

            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(pieceColorHex),
              metalness: 0.35,
              roughness: 0.45,
              depthWrite: true,
              side: THREE.DoubleSide,
            });
          } else {
            // NÃO TEM NENHUM APONTAMENTO: SÓLIDO TRANSLÚCIDO ATENUADO (Ghost Solid a 8%)
            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#94a3b8'),
              metalness: 0.1,
              roughness: 0.8,
              transparent: true,
              opacity: 0.08,
              depthWrite: false,
              side: THREE.DoubleSide,
            });
          }
        }

        // 4.3. Preserva o destaque magenta se a peça estiver selecionada pelo operador
        const ifcId = mesh.userData.ifcId;
        if (ifcId !== undefined && selectedElementsMapRef.current.has(ifcId)) {
          mesh.userData.originalMaterial = mesh.material;
          mesh.material = magentaMaterialRef.current;
        } else {
          mesh.userData.originalMaterial = mesh.material;
        }
      }
    });
  }, [selectedPhase, selectedProcess, productionData, selectedOF]);

  // 5. Interação Touch / Clique na Peça (Single Tap)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !modelGroupRef.current) return;

    const dx = e.clientX - pointerDownRef.current.x;
    const dy = e.clientY - pointerDownRef.current.y;
    const dt = Date.now() - pointerDownRef.current.time;

    // Filtra rotação e pinça touch: somente considera toque intencional (< 8px e < 350ms)
    if (Math.hypot(dx, dy) > 8 || dt > 350) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);
    let intersects = raycasterRef.current.intersectObjects(modelGroupRef.current.children, true);

    // Amostragem de tolerância radial para barras finas em touch
    if (intersects.length === 0) {
      const radiusOffsetsPx = [8, 16, 24];
      const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];
      for (const rPx of radiusOffsetsPx) {
        if (intersects.length > 0) break;
        for (const angle of angles) {
          const sampleX = mouseX + ((rPx * Math.cos(angle)) / rect.width) * 2;
          const sampleY = mouseY - ((rPx * Math.sin(angle)) / rect.height) * 2;
          raycasterRef.current.setFromCamera(new THREE.Vector2(sampleX, sampleY), cameraRef.current);
          const sampleHits = raycasterRef.current.intersectObjects(modelGroupRef.current.children, true);
          if (sampleHits.length > 0) {
            intersects = sampleHits;
            break;
          }
        }
      }
    }

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      let hitMesh: THREE.Mesh | null = null;
      if ((hitObj as THREE.Mesh).isMesh) hitMesh = hitObj as THREE.Mesh;
      else if (hitObj.parent && (hitObj.parent as THREE.Mesh).isMesh) hitMesh = hitObj.parent as THREE.Mesh;

      if (hitMesh && hitMesh.visible) {
        const targetIfcId = hitMesh.userData.ifcId;
        if (targetIfcId === undefined) return;

        const nextMap = new Map(selectedElementsMapRef.current);
        const isAlreadySelected = nextMap.has(targetIfcId);

        if (isAlreadySelected) {
          // Desmarca a peça física inteira
          const element = nextMap.get(targetIfcId)!;
          element.meshes.forEach((m) => {
            if (m.userData.originalMaterial) m.material = m.userData.originalMaterial;
          });
          nextMap.delete(targetIfcId);
          setSelectedElementsMap(nextMap);
          smartAudio.playClick();

          // Fecha o toast se for da peça desmarcada
          if (toastInfo?.piece.expressID === targetIfcId) {
            setToastInfo(null);
          }
        } else {
          // Marca a peça física inteira em Magenta permanente
          const relatedMeshes: THREE.Mesh[] = [];
          modelGroupRef.current.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && child.userData.ifcId === targetIfcId) {
              const m = child as THREE.Mesh;
              m.userData.originalMaterial = m.material;
              m.material = magentaMaterialRef.current;
              relatedMeshes.push(m);
            }
          });

          const pmark = hitMesh.userData.pieceMark;
          const phase = hitMesh.userData.phase;
          const piece: PieceInfo = (modelData && modelData.pieceByExpressID.get(targetIfcId)) || {
            expressID: targetIfcId,
            guid: '',
            name: hitMesh.userData.section || 'Peça',
            type: 'PIECE',
            pieceMark: pmark,
            section: hitMesh.userData.section,
            phase: phase,
          };

          nextMap.set(targetIfcId, {
            expressID: targetIfcId,
            piece,
            meshes: relatedMeshes,
          });
          setSelectedElementsMap(nextMap);
          smartAudio.playSuccess();

          // Abre o Toast discreto ao lado do toque com matching enriquecido
          let prodInfo: ProductionPieceStatus | undefined = undefined;
          if (productionData && productionData.size > 0 && pmark) {
            const searchKeys = [
              phase && selectedOF ? `${selectedOF}-${phase}-${pmark}` : '',
              phase ? `${phase}-${pmark}` : '',
              selectedOF ? `${selectedOF}-${pmark}` : '',
              pmark,
              pmark.toUpperCase(),
            ].filter(Boolean);
            for (const k of searchKeys) {
              const m = productionData.get(k);
              if (m) { prodInfo = m; break; }
            }
          }

          setToastInfo({
            piece,
            position: { x: e.clientX, y: e.clientY },
            prod: prodInfo,
          });
        }
      }
    }
  };

  // Limpar todas as seleções
  const handleClearSelection = useCallback(() => {
    smartAudio.playClick();
    selectedElementsMapRef.current.forEach(({ meshes }) => {
      meshes.forEach((m) => {
        if (m.userData.originalMaterial) m.material = m.userData.originalMaterial;
      });
    });
    setSelectedElementsMap(new Map());
    setToastInfo(null);
  }, []);

  const selectedCount = selectedElementsMap.size;

  // Lista consolidada de peças físicas para o modal de seleção (Print 3)
  const selectedPiecesList: SelectedPieceItem[] = useMemo(() => {
    return Array.from(selectedElementsMap.values()).map(({ expressID, piece }) => {
      const pmark = piece.pieceMark || 'Sem Marca';
      const phase = piece.phase;
      let prod: ProductionPieceStatus | undefined = undefined;
      if (productionData && productionData.size > 0 && pmark) {
        const searchKeys = [
          phase && selectedOF ? `${selectedOF}-${phase}-${pmark}` : '',
          phase ? `${phase}-${pmark}` : '',
          selectedOF ? `${selectedOF}-${pmark}` : '',
          pmark,
          pmark.toUpperCase(),
        ].filter(Boolean);
        for (const k of searchKeys) {
          const m = productionData.get(k);
          if (m) { prod = m; break; }
        }
      }

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
    });
  }, [selectedElementsMap, productionData, selectedOF]);

  // Orientação da Câmera pelo ViewCube
  const handleViewCubeSelect = (view: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'iso') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const target = controlsRef.current.target;
    const dist = cameraRef.current.position.distanceTo(target) || 30;

    switch (view) {
      case 'top': cameraRef.current.position.set(target.x, target.y + dist, target.z + 0.001); break;
      case 'bottom': cameraRef.current.position.set(target.x, target.y - dist, target.z + 0.001); break;
      case 'front': cameraRef.current.position.set(target.x, target.y, target.z + dist); break;
      case 'back': cameraRef.current.position.set(target.x, target.y, target.z - dist); break;
      case 'left': cameraRef.current.position.set(target.x - dist, target.y, target.z); break;
      case 'right': cameraRef.current.position.set(target.x + dist, target.y, target.z); break;
      case 'iso': cameraRef.current.position.set(target.x + dist * 0.7, target.y + dist * 0.6, target.z + dist * 0.7); break;
    }
    cameraRef.current.lookAt(target);
    controlsRef.current.update();
  };

  // Posição ajustada do Toast para não sair das bordas da tela
  const toastStyle = useMemo(() => {
    if (!toastInfo || !containerRef.current) return {};
    const rect = containerRef.current.getBoundingClientRect();
    let left = toastInfo.position.x - rect.left + 14;
    let top = toastInfo.position.y - rect.top - 20;

    if (left + 230 > rect.width) {
      left = Math.max(12, left - 245);
    }
    if (top + 160 > rect.height) {
      top = Math.max(12, rect.height - 170);
    }
    if (top < 12) top = 12;

    return { left: `${left}px`, top: `${top}px` };
  }, [toastInfo]);

  return (
    <div 
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="relative w-full h-full flex-1 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 select-none overflow-hidden touch-none transition-colors duration-200"
    >
      {/* Canvas Three.js */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* 1. Header Minimalista Flutuante (Touch-First) */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between gap-2 pointer-events-none">
        {/* Lado Esquerdo: Botão Voltar + Info da Obra + Botão Modo Claro/Escuro (Print 1) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              onVoltar();
            }}
            className="h-10 px-3 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 shadow-md backdrop-blur-md flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95"
            title="Voltar ao Menu Smart"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Voltar</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md flex flex-col justify-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              OF {selectedOF}
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px] sm:max-w-[200px]">
              {cliente || 'Obra Industrial'}
            </span>
          </div>

          {/* Botão Modo Claro / Modo Escuro (Print 1) */}
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              setTheme(isDark ? 'light' : 'dark');
            }}
            className="h-10 px-3 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 shadow-md backdrop-blur-md flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title={isDark ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
            <span className="hidden md:inline">{isDark ? 'Claro' : 'Escuro'}</span>
          </button>
        </div>

        {/* Lado Direito: Filtros Discretos (Fase & Processo) + Enquadrar */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Filtro por Fase */}
          <div className="relative">
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="h-10 pl-7 pr-3 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 text-xs font-bold backdrop-blur-md shadow-md appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500"
              title="Filtrar por Fase da Obra"
            >
              <option value="all">Todas as Fases</option>
              {phasesList.map((fase) => (
                <option key={fase} value={fase}>
                  Fase {fase}
                </option>
              ))}
            </select>
            <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 absolute left-2.5 top-3.5 pointer-events-none" />
          </div>

          {/* Filtro por Processo (Print 2: ordem dos botões de processos do modo completo) */}
          <div className="relative">
            <select
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
              className="h-10 pl-7 pr-3 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 text-xs font-bold backdrop-blur-md shadow-md appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
              title="Filtrar por Etapa Fabril"
            >
              {PROCESS_LIST.map((proc) => (
                <option key={proc.id} value={proc.id}>
                  {proc.nome}
                </option>
              ))}
            </select>
            <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 absolute left-2.5 top-3.5 pointer-events-none" />
          </div>

          {/* Botão Ligar/Desligar Grid (apenas ícone, sem texto) */}
          <button
            type="button"
            onClick={handleToggleGrid}
            className={`h-10 w-10 rounded-xl border shadow-md backdrop-blur-md flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              showGrid 
                ? 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400 border-cyan-300 dark:border-cyan-700/80 ring-1 ring-cyan-400/30' 
                : 'bg-white/90 dark:bg-slate-900/90 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={showGrid ? "Desativar Grade de Piso (Grid)" : "Ativar Grade de Piso (Grid)"}
          >
            <GridIcon className="w-4 h-4" />
          </button>

          {/* Botão Vista Ortogonal / Perspectiva (apenas ícone, sem texto) */}
          <button
            type="button"
            onClick={handleToggleCamera}
            className={`h-10 w-10 rounded-xl border shadow-md backdrop-blur-md flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isOrthographic
                ? 'bg-fuchsia-50 dark:bg-fuchsia-950/70 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-300 dark:border-fuchsia-700/80 ring-1 ring-fuchsia-400/30'
                : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isOrthographic ? "Alternar para Câmera Perspectiva" : "Alternar para Câmera Ortogonal (Paralela)"}
          >
            <Box className="w-4 h-4" />
          </button>

          {/* Botão Sininho de Notificações de Apontamento de Produção */}
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              clearAlert();
              setIsNotificationsOpen(true);
            }}
            className="relative h-10 w-10 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 shadow-md backdrop-blur-md flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Notificações de Apontamentos de Produção"
          >
            <Bell className={`w-4 h-4 ${hasNewAlert ? 'text-amber-500 animate-bounce' : 'text-slate-600 dark:text-slate-300'}`} />
            {hasNewAlert && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-white dark:border-slate-900"></span>
              </span>
            )}
            {unreadCount > 0 && !hasNewAlert && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-mono font-bold flex items-center justify-center border border-slate-300 dark:border-slate-700 pointer-events-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Botão Enquadrar (Fit View) */}
          <button
            type="button"
            onClick={fitModelToView}
            className="h-10 w-10 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 shadow-md backdrop-blur-md flex items-center justify-center transition-all active:scale-95"
            title="Enquadrar Modelo Centralizado"
          >
            <Maximize2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </button>
        </div>
      </div>

      {/* 2. Top Right: Cubo 3D Compacto + Card de Ações da Seleção (Print 3) */}
      <div className="absolute top-16 right-3 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Cubo Compacto Discreto */}
        <ViewCube 
          onSelectView={handleViewCubeSelect} 
          mainCameraRef={cameraRef} 
          size={56} 
          compact={true} 
        />

        {/* Card Flutuante de Seleção com "Gerar lista da seleção" (Print 3) */}
        {selectedCount > 0 && (
          <div
            className="flex flex-col items-stretch gap-1.5 p-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 shadow-xl dark:shadow-slate-950/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
            style={{ minWidth: '135px' }}
          >
            {/* Badge Indicador de Seleção Ativa */}
            <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 shadow-sm" />
              <span>
                {selectedCount} {selectedCount === 1 ? 'marcada' : 'marcadas'}
              </span>
            </div>

            {/* Botão Gerar Lista da Seleção (Print 3 - idêntico ao modo completo) */}
            <button
              type="button"
              onClick={() => {
                smartAudio.playClick();
                setIsSelectionModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-blue-950 hover:bg-blue-900 text-white shadow-sm dark:bg-blue-600 dark:hover:bg-blue-500 scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              title="Abrir lista detalhada e exportar planilha das peças selecionadas"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span className="whitespace-nowrap">Gerar lista</span>
            </button>

            {/* Botão Limpar Seleção */}
            <button
              type="button"
              onClick={handleClearSelection}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 dark:border-slate-700 dark:text-slate-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/30 active:scale-[0.98] transition-all cursor-pointer"
              title="Desmarcar todas as peças"
            >
              <Trash2 className="w-3 h-3" />
              <span className="whitespace-nowrap">Limpar Seleção</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Toast Discreto ao Lado da Peça Clicada */}
      {toastInfo && (
        <div
          onClick={() => {
            smartAudio.playClick();
            setToastInfo(null);
          }}
          style={toastStyle}
          className="absolute z-40 p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-fuchsia-500/50 shadow-2xl shadow-fuchsia-950/20 text-slate-800 dark:text-slate-100 min-w-[210px] max-w-[260px] animate-in fade-in zoom-in-95 duration-150 cursor-pointer pointer-events-auto select-none transition-all group"
          title="Toque no toast para fechar (a peça continua marcada)"
        >
          {/* Cabeçalho do Toast */}
          <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full bg-fuchsia-500 shadow-sm" />
              <span className="text-xs font-black text-fuchsia-600 dark:text-fuchsia-300 font-mono tracking-tight truncate">
                {toastInfo.piece.pieceMark || 'Sem Marca'}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setToastInfo(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dados Rápidos da Peça */}
          <div className="space-y-1 text-[11px]">
            {toastInfo.piece.phase && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Fase:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Fase {toastInfo.piece.phase}</span>
              </div>
            )}
            {toastInfo.piece.section && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Perfil:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                  {toastInfo.piece.section}
                </span>
              </div>
            )}
            {toastInfo.prod && (
              <div className="pt-1 mt-1 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Status:</span>
                <span 
                  className="font-bold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider"
                  style={{
                    backgroundColor: `${toastInfo.prod.processColor || '#10b981'}25`,
                    color: toastInfo.prod.processColor || '#10b981',
                  }}
                >
                  {toastInfo.prod.currentProcessName || 'Produção'} ({toastInfo.prod.pointedQtd}/{toastInfo.prod.totalQtd})
                </span>
              </div>
            )}
          </div>

          {/* Dica para Fechar */}
          <div className="mt-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-[9px] text-center text-slate-400 font-medium">
            Toque no card para fechar ✕
          </div>
        </div>
      )}

      {/* Modal de Lista e Exportação da Seleção 3D (Print 3) */}
      <SelectionListModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        selectedPieces={selectedPiecesList}
        selectedOF={selectedOF}
        onClearSelection={handleClearSelection}
      />

      {/* Modal de Notificações de Apontamentos da Produção */}
      <SmartNotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        ofFiltrar={selectedOF}
      />
    </div>
  );
};

