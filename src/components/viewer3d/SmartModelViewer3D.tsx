import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LoadedIFCResult, PieceInfo } from '@/lib/ifc/ifcLoaderService';
import { ViewCube } from './ViewCube';
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
  Check
} from 'lucide-react';

export interface ProductionPieceStatus {
  marca: string;
  etapa_fase: string;
  totalQtd: number;
  pointedQtd: number;
  currentProcessName?: string;
  processColor?: string;
  processOrdem?: number;
}

interface SmartModelViewer3DProps {
  modelData: LoadedIFCResult | null;
  productionData?: Map<string, ProductionPieceStatus>;
  selectedOF: string;
  cliente?: string;
  phasesList: string[];
  onVoltar: () => void;
}

const PROCESS_LIST = [
  { id: 'all', nome: 'Todos os Processos', cor: '#06b6d4' },
  { id: 'corte', nome: 'Corte', cor: '#3b82f6' },
  { id: 'montagem', nome: 'Montagem', cor: '#6366f1' },
  { id: 'solda', nome: 'Solda', cor: '#f97316' },
  { id: 'pintura', nome: 'Pintura', cor: '#10b981' },
  { id: 'concluido', nome: 'Concluído', cor: '#22c55e' },
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
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());

  // Filtros principais solicitados: Fase e Processo
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedProcess, setSelectedProcess] = useState<string>('all');

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

  // Rastreamento para diferenciar gesto touch/drag de toque simples (Tap)
  const pointerDownRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // 1. Inicialização do Three.js e OrbitControls Touch-First
  useEffect(() => {
    if (!containerRef.current || !canvasContainerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Cena
    const scene = new THREE.Scene();
    scene.background = null; // Fundo transparente controlado por Tailwind
    sceneRef.current = scene;

    // Câmera Perspectiva otimizada para campo de visão amplo em telas touch
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 10000);
    camera.position.set(25, 20, 30);
    cameraRef.current = camera;

    // Renderer WebGL com antialias e color space SRGB
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    canvasContainerRef.current.innerHTML = '';
    canvasContainerRef.current.appendChild(renderer.domElement);

    // OrbitControls otimizado para toque (Touch-First)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 0.8;
    // 1 dedo: Rotação suave | 2 dedos: Pinça para zoom + arrastar para pan
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;

    // Iluminação balanceada para aço industrial
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(40, 60, 40);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.45);
    dirLight2.position.set(-40, -20, -40);
    scene.add(dirLight2);

    // Grid suave de chão
    const grid = new THREE.GridHelper(60, 60, 0x06b6d4, 0x94a3b8);
    (grid.material as THREE.Material).opacity = 0.15;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -0.05;
    scene.add(grid);

    // Grupo de Modelo
    const group = new THREE.Group();
    scene.add(group);
    modelGroupRef.current = group;

    // Loop de renderização
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Redimensionamento responsivo
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // 2. Centralizar Modelo na Visão (Fit View)
  const fitModelToView = useCallback(() => {
    if (!modelGroupRef.current || !cameraRef.current || !controlsRef.current) return;

    const box = new THREE.Box3().setFromObject(modelGroupRef.current);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
    cameraZ = Math.max(cameraZ, 5);

    cameraRef.current.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.5, center.z + cameraZ * 0.9);
    cameraRef.current.lookAt(center);
    cameraRef.current.updateProjectionMatrix();

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

  // 4. Aplicação de Filtros (Fase e Processo) e Cores de Produção
  useEffect(() => {
    if (!modelGroupRef.current) return;

    const targetPhaseClean = selectedPhase !== 'all' ? String(selectedPhase).trim().toLowerCase() : null;
    const targetProcessNorm = selectedProcess !== 'all' 
      ? selectedProcess.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() 
      : null;

    modelGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const meshPhase = mesh.userData.phase ? String(mesh.userData.phase).trim().toLowerCase() : '';
        const pieceMark = mesh.userData.pieceMark ? String(mesh.userData.pieceMark).trim().toUpperCase() : '';
        const prod = productionData?.get(pieceMark);

        // 4.1. Filtro de Fase: visibilidade da malha
        let isPhaseVisible = true;
        if (targetPhaseClean) {
          isPhaseVisible = meshPhase === targetPhaseClean;
        }
        mesh.visible = isPhaseVisible;

        if (!isPhaseVisible) return;

        // 4.2. Aplicação de Cor por Processo / Produção
        let pieceColorHex = '#a1a1aa'; // Padrão cinza neutro
        let isDimmed = false;

        if (prod && prod.pointedQtd > 0) {
          const currNorm = (prod.currentProcessName || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

          // Determina a cor base do processo
          if (currNorm.includes('corte')) pieceColorHex = '#3b82f6';
          else if (currNorm.includes('montag')) pieceColorHex = '#6366f1';
          else if (currNorm.includes('solda')) pieceColorHex = '#f97316';
          else if (currNorm.includes('pintu')) pieceColorHex = '#10b981';
          else if (currNorm.includes('conclu')) pieceColorHex = '#22c55e';
          else pieceColorHex = prod.processColor || '#10b981';

          // Se houver filtro de processo ativo, atenua peças de outros processos
          if (targetProcessNorm && !currNorm.includes(targetProcessNorm)) {
            isDimmed = true;
          }
        } else {
          // Sem apontamento na produção: cinza atenuado se houver filtro de processo
          if (targetProcessNorm) {
            isDimmed = true;
          }
        }

        // Se está atenuado pelo filtro de processo, aplica opacidade fantasma
        if (isDimmed) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#94a3b8'),
            metalness: 0.1,
            roughness: 0.8,
            transparent: true,
            opacity: 0.12,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
        } else {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(pieceColorHex),
            metalness: 0.3,
            roughness: 0.45,
            side: THREE.DoubleSide,
          });
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
  }, [selectedPhase, selectedProcess, productionData]);

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
          setSelectedElementsMap(nextMap);
          smartAudio.playSuccess();

          // Abre o Toast discreto ao lado do toque
          const prodInfo = pmark ? productionData?.get(pmark) : undefined;
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

    // Se estiver muito à direita, joga para a esquerda do cursor
    if (left + 230 > rect.width) {
      left = Math.max(12, left - 245);
    }
    // Se estiver muito abaixo, sobe
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
      className="relative w-full h-full flex-1 bg-slate-950 text-slate-100 select-none overflow-hidden touch-none"
    >
      {/* Canvas Three.js */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* 1. Header Minimalista Flutuante (Touch-First) */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between gap-2 pointer-events-none">
        {/* Lado Esquerdo: Botão Voltar + Info da Obra */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              onVoltar();
            }}
            className="h-10 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700/80 shadow-md backdrop-blur-md flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95"
            title="Voltar ao Menu Smart"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Voltar</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 shadow-md flex flex-col justify-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400">
              OF {selectedOF}
            </span>
            <span className="text-xs font-bold text-slate-200 truncate max-w-[120px] sm:max-w-[200px]">
              {cliente || 'Obra Industrial'}
            </span>
          </div>
        </div>

        {/* Lado Direito: Filtros Discretos (Fase & Processo) + Enquadrar */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Filtro por Fase */}
          <div className="relative">
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="h-10 pl-7 pr-3 rounded-xl bg-slate-900/90 text-slate-200 border border-slate-700/80 text-xs font-bold backdrop-blur-md shadow-md appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500"
              title="Filtrar por Fase da Obra"
            >
              <option value="all">Todas as Fases</option>
              {phasesList.map((fase) => (
                <option key={fase} value={fase}>
                  Fase {fase}
                </option>
              ))}
            </select>
            <Layers className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-3.5 pointer-events-none" />
          </div>

          {/* Filtro por Processo */}
          <div className="relative">
            <select
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
              className="h-10 pl-7 pr-3 rounded-xl bg-slate-900/90 text-slate-200 border border-slate-700/80 text-xs font-bold backdrop-blur-md shadow-md appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
              title="Filtrar por Etapa Fabril"
            >
              {PROCESS_LIST.map((proc) => (
                <option key={proc.id} value={proc.id}>
                  {proc.nome}
                </option>
              ))}
            </select>
            <Activity className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-3.5 pointer-events-none" />
          </div>

          {/* Botão Enquadrar (Fit View) */}
          <button
            type="button"
            onClick={fitModelToView}
            className="h-10 w-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-md backdrop-blur-md flex items-center justify-center transition-all active:scale-95"
            title="Enquadrar Modelo Centralizado"
          >
            <Maximize2 className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* 2. Top Right: Cubo 3D Compacto + Botão Limpar Seleção */}
      <div className="absolute top-16 right-3 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Cubo Compacto Discreto */}
        <ViewCube 
          onSelectView={handleViewCubeSelect} 
          mainCameraRef={cameraRef} 
          size={56} 
          compact={true} 
        />

        {/* Botão Limpar Seleção (Apenas quando houver peças marcadas) */}
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={handleClearSelection}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/95 hover:bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-lg backdrop-blur-md text-[11px] font-bold animate-in fade-in zoom-in-95 duration-150 active:scale-95 transition-all"
            title="Desmarcar todas as peças"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
            <span>{selectedCount} {selectedCount === 1 ? 'marcada' : 'marcadas'}</span>
            <span className="text-slate-500">|</span>
            <span className="text-rose-400 hover:text-white">Limpar ✕</span>
          </button>
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
          className="absolute z-40 p-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-fuchsia-500/50 shadow-2xl shadow-fuchsia-950/50 text-slate-100 min-w-[210px] max-w-[260px] animate-in fade-in zoom-in-95 duration-150 cursor-pointer pointer-events-auto select-none transition-all group"
          title="Toque no toast para fechar (a peça continua marcada)"
        >
          {/* Cabeçalho do Toast */}
          <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full bg-fuchsia-500 shadow-sm" />
              <span className="text-xs font-black text-fuchsia-300 font-mono tracking-tight truncate">
                {toastInfo.piece.pieceMark || 'Sem Marca'}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setToastInfo(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dados Rápidos da Peça */}
          <div className="space-y-1 text-[11px]">
            {toastInfo.piece.phase && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Fase:</span>
                <span className="font-bold text-slate-200">Fase {toastInfo.piece.phase}</span>
              </div>
            )}
            {toastInfo.piece.section && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Perfil:</span>
                <span className="font-mono font-semibold text-slate-100 truncate max-w-[120px]">
                  {toastInfo.piece.section}
                </span>
              </div>
            )}
            {toastInfo.prod && (
              <div className="pt-1 mt-1 border-t border-slate-800/80 flex items-center justify-between">
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
          <div className="mt-2 pt-1 border-t border-slate-800 text-[9px] text-center text-slate-400 font-medium">
            Toque no card para fechar ✕
          </div>
        </div>
      )}
    </div>
  );
};
