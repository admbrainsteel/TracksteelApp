import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';

interface ViewCubeProps {
  onSelectView: (view: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'iso') => void;
  mainCameraRef?: React.MutableRefObject<THREE.Camera | null>;
}

export const ViewCube: React.FC<ViewCubeProps> = ({ onSelectView, mainCameraRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const wireframeRef = useRef<THREE.LineSegments | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  useEffect(() => {
    if (!containerRef.current) return;

    const width = 84;
    const height = 84;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const frustum = 55;
    const camera = new THREE.OrthographicCamera(
      frustum / -2,
      frustum / 2,
      frustum / 2,
      frustum / -2,
      1,
      500
    );
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 2. Renderer Transparente
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // 3. Helper to create high-res Canvas Texture for each face
    const createFaceTexture = (text: string, isDark: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Face Background: Azul petróleo equilibrado no claro (#1e293b) e escuro (#0f172a)
        ctx.fillStyle = isDark ? '#0f172a' : '#1e293b';
        ctx.fillRect(0, 0, 256, 256);

        // Neon Cyan Border (#0891b2 no claro / #22d3ee no escuro)
        ctx.strokeStyle = isDark ? '#22d3ee' : '#06b6d4';
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, 242, 242);

        // Inner soft cyan glow
        ctx.strokeStyle = isDark ? 'rgba(34, 211, 238, 0.4)' : 'rgba(6, 182, 212, 0.3)';
        ctx.lineWidth = 6;
        ctx.strokeRect(18, 18, 220, 220);

        // Text: Bold Sans-Serif (#ffffff with Cyan Glow)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 54px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = isDark ? '#06b6d4' : '#0891b2';
        ctx.shadowBlur = isDark ? 12 : 8;
        ctx.fillText(text, 128, 128);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const isDarkMode = document.documentElement.classList.contains('dark');

    // Faces: 0: Right (DIR), 1: Left (ESQ), 2: Top (TOPO), 3: Bottom (BASE), 4: Front (FRENTE), 5: Back (ATRÁS)
    const materials = [
      new THREE.MeshBasicMaterial({ map: createFaceTexture('DIR', isDarkMode) }),
      new THREE.MeshBasicMaterial({ map: createFaceTexture('ESQ', isDarkMode) }),
      new THREE.MeshBasicMaterial({ map: createFaceTexture('TOPO', isDarkMode) }),
      new THREE.MeshBasicMaterial({ map: createFaceTexture('BASE', isDarkMode) }),
      new THREE.MeshBasicMaterial({ map: createFaceTexture('FRENTE', isDarkMode) }),
      new THREE.MeshBasicMaterial({ map: createFaceTexture('ATRÁS', isDarkMode) }),
    ];

    const geometry = new THREE.BoxGeometry(32, 32, 32);
    const cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);
    cubeRef.current = cube;

    // Glowing Neon Edges on the Cube
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: isDarkMode ? 0x22d3ee : 0x06b6d4,
      linewidth: 2,
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    cube.add(wireframe);
    wireframeRef.current = wireframe;

    // Função de atualização quando o tema mudar
    const updateThemeMaterials = () => {
      const dark = document.documentElement.classList.contains('dark');
      const labels = ['DIR', 'ESQ', 'TOPO', 'BASE', 'FRENTE', 'ATRÁS'];
      materials.forEach((mat, idx) => {
        if (mat.map) mat.map.dispose();
        mat.map = createFaceTexture(labels[idx], dark);
        mat.needsUpdate = true;
      });
      if (wireframeRef.current && wireframeRef.current.material) {
        (wireframeRef.current.material as THREE.LineBasicMaterial).color.set(dark ? 0x22d3ee : 0x06b6d4);
      }
    };

    const themeObserver = new MutationObserver(() => {
      updateThemeMaterials();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // 4. Animation Loop: Sincroniza com a câmera principal em tempo real
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (mainCameraRef && mainCameraRef.current && cubeRef.current) {
        // Copia a orientação da câmera principal invertida para o cubo navegar sincronizado
        cubeRef.current.quaternion.copy(mainCameraRef.current.quaternion).invert();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // 5. Interactivity: Click face to switch view
    const handleCanvasClick = (event: MouseEvent) => {
      if (!renderer.domElement || !cubeRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObject(cubeRef.current);

      if (intersects.length > 0) {
        const faceIndex = intersects[0].face?.materialIndex;
        switch (faceIndex) {
          case 0:
            onSelectView('right');
            break;
          case 1:
            onSelectView('left');
            break;
          case 2:
            onSelectView('top');
            break;
          case 3:
            onSelectView('bottom');
            break;
          case 4:
            onSelectView('front');
            break;
          case 5:
            onSelectView('back');
            break;
          default:
            onSelectView('iso');
        }
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('click', handleCanvasClick);
      themeObserver.disconnect();
      materials.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
      geometry.dispose();
      renderer.dispose();
    };
  }, [onSelectView, mainCameraRef]);

  return (
    <div className="relative select-none flex flex-col items-center">
      {/* Container Reduzido (~70%) Harmonizado para Modo Claro e Escuro */}
      <div className="relative w-24 h-24 p-1 rounded-2xl bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl border border-slate-200 dark:border-cyan-500/40 shadow-lg dark:shadow-xl dark:shadow-cyan-950/60 flex items-center justify-center cursor-pointer group transition-all">
        {/* Glow sutil harmonizado */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 dark:from-cyan-500/10 via-transparent to-blue-500/5 dark:to-blue-500/10 rounded-2xl pointer-events-none" />

        {/* Canvas WebGL 3D do Cubo Sincronizado */}
        <div ref={containerRef} className="w-[84px] h-[84px] flex items-center justify-center" />

        {/* Botão ISO no canto inferior harmonizado com o tema */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectView('iso');
          }}
          className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-slate-100 hover:bg-cyan-600 text-slate-700 hover:text-white border border-slate-300 hover:border-cyan-500 dark:bg-slate-900/90 dark:text-cyan-300 dark:border-cyan-500/30 transition-all text-[9px] font-mono font-bold flex items-center gap-0.5 shadow-sm cursor-pointer"
          title="Restaurar Vista Isométrica 3D"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>ISO</span>
        </button>
      </div>

      {/* Rótulo inferior */}
      <span className="text-[8px] font-mono font-bold tracking-widest uppercase text-cyan-800 dark:text-cyan-400 mt-0.5">
        Cubo 3D
      </span>
    </div>
  );
};
