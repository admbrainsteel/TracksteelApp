import * as THREE from 'three';
import { VRMLLoader } from 'three-stdlib';
import { PieceInfo, LoadedIFCResult, IFCQualityAudit, getColorForMaterialName, isValidMark } from '@/lib/ifc/ifcLoaderService';

/**
 * Função utilitária para descompactar arquivos gzip (como .wrz ou .wrl comprimidos) no navegador.
 */
async function decompressGzipIfNeeded(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  // Assinatura mágica do GZIP: 0x1F, 0x8B
  if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const stream = new Blob([buffer]).stream();
        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        const response = new Response(decompressedStream);
        const decompressedBuffer = await response.arrayBuffer();
        return new TextDecoder('utf-8', { fatal: false }).decode(decompressedBuffer);
      } catch (err) {
        console.warn('[WRL Loader] Falha ao descomprimir GZIP nativo:', err);
      }
    }
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
}

/**
 * Heurística avançada para extrair e normalizar a marca da peça a partir do nó VRML (DEF).
 * Softwares como Tekla, Advance Steel, Bocad e outros exportam identificadores variados:
 * Ex: "DEF V101 Transform", "DEF Part_V101_1 Transform", "DEF C1_V101 Transform", "DEF 01-V101 Transform"
 */
function parseWrlNodeName(rawName: string): {
  pieceMark: string;
  cleanMark: string;
  assemblyMark?: string;
  cleanAssemblyMark?: string;
  phase?: string;
  detectedType: string;
} {
  let name = String(rawName || '').trim();

  // Remove caracteres especiais de escape ou tags extras
  name = name.replace(/^DEF\s+/i, '').replace(/[\{\}\[\]"']/g, '').trim();

  let phase: string | undefined = undefined;
  let assemblyMark: string | undefined = undefined;
  let pieceMark = name;

  // 1. Detecção de Fase no início (ex: "01-V101", "F1_V101", "B138-01-V101")
  const phaseMatch = name.match(/^(?:[A-Za-z0-9]+-)?(?:Fase|F|Etapa)?(\d+)[-_](.+)$/i);
  if (phaseMatch) {
    phase = phaseMatch[1];
    pieceMark = phaseMatch[2];
  }

  // 2. Remoção de prefixos comuns como "Part_", "Piece_", "Peca_", "Elem_", "Assembly_", "Conjunto_"
  pieceMark = pieceMark.replace(/^(?:Part|Piece|Peca|Elem|Item|Member|Profile|Mesh)[-_]/i, '');

  // 3. Detecção de Conjunto e Peça (ex: "C1_V101", "ASSEMBLY1-V101", "V101-PL1")
  if (pieceMark.includes('_') || pieceMark.includes('-')) {
    const parts = pieceMark.split(/[-_]/);
    if (parts.length >= 2) {
      // Se a primeira parte parecer um conjunto (ex: C1, M1, CONJ1)
      const first = parts[0].trim();
      const second = parts.slice(1).join('-').trim();
      if (/^(?:C|M|CONJ|ASS|G)\d+$/i.test(first)) {
        assemblyMark = first;
        pieceMark = second;
      }
    }
  }

  // 4. Marca limpa (remove sufixo de instância numérica gerada por exportadores, ex: "V101_1", "V101-2", "V101.1", "V101#1")
  let cleanMark = pieceMark.replace(/[-_.#]\d+$/, '').trim().toUpperCase();
  if (!cleanMark) {
    cleanMark = pieceMark.toUpperCase();
  }

  const cleanAssemblyMark = assemblyMark ? assemblyMark.replace(/[-_.#]\d+$/, '').trim().toUpperCase() : cleanMark;

  // 5. Detecção de Tipo de Elemento Estrutural com base na marca
  let detectedType = 'ELEMENT';
  const upper = cleanMark.toUpperCase();
  if (/^(?:V|VIGA|BEAM|VIG)/.test(upper)) {
    detectedType = 'BEAM';
  } else if (/^(?:P|PILAR|COL|COLUMN|PIL)/.test(upper)) {
    detectedType = 'COLUMN';
  } else if (/^(?:PL|CH|CHAPA|PLATE|GUSSET|BASE|FLANGE)/.test(upper)) {
    detectedType = 'PLATE';
  } else if (/^(?:CV|CONTRA|BRACE|TIE|DIAG)/.test(upper)) {
    detectedType = 'BRACE';
  } else if (/^(?:TER|TERCA|PURLIN)/.test(upper)) {
    detectedType = 'PURLIN';
  } else if (/^(?:T|TRENA|TIE|TIRANTE)/.test(upper)) {
    detectedType = 'TIE';
  }

  return {
    pieceMark: pieceMark.toUpperCase(),
    cleanMark,
    assemblyMark: assemblyMark ? assemblyMark.toUpperCase() : undefined,
    cleanAssemblyMark,
    phase,
    detectedType,
  };
}

/**
 * Carrega, analisa e gera estrutura idêntica ao IFC para modelos VRML (.wrl / .wrz).
 */
export async function loadAndAuditWRL(
  fileOrBuffer: File | ArrayBuffer,
  onProgress?: (percent: number, step: string) => void
): Promise<LoadedIFCResult> {
  if (onProgress) onProgress(15, 'Lendo arquivo WRL (VRML)...');

  let arrayBuffer: ArrayBuffer;
  if (fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    arrayBuffer = fileOrBuffer;
  }

  if (onProgress) onProgress(30, 'Descomprimindo e analisando formato VRML...');
  const vrmlText = await decompressGzipIfNeeded(arrayBuffer);

  if (onProgress) onProgress(50, 'Processando geometria 3D com motor VRML...');
  const loader = new VRMLLoader();
  let vrmlScene: THREE.Scene;

  try {
    vrmlScene = loader.parse(vrmlText, '');
  } catch (parseError: any) {
    console.error('[WRL Loader] Erro ao analisar VRML:', parseError);
    throw new Error(`Falha ao decodificar arquivo WRL: ${parseError.message || 'Formato VRML inválido'}`);
  }

  if (onProgress) onProgress(75, 'Mapeando peças estruturais e hierarquia...');

  const sceneGroup = new THREE.Group();
  sceneGroup.name = 'WRL_Root_Model';

  const piecesByMark = new Map<string, PieceInfo[]>();
  const pieceByExpressID = new Map<number, PieceInfo>();
  const weldedGroupMap = new Map<number, number[]>();
  const materialsByColor = new Map<string, THREE.Material>();
  const detectedPhasesSet = new Set<string>();

  let idCounter = 1;
  let totalMeshes = 0;
  let totalBeams = 0;
  let totalColumns = 0;
  let totalPlates = 0;
  let totalMembers = 0;
  const marksFound = new Set<string>();

  // Helper para buscar o nome do nó mais relevante na árvore
  const resolveMeaningfulNodeName = (mesh: THREE.Mesh): string => {
    let curr: THREE.Object3D | null = mesh;
    while (curr) {
      if (curr.name && !/^(Scene|Root|Group|Transform|Shape|IndexedFaceSet)$/i.test(curr.name.trim())) {
        return curr.name.trim();
      }
      curr = curr.parent;
    }
    return mesh.name || `PECA-${idCounter}`;
  };

  // Percorre todos os nós e malhas gerados pelo VRMLLoader
  vrmlScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      totalMeshes++;

      // Garante normais de vértices para iluminação perfeita
      if (mesh.geometry) {
        if (!mesh.geometry.attributes.normal) {
          mesh.geometry.computeVertexNormals();
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }

      const nodeName = resolveMeaningfulNodeName(mesh);
      const parsed = parseWrlNodeName(nodeName);

      const expressID = idCounter++;
      const guid = `wrl-${expressID}-${parsed.cleanMark}`;

      if (parsed.phase) {
        detectedPhasesSet.add(parsed.phase);
      }

      if (parsed.cleanMark && isValidMark(parsed.cleanMark)) {
        marksFound.add(parsed.cleanMark);
      }

      // Contabiliza tipos
      if (parsed.detectedType === 'BEAM') totalBeams++;
      else if (parsed.detectedType === 'COLUMN') totalColumns++;
      else if (parsed.detectedType === 'PLATE') totalPlates++;
      else totalMembers++;

      // Aplica material inicial elegante baseado na marca/perfil
      const baseColorHex = getColorForMaterialName(parsed.cleanMark || parsed.pieceMark);
      let material = materialsByColor.get(baseColorHex);
      if (!material) {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(baseColorHex),
          roughness: 0.45,
          metalness: 0.15,
          side: THREE.DoubleSide,
        });
        materialsByColor.set(baseColorHex, material);
      }
      mesh.material = material;

      const pieceInfo: PieceInfo = {
        expressID,
        guid,
        name: nodeName,
        type: parsed.detectedType,
        pieceMark: parsed.pieceMark,
        cleanMark: parsed.cleanMark,
        assemblyMark: parsed.assemblyMark,
        cleanAssemblyMark: parsed.cleanAssemblyMark,
        phase: parsed.phase,
        mesh,
      };

      // Injeta metadados essenciais no userData do Mesh (exatamente o que o ModelViewer3D espera)
      mesh.userData = {
        expressID,
        guid,
        pieceMark: parsed.pieceMark,
        cleanMark: parsed.cleanMark,
        assemblyMark: parsed.assemblyMark,
        cleanAssemblyMark: parsed.cleanAssemblyMark,
        phase: parsed.phase,
        type: parsed.detectedType,
        name: nodeName,
        pieceInfo,
        originalMaterial: material,
      };

      pieceByExpressID.set(expressID, pieceInfo);

      // Agrupa peças por marca
      const markKey = parsed.cleanMark || parsed.pieceMark;
      if (markKey) {
        const list = piecesByMark.get(markKey) || [];
        list.push(pieceInfo);
        piecesByMark.set(markKey, list);
      }
    }
  });

  // Adiciona a cena VRML ao grupo final
  sceneGroup.add(vrmlScene);

  // Normaliza dimensões e orientação: se o modelo estiver em milímetros (típico CAD metálico > 1000 unidades), converte para metros
  const bbox = new THREE.Box3().setFromObject(sceneGroup);
  const size = bbox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  // Se o modelo estiver em milímetros (ex: 20 metros = 20000mm)
  if (maxDim > 500) {
    const scaleFactor = 0.001;
    sceneGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
    sceneGroup.updateMatrixWorld(true);
  }

  // Gera auditoria de qualidade compatível
  const uniqueMarksFound = marksFound.size;
  const marksList = Array.from(marksFound).sort();
  const qualityScore: 'EXCELENTE' | 'BOM' | 'ATENÇÃO' =
    uniqueMarksFound > 0 ? (uniqueMarksFound >= 10 ? 'EXCELENTE' : 'BOM') : 'ATENÇÃO';

  const audit: IFCQualityAudit = {
    schema: 'VRML 2.0 (WRL)',
    viewDefinition: 'Virtual Reality Modeling Language 3D',
    isEM11: false,
    totalAssemblies: marksFound.size,
    totalBeams,
    totalColumns,
    totalMembers,
    totalPlates,
    totalFasteners: 0,
    totalStructuralElements: totalMeshes,
    totalWeldedGroups: 0,
    uniqueMarksFound,
    marksList,
    qualityScore,
    qualityMessage:
      uniqueMarksFound > 0
        ? `Modelo WRL carregado com sucesso. ${totalMeshes} malhas processadas e ${uniqueMarksFound} marcas identificadas para apontamento.`
        : `Modelo WRL carregado com ${totalMeshes} malhas. Nenhuma marca nominal identificada na geometria.`,
    fallbackActive: false,
  };

  if (onProgress) onProgress(100, 'Modelo WRL pronto para visualização!');

  return {
    sceneGroup,
    audit,
    piecesByMark,
    pieceByExpressID,
    weldedGroupMap,
    materialsByColor,
    totalMeshes,
    detectedPhases: Array.from(detectedPhasesSet).sort(),
  };
}
