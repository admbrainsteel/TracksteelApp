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
 * Extrai a Fase da estrutura a partir dos ancestrais na árvore 3D (ex: "00001_COLUNAS", "00004_GUARDA_CORPO").
 * Garante que apenas o nó de primeiro nível (raiz da cena) ou nós explicitamente marcados como FASE/ETAPA sejam considerados.
 * Evita rigorosamente que marcas de montagem (ex: "106", "121") ou dimensões (ex: "10x57", "1127") sejam confundidas com fases.
 */
function extractPhaseFromAncestors(ancestors: string[]): string | undefined {
  if (!ancestors || ancestors.length === 0) return undefined;

  // 1. O nó de primeiro nível (ancestors[0]) representa a pasta raiz no WRL (ex: "00001_COLUNAS", "00004_GUARDA_CORPO")
  const rootNode = ancestors[0].replace(/^DEF\s+/i, '').replace(/^ID_/, '').trim();

  // Padrão Tekla / Bocad com prefixo numérico seguido de nome de grupo (ex: "00001_COLUNAS", "00004_GUARDA_CORPO")
  const mZeros = rootNode.match(/^(?:0*([1-9]\d*))[-_ ]+([A-Za-zÀ-ÿ]+.*)$/i);
  if (mZeros) {
    return String(Number(mZeros[1])); // "1", "2", "3", "4"
  }

  // Padrão explícito na raiz "FASE 1", "FASE_01", "ETAPA 2"
  const mRootFase = rootNode.match(/^(?:fase|etapa|phase|stage)[-_ ]*0*([1-9]\d*)/i);
  if (mRootFase) {
    return String(Number(mRootFase[1]));
  }

  // 2. Se o primeiro nó não for fase, pesquisa nos ancestrais intermediários APENAS se contiver palavra-chave explícita FASE ou ETAPA
  for (let i = 1; i < ancestors.length; i++) {
    const clean = ancestors[i].replace(/^DEF\s+/i, '').replace(/^ID_/, '').trim();
    const mExplicit = clean.match(/^(?:fase|etapa|phase|stage)[-_ ]*0*([1-9]\d*)/i);
    if (mExplicit) {
      return String(Number(mExplicit[1]));
    }
  }

  return undefined;
}

/**
 * Analisa e normaliza a marca da peça, marca do conjunto e tipo estrutural,
 * levando em conta a hierarquia de pastas (ex: Fase -> Conjunto '121' -> Componente '121_1127_TUBO...').
 */
function parseWrlNodeName(
  rawName: string,
  inheritedPhase?: string,
  ancestorAssembly?: string
): {
  pieceMark: string;
  cleanMark: string;
  assemblyMark?: string;
  cleanAssemblyMark?: string;
  phase?: string;
  detectedType: string;
} {
  let name = String(rawName || '').trim();

  // Remove prefixos internos
  name = name.replace(/^ID_/, '').replace(/^DEF\s+/i, '').replace(/[\{\}\[\]"']/g, '').trim();

  let assemblyMark = ancestorAssembly ? ancestorAssembly.trim() : undefined;
  let pieceMark = name;
  let profile = '';

  // Formato padrão Tekla/Bocad: [Conjunto]_[Peca]_[Perfil]_[Instancia]
  // Ex: "121_1127_TUBO44x45X3_121293" -> assembly="121", piece="1127", profile="TUBO44x45X3"
  const parts = name.split('_');

  if (parts.length >= 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
    assemblyMark = parts[0];
    pieceMark = parts[1];
    profile = parts[2];
  } else if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
    assemblyMark = parts[0];
    pieceMark = parts[1];
    if (parts.length > 2) profile = parts.slice(2).join('_');
  } else if (/^(?:PARAF|BOLT)/i.test(name)) {
    pieceMark = parts[0];
    profile = 'PARAFUSO';
  } else {
    // Remoção de prefixos comuns como "Part_", "Piece_", "Peca_", "Elem_"
    pieceMark = pieceMark.replace(/^(?:Part|Piece|Peca|Elem|Item|Member|Profile|Mesh)[-_]/i, '');
  }

  let cleanMark = pieceMark.replace(/[-_.#]\d+$/, '').trim().toUpperCase();
  if (!cleanMark) cleanMark = pieceMark.toUpperCase();

  const cleanAssemblyMark = assemblyMark ? assemblyMark.replace(/[-_.#]\d+$/, '').trim().toUpperCase() : cleanMark;

  // Detecção de tipo de elemento estrutural
  let detectedType = 'ELEMENT';
  const searchStr = `${profile} ${name} ${cleanMark}`.toUpperCase();

  if (searchStr.includes('VIGA') || searchStr.includes('BEAM') || cleanMark.startsWith('V')) {
    detectedType = 'BEAM';
  } else if (searchStr.includes('COLUNA') || searchStr.includes('PILAR') || searchStr.includes('COLUMN') || cleanMark.startsWith('P')) {
    detectedType = 'COLUMN';
  } else if (searchStr.includes('CHAPA') || searchStr.includes('PLATE') || cleanMark.startsWith('PL') || cleanMark.startsWith('CH')) {
    detectedType = 'PLATE';
  } else if (searchStr.includes('TUBO') || searchStr.includes('TUBE') || searchStr.includes('ROBN')) {
    detectedType = 'TUBE';
  } else if (searchStr.includes('PARAF') || searchStr.includes('BOLT')) {
    detectedType = 'FASTENER';
  } else if (searchStr.includes('ESCAD') || searchStr.includes('STAIR')) {
    detectedType = 'STAIR';
  } else if (searchStr.includes('GUARDA') || searchStr.includes('CORRIM')) {
    detectedType = 'RAILING';
  } else if (searchStr.includes('CONTRA') || searchStr.includes('BRACE') || searchStr.includes('DIAG')) {
    detectedType = 'BRACE';
  } else if (searchStr.includes('TERCA') || searchStr.includes('PURLIN')) {
    detectedType = 'PURLIN';
  } else if (searchStr.includes('TIRANTE') || searchStr.includes('TIE')) {
    detectedType = 'TIE';
  }

  return {
    pieceMark: pieceMark.toUpperCase(),
    cleanMark,
    assemblyMark: assemblyMark ? assemblyMark.toUpperCase() : undefined,
    cleanAssemblyMark,
    phase: inheritedPhase,
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

  const tokenRegex = /(DEF\s+([^\s\{\[\(\)]+))|(\{)|(\})|(point\s*\[([\s\S]*?)\])|(coordIndex\s*\[([\s\S]*?)\])/gi;
  let match: RegExpExecArray | null;

  const stack: { name: string; group: THREE.Group }[] = [{ name: 'ROOT', group }];
  let currentGroup = group;
  let lastDef: string | null = null;
  let currentPoints: number[] | null = null;
  let count = 0;

  while ((match = tokenRegex.exec(vrmlText)) !== null) {
    if (match[1]) {
      lastDef = match[2];
    } else if (match[3]) {
      const newGroup = new THREE.Group();
      if (lastDef) {
        newGroup.name = nameMap.get(lastDef) || lastDef;
        lastDef = null;
      } else {
        newGroup.name = 'Unnamed_Group';
      }
      currentGroup.add(newGroup);
      stack.push({ name: newGroup.name, group: newGroup });
      currentGroup = newGroup;
    } else if (match[4]) {
      if (stack.length > 1) {
        stack.pop();
        currentGroup = stack[stack.length - 1].group;
      }
    } else if (match[5]) {
      const rawCoords = match[6].trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (rawCoords.length >= 9) {
        currentPoints = rawCoords;
      }
    } else if (match[7]) {
      if (!currentPoints) continue;
      
      const indexStr = match[8];
      const rawIndices = indexStr.trim().split(/[\s,]+/).filter(Boolean).map(Number);
      
      const vertices: [number, number, number][] = [];
      for (let i = 0; i < currentPoints.length; i += 3) {
        if (!isNaN(currentPoints[i]) && !isNaN(currentPoints[i + 1]) && !isNaN(currentPoints[i + 2])) {
          vertices.push([currentPoints[i], currentPoints[i + 1], currentPoints[i + 2]]);
        }
      }
      
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
      
      if (triangleIndices.length === 0) continue;
      
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
        
        let meshName = `PECA-${++count}`;
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].name && stack[i].name !== 'Unnamed_Group' && stack[i].name !== 'ROOT') {
            meshName = stack[i].name;
            break;
          }
        }
        mesh.name = meshName;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        currentGroup.add(mesh);
      }
    }
  }

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

      // Constrói a lista de ancestrais da raiz até o nó da malha
      const ancestors: string[] = [];
      let p: THREE.Object3D | null = mesh.parent;
      while (p && p !== vrmlScene && p.name !== 'WRL_Root_Model') {
        const pName = (p.name || '').trim();
        if (pName && !/^(Scene|Root|Group|Transform|Shape|IndexedFaceSet|WRL_Direct_Fallback_Root)$/i.test(pName)) {
          const unmapped = nameMap.get(pName) || pName;
          ancestors.unshift(unmapped);
        }
        p = p.parent;
      }

      // 1. Extração rigorosa da Fase a partir dos nós ancestrais (evita falsos positivos em nomes de peças)
      const inheritedPhase = extractPhaseFromAncestors(ancestors);

      // 2. Extração do conjunto pai se houver na árvore (ex: pasta '121')
      let ancestorAssembly: string | undefined = undefined;
      for (const anc of ancestors) {
        const cleanAnc = anc.replace(/^DEF\s+/i, '').replace(/^ID_/, '').trim();
        // Se for um identificador de conjunto (ex: "121", "106", "V101") que não seja a fase
        if (/^\d+$/.test(cleanAnc) && cleanAnc !== inheritedPhase) {
          ancestorAssembly = cleanAnc;
          break;
        }
      }

      const rawNodeName = nameMap.get(mesh.name) || mesh.name || `PECA-${idCounter}`;
      const parsed = parseWrlNodeName(rawNodeName, inheritedPhase, ancestorAssembly);

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

  // Gera lista ordenada de fases limpas (ex: ["1", "2", "3", "4"])
  const sortedPhases = Array.from(detectedPhasesSet).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
  });

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
        ? `Modelo WRL processado com sucesso. ${totalMeshes} malhas renderizadas e ${uniqueMarksFound} marcas identificadas em ${sortedPhases.length} fases estruturais.`
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
    detectedPhases: sortedPhases,
  };
}
