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

  // Remove prefixos de sanitização interna se houver
  name = name.replace(/^ID_/, '');

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
 * Sanitiza o texto VRML para compatibilidade com o parser do Three.js:
 * 1. Ajusta cabeçalho para #VRML V2.0 utf8.
 * 2. Converte identificadores que iniciam com dígitos ou contêm hífens para identificadores válidos.
 */
function sanitizeVrmlForLoader(rawText: string): {
  sanitized: string;
  nameMap: Map<string, string>;
} {
  const nameMap = new Map<string, string>();
  let text = rawText.replace(/^\uFEFF/, ''); // remove BOM

  // Localiza o início da tag #VRML
  const headerIdx = text.search(/#VRML/i);
  if (headerIdx > 0) {
    text = text.slice(headerIdx);
  }

  // Normaliza primeira linha para #VRML V2.0 utf8
  text = text.replace(/^#VRML[^\r\n]*/i, '#VRML V2.0 utf8');

  // Normaliza identificadores em DEF e USE (ex: "DEF 01-V101 Transform" -> "DEF ID_01_V101 Transform")
  text = text.replace(/\b(DEF|USE)\s+([^\s\{\[\(\)]+)/g, (_, keyword, rawId) => {
    let cleanId = String(rawId).replace(/[^a-zA-Z0-9_]/g, '_');
    if (/^[0-9]/.test(cleanId)) {
      cleanId = 'ID_' + cleanId;
    }
    nameMap.set(cleanId, rawId);
    return `${keyword} ${cleanId}`;
  });

  return { sanitized: text, nameMap };
}

/**
 * Parser de Fallback Direto e Resiliente para arquivos VRML (.wrl 1.0 ou 2.0).
 * Extrai blocos IndexedFaceSet com Coordinate/Coordinate3 diretamente via expressões regulares,
 * garantindo renderização mesmo quando o parser Chevrotain do VRMLLoader encontra erros de sintaxe.
 */
function parseVrmlDirectFallback(
  vrmlText: string,
  nameMap: Map<string, string>
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'WRL_Direct_Fallback_Root';

  // Procura ocorrências de DEF <nome> associadas a IndexedFaceSet
  // Suporta tanto VRML 1.0 (Separator, Coordinate3) quanto VRML 2.0 (Shape, Coordinate, Transform)
  const defRegex = /DEF\s+([^\s\{\[\(\)]+)[\s\S]*?(?:point\s*\[([\s\S]*?)\])[\s\S]*?(?:coordIndex\s*\[([\s\S]*?)\])/gi;
  let match: RegExpExecArray | null;
  let count = 0;

  while ((match = defRegex.exec(vrmlText)) !== null) {
    count++;
    const rawDefName = match[1].trim();
    const originalName = nameMap.get(rawDefName) || rawDefName;
    const pointStr = match[2];
    const indexStr = match[3];

    // Extrai vértices flutuantes (x, y, z)
    const rawCoords = pointStr.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (rawCoords.length < 9) continue; // mínimo 3 vértices (1 triângulo)

    const vertices: [number, number, number][] = [];
    for (let i = 0; i < rawCoords.length; i += 3) {
      if (!isNaN(rawCoords[i]) && !isNaN(rawCoords[i + 1]) && !isNaN(rawCoords[i + 2])) {
        vertices.push([rawCoords[i], rawCoords[i + 1], rawCoords[i + 2]]);
      }
    }

    if (vertices.length === 0) continue;

    // Extrai índices de faces separados por -1
    const rawIndices = indexStr.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const triangleIndices: number[] = [];
    let currentPoly: number[] = [];

    for (const idx of rawIndices) {
      if (idx === -1) {
        if (currentPoly.length >= 3) {
          // Triangulação em leque (fan triangulation)
          for (let p = 1; p < currentPoly.length - 1; p++) {
            triangleIndices.push(currentPoly[0], currentPoly[p], currentPoly[p + 1]);
          }
        }
        currentPoly = [];
      } else {
        currentPoly.push(idx);
      }
    }

    if (currentPoly.length >= 3) {
      for (let p = 1; p < currentPoly.length - 1; p++) {
        triangleIndices.push(currentPoly[0], currentPoly[p], currentPoly[p + 1]);
      }
    }

    if (triangleIndices.length === 0) continue;

    const positions: number[] = [];
    for (const tIdx of triangleIndices) {
      const v = vertices[tIdx];
      if (v) {
        positions.push(v[0], v[1], v[2]);
      }
    }

    if (positions.length === 0) continue;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry);
    mesh.name = originalName;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Se a busca com DEF não encontrou malhas, busca todos os point/coordIndex sem DEF
  if (count === 0) {
    const genericRegex = /point\s*\[([\s\S]*?)\][\s\S]*?coordIndex\s*\[([\s\S]*?)\]/gi;
    let genMatch: RegExpExecArray | null;
    let genIdx = 1;

    while ((genMatch = genericRegex.exec(vrmlText)) !== null) {
      const pointStr = genMatch[1];
      const indexStr = genMatch[2];

      const rawCoords = pointStr.trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (rawCoords.length < 9) continue;

      const vertices: [number, number, number][] = [];
      for (let i = 0; i < rawCoords.length; i += 3) {
        if (!isNaN(rawCoords[i]) && !isNaN(rawCoords[i + 1]) && !isNaN(rawCoords[i + 2])) {
          vertices.push([rawCoords[i], rawCoords[i + 1], rawCoords[i + 2]]);
        }
      }

      const rawIndices = indexStr.trim().split(/[\s,]+/).filter(Boolean).map(Number);
      const triangleIndices: number[] = [];
      let currentPoly: number[] = [];

      for (const idx of rawIndices) {
        if (idx === -1) {
          if (currentPoly.length >= 3) {
            for (let p = 1; p < currentPoly.length - 1; p++) {
              triangleIndices.push(currentPoly[0], currentPoly[p], currentPoly[p + 1]);
            }
          }
          currentPoly = [];
        } else {
          currentPoly.push(idx);
        }
      }

      if (currentPoly.length >= 3) {
        for (let p = 1; p < currentPoly.length - 1; p++) {
          triangleIndices.push(currentPoly[0], currentPoly[p], currentPoly[p + 1]);
        }
      }

      const positions: number[] = [];
      for (const tIdx of triangleIndices) {
        const v = vertices[tIdx];
        if (v) positions.push(v[0], v[1], v[2]);
      }

      if (positions.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(geometry);
        mesh.name = `PECA-${genIdx++}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
    }
  }

  return group;
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
  const rawVrmlText = await decompressGzipIfNeeded(arrayBuffer);

  if (onProgress) onProgress(45, 'Sanitizando identificadores e sintaxe VRML...');
  const { sanitized: vrmlText, nameMap } = sanitizeVrmlForLoader(rawVrmlText);

  if (onProgress) onProgress(60, 'Processando geometria 3D com motor VRML...');
  const loader = new VRMLLoader();
  let vrmlScene: THREE.Object3D;
  let isFallback = false;

  try {
    vrmlScene = loader.parse(vrmlText, '');
  } catch (parseError: any) {
    console.warn('[WRL Loader] VRMLLoader padrão falhou, acionando fallback direto resiliente:', parseError?.message);
    if (onProgress) onProgress(65, 'Acionando decodificador direto de geometria VRML...');
    vrmlScene = parseVrmlDirectFallback(rawVrmlText, nameMap);
    isFallback = true;
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
      if (curr.name && !/^(Scene|Root|Group|Transform|Shape|IndexedFaceSet|WRL_Direct_Fallback_Root)$/i.test(curr.name.trim())) {
        const mapped = nameMap.get(curr.name.trim()) || curr.name.trim();
        return mapped;
      }
      curr = curr.parent;
    }
    return mesh.name || `PECA-${idCounter}`;
  };

  // Percorre todos os nós e malhas gerados
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

      const rawNodeName = resolveMeaningfulNodeName(mesh);
      const parsed = parseWrlNodeName(rawNodeName);

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
        name: rawNodeName,
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
        name: rawNodeName,
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
    schema: isFallback ? 'VRML Direto (WRL Resiliente)' : 'VRML 2.0 (WRL)',
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
        ? `Modelo WRL processado com sucesso. ${totalMeshes} malhas renderizadas e ${uniqueMarksFound} marcas identificadas para apontamento.`
        : `Modelo WRL processado com ${totalMeshes} malhas. Nenhuma marca nominal identificada na geometria.`,
    fallbackActive: isFallback,
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
