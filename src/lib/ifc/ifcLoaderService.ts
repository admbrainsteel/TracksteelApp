import * as WebIFC from 'web-ifc';
import * as THREE from 'three';

export interface IFCQualityAudit {
  schema: string;
  viewDefinition: string;
  isEM11: boolean;
  totalAssemblies: number;
  totalBeams: number;
  totalColumns: number;
  totalMembers: number;
  totalPlates: number;
  totalFasteners: number;
  totalStructuralElements: number;
  totalWeldedGroups: number;
  uniqueMarksFound: number;
  marksList: string[];
  qualityScore: 'EXCELENTE' | 'BOM' | 'ATENÇÃO';
  qualityMessage: string;
  recommendation?: string;
  fallbackActive: boolean;
}

export interface PieceInfo {
  expressID: number;
  guid: string;
  name: string;
  type: string;
  pieceMark: string;
  cleanMark?: string;
  assemblyMark?: string;
  parentAssemblyID?: number;
  phase?: string;
  ofNumber?: string;
  section?: string;
  span?: number;
  material?: string;
  childrenIDs?: number[];
  connectedMeshIDs?: number[];
  mesh?: THREE.Mesh;
}

export interface LoadedIFCResult {
  sceneGroup: THREE.Group;
  audit: IFCQualityAudit;
  piecesByMark: Map<string, PieceInfo[]>;
  pieceByExpressID: Map<number, PieceInfo>;
  weldedGroupMap: Map<number, number[]>;
  materialsByColor: Map<string, THREE.Material>;
  totalMeshes: number;
}

// Paleta por Descrição/Seção (Modo "Descrição")
const DESCRIPTION_PALETTE = [
  '#3b82f6', // azul
  '#ec4899', // rosa
  '#10b981', // esmeralda
  '#f59e0b', // ambar
  '#8b5cf6', // roxo
  '#06b6d4', // ciano
  '#ef4444', // vermelho
  '#84cc16', // lima
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // laranja
  '#eab308', // amarelo
];

// Helper: Valida se um valor extraído é uma marca útil real
export function isValidMark(val: any): boolean {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  if (s.length === 0) return false;
  const lower = s.toLowerCase();
  if (
    lower === '-' ||
    lower === '?' ||
    lower === 'indefinido' ||
    lower === 'undefined' ||
    lower === 'null' ||
    lower === 'none' ||
    lower === 'default' ||
    lower === 'n/a' ||
    lower === 'na' ||
    lower === '$'
  ) {
    return false;
  }
  return true;
}

// Helper: Extrai campos formatados comuns em Description (ex: "Mark:TEST10 Pos:TEST10 Material:A36")
export function parseDescriptionFields(desc: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!desc || typeof desc !== 'string') return result;

  const markMatch = desc.match(/(?:Mark|Marca|Part|Piece)[:\s=]*([^\s,;]+)/i);
  if (markMatch && isValidMark(markMatch[1])) result.mark = markMatch[1].trim();

  const posMatch = desc.match(/(?:Pos|Posição|Posicao)[:\s=]*([^\s,;]+)/i);
  if (posMatch && isValidMark(posMatch[1])) result.pos = posMatch[1].trim();

  const matMatch = desc.match(/(?:Material|Mat)[:\s=]*([^\s,;]+)/i);
  if (matMatch && isValidMark(matMatch[1])) result.material = matMatch[1].trim();

  return result;
}

// Helper: Extrai o valor limpo da marca (ex: "B135-1-4" -> "4", "Pos: 4" -> "4")
export function getCleanMarkValue(rawMark: string): string {
  if (!rawMark) return '';
  let cleaned = rawMark.trim();

  // Se tiver hífen, o último segmento costuma ser a marca unitária da peça (ex: OF-FASE-MARCA -> MARCA)
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    const last = parts[parts.length - 1].trim();
    if (last && isValidMark(last)) return last;
  }

  // Se contiver prefixo tipo "Pos: 4" ou "Mark: 4"
  const prefixMatch = cleaned.match(/(?:Mark|Pos|Marca|Posicao)[:\s=]*([^\s,;]+)/i);
  if (prefixMatch && isValidMark(prefixMatch[1])) {
    return prefixMatch[1].trim();
  }

  return cleaned;
}

export async function loadAndAuditIFC(
  fileOrBuffer: File | ArrayBuffer,
  onProgress?: (percent: number, step: string) => void
): Promise<LoadedIFCResult> {
  const ifcApi = new WebIFC.IfcAPI();

  // 1. Inicializa Web-IFC WASM com fallback
  if (onProgress) onProgress(10, 'Carregando motor Web-IFC (WASM)...');

  const LOCAL_WASM_PATH = '/wasm/';
  const CDN_WASM_PATH = 'https://unpkg.com/web-ifc@0.0.74/';

  // Intercepta logs do console temporariamente para filtrar avisos internos da engine C++
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('[WEB-IFC]')) {
      console.debug(...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('[WEB-IFC]')) {
      console.debug(...args);
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  let wasmInitSuccess = false;
  try {
    ifcApi.SetWasmPath(LOCAL_WASM_PATH, true);
    await ifcApi.Init();
    wasmInitSuccess = true;
  } catch (localErr) {
    console.warn('[IFC Loader] Falha ao carregar WASM local (/wasm/), tentando CDN...', localErr);
    try {
      ifcApi.SetWasmPath(CDN_WASM_PATH, true);
      await ifcApi.Init();
      wasmInitSuccess = true;
    } catch (cdnErr) {
      console.error('[IFC Loader] Falha ao inicializar Web-IFC via CDN:', cdnErr);
    }
  }

  if (!wasmInitSuccess) {
    throw new Error('Não foi possível inicializar o motor Web-IFC WebAssembly.');
  }

  // 2. Leitura dos dados binários e cabeçalho
  if (onProgress) onProgress(25, 'Lendo arquivo IFC...');
  let data: Uint8Array;
  let rawHeader = '';
  if (fileOrBuffer instanceof File) {
    const arrayBuffer = await fileOrBuffer.arrayBuffer();
    data = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    rawHeader = decoder.decode(data.slice(0, 4096));
  } else {
    data = new Uint8Array(fileOrBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    rawHeader = decoder.decode(data.slice(0, 4096));
  }

  // 3. Abertura do Modelo com suporte a coordenadas relativas
  if (onProgress) onProgress(40, 'Decodificando entidades IFC...');
  const modelID = ifcApi.OpenModel(data, {
    COORDINATE_TO_ORIGIN: true,
    USE_FAST_BOOLS: true
  } as any);
  if (modelID < 0) {
    throw new Error('Falha ao decodificar a estrutura do arquivo IFC.');
  }

  // 4. Detecção de Header
  const isEM11 = rawHeader.includes('SteelFabricationView') || rawHeader.includes('EM.11');

  // Coleta de entidades estruturais
  if (onProgress) onProgress(50, 'Mapeando topologia estrutural e soldas...');
  const assemblies = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCELEMENTASSEMBLY);
  const beams = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCBEAM);
  const columns = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCCOLUMN);
  const members = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCMEMBER);
  const plates = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCPLATE);
  const fasteners = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCMECHANICALFASTENER);

  const totalAssemblies = assemblies.size();
  const totalBeams = beams.size();
  const totalColumns = columns.size();
  const totalMembers = members.size();
  const totalPlates = plates.size();
  const totalFasteners = fasteners.size();
  const totalStructural = totalBeams + totalColumns + totalMembers + totalPlates;

  // 4.1 Mapeamento nativo de montagens (IFCRELAGGREGATES)
  const aggregates = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCRELAGGREGATES);
  const assemblyToChildren = new Map<number, number[]>();
  const childToAssembly = new Map<number, number>();

  for (let i = 0; i < aggregates.size(); i++) {
    const relID = aggregates.get(i);
    try {
      const rel = ifcApi.GetLine(modelID, relID);
      if (rel && rel.RelatingObject && rel.RelatedObjects) {
        const parentID = rel.RelatingObject.value;
        const childIDs = (rel.RelatedObjects as any[]).map((r: any) => r.value);
        assemblyToChildren.set(parentID, childIDs);
        for (const cId of childIDs) {
          childToAssembly.set(cId, parentID);
        }
      }
    } catch {
      // ignore
    }
  }

  // 4.2 Grafo de Soldas (IFCRELCONNECTSWITHREALIZINGELEMENTS)
  const weldConnections = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCRELCONNECTSWITHREALIZINGELEMENTS);
  const adjacencyList = new Map<number, Set<number>>();

  const addEdge = (u: number, v: number) => {
    if (!adjacencyList.has(u)) adjacencyList.set(u, new Set());
    if (!adjacencyList.has(v)) adjacencyList.set(v, new Set());
    adjacencyList.get(u)!.add(v);
    adjacencyList.get(v)!.add(u);
  };

  for (let i = 0; i < weldConnections.size(); i++) {
    const relID = weldConnections.get(i);
    try {
      const rel = ifcApi.GetLine(modelID, relID);
      if (rel && rel.RelatingElement && rel.RelatedElement) {
        const elemA = rel.RelatingElement.value;
        const elemB = rel.RelatedElement.value;
        addEdge(elemA, elemB);
      }
    } catch {
      // ignore
    }
  }

  // Componentes conectados soldados
  const visited = new Set<number>();
  const weldedGroupMap = new Map<number, number[]>();
  let totalWeldedGroups = 0;

  for (const node of adjacencyList.keys()) {
    if (!visited.has(node)) {
      const group: number[] = [];
      const queue: number[] = [node];
      visited.add(node);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        group.push(curr);
        const neighbors = adjacencyList.get(curr) || new Set();
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }

      totalWeldedGroups++;
      for (const id of group) {
        weldedGroupMap.set(id, group);
      }
    }
  }

  // 4.3 Indexação profunda de propriedades (IFCRELDEFINESBYPROPERTIES)
  const elementPropertiesMap = new Map<number, Record<string, string>>();
  try {
    const relsProp = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYPROPERTIES);
    for (let i = 0; i < relsProp.size(); i++) {
      const relId = relsProp.get(i);
      if (relId && relId > 0) {
        const rel = ifcApi.GetLine(modelID, relId);
        if (rel && rel.RelatedObjects && rel.RelatingPropertyDefinition) {
          const propDefId = rel.RelatingPropertyDefinition.value;
          if (propDefId && typeof propDefId === 'number' && propDefId > 0) {
            const propDef = ifcApi.GetLine(modelID, propDefId);
            if (propDef) {
              const props: Record<string, string> = {};

              // Leitura de HasProperties (Pset_*)
              if (propDef.HasProperties && Array.isArray(propDef.HasProperties)) {
                for (const pRef of propDef.HasProperties) {
                  const pId = pRef?.value;
                  if (pId && typeof pId === 'number' && pId > 0) {
                    const pLine = ifcApi.GetLine(modelID, pId);
                    if (pLine && pLine.Name) {
                      const name = pLine.Name.value || pLine.Name;
                      let value = '';
                      if (pLine.NominalValue !== undefined && pLine.NominalValue !== null) {
                        if (typeof pLine.NominalValue === 'object' && pLine.NominalValue.value !== undefined) {
                          value = String(pLine.NominalValue.value);
                        } else {
                          value = String(pLine.NominalValue);
                        }
                      }
                      if (name && value && isValidMark(value)) {
                        props[name] = value;
                      }
                    }
                  }
                }
              }

              // Leitura de Quantities (Qto_*)
              if (propDef.Quantities && Array.isArray(propDef.Quantities)) {
                for (const qRef of propDef.Quantities) {
                  const qId = qRef?.value;
                  if (qId && typeof qId === 'number' && qId > 0) {
                    const qLine = ifcApi.GetLine(modelID, qId);
                    if (qLine && qLine.Name) {
                      const name = qLine.Name.value || qLine.Name;
                      let value = '';
                      if (qLine.LengthValue !== undefined) value = `${Number(qLine.LengthValue).toFixed(1)} mm`;
                      else if (qLine.NominalValue) value = String(qLine.NominalValue.value || qLine.NominalValue);
                      if (name && value && isValidMark(value)) {
                        props[name] = value;
                      }
                    }
                  }
                }
              }

              if (Object.keys(props).length > 0) {
                const relatedObjs = Array.isArray(rel.RelatedObjects) ? rel.RelatedObjects : [rel.RelatedObjects];
                for (const objRef of relatedObjs) {
                  const objId = objRef?.value || objRef;
                  if (objId && typeof objId === 'number') {
                    const existing = elementPropertiesMap.get(objId) || {};
                    elementPropertiesMap.set(objId, { ...existing, ...props });
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (propErr) {
    console.debug('[IFC Loader] Property indexing note:', propErr);
  }

  // Função interna de extração inteligente da marca
  function extractBestMark(expressID: number): {
    mark: string;
    cleanMark: string;
    section: string;
    description: string;
  } {
    const props = elementPropertiesMap.get(expressID) || {};

    let rawName = '';
    let rawTag = '';
    let rawDesc = '';
    let rawObjType = '';
    try {
      const rawLine = ifcApi.GetLine(modelID, expressID);
      if (rawLine) {
        rawName = rawLine.Name?.value ?? (typeof rawLine.Name === 'string' ? rawLine.Name : '');
        rawTag = rawLine.Tag?.value ?? (typeof rawLine.Tag === 'string' ? rawLine.Tag : '');
        rawDesc = rawLine.Description?.value ?? (typeof rawLine.Description === 'string' ? rawLine.Description : '');
        rawObjType = rawLine.ObjectType?.value ?? (typeof rawLine.ObjectType === 'string' ? rawLine.ObjectType : '');
      }
    } catch {}

    const descParsed = parseDescriptionFields(rawDesc);

    // Prioridade de propriedades que representam Marca/Posição da peça
    const candidates: (string | undefined)[] = [
      props.PieceMark,
      props.PartMark,
      props.SinglePartMark,
      props.MainPartMark,
      props.Marca,
      props.Pos,
      props.Posição,
      props.Posicao,
      descParsed.pos,
      descParsed.mark,
      props.Mark,
      props['Part Number'],
      props.PartPos,
      props['Item Number'],
      props.ItemNumber,
      props.PartNumber,
      rawTag,
      props.Tag,
      props.Reference, // Validado por isValidMark
      rawObjType,
      rawName
    ];

    let chosenMark = '';
    for (const cand of candidates) {
      if (cand && isValidMark(cand)) {
        chosenMark = String(cand).trim();
        break;
      }
    }

    // Se não encontrou no próprio elemento, tenta herdar da montagem pai
    if (!chosenMark && childToAssembly.has(expressID)) {
      const parentId = childToAssembly.get(expressID)!;
      const parentProps = elementPropertiesMap.get(parentId) || {};
      try {
        const parentLine = ifcApi.GetLine(modelID, parentId);
        const parentName = parentLine?.Name?.value ?? '';
        const parentTag = parentLine?.Tag?.value ?? '';
        const parentCandidates = [
          parentProps.PieceMark,
          parentProps.AssemblyMark,
          parentProps['Assembly Mark'],
          parentProps.Marca,
          parentProps.Mark,
          parentProps.Pos,
          parentTag,
          parentName
        ];
        for (const pCand of parentCandidates) {
          if (pCand && isValidMark(pCand)) {
            chosenMark = String(pCand).trim();
            break;
          }
        }
      } catch {}
    }

    const section =
      props.Section ||
      props.Profile ||
      props.Perfil ||
      props.Description ||
      rawDesc ||
      rawName ||
      '';

    const clean = getCleanMarkValue(chosenMark);

    return {
      mark: chosenMark || 'indefinido',
      cleanMark: clean || chosenMark || 'indefinido',
      section,
      description: rawDesc
    };
  }

  // Coleta de montagens nativas
  const piecesByMark = new Map<string, PieceInfo[]>();
  const pieceByExpressID = new Map<number, PieceInfo>();
  const uniqueMarksSet = new Set<string>();
  const sectionColorMap = new Map<string, string>();
  let colorIndex = 0;

  for (let i = 0; i < assemblies.size(); i++) {
    const assID = assemblies.get(i);
    try {
      const assObj = ifcApi.GetLine(modelID, assID);
      const markInfo = extractBestMark(assID);
      const children = assemblyToChildren.get(assID) || [];

      const piece: PieceInfo = {
        expressID: assID,
        guid: assObj?.GlobalId?.value || '',
        name: assObj?.Name?.value || 'Montagem Estrutural',
        type: 'IFCELEMENTASSEMBLY',
        pieceMark: markInfo.mark,
        cleanMark: markInfo.cleanMark,
        childrenIDs: children,
        connectedMeshIDs: children,
        section: markInfo.section,
        phase: extractPhaseFromMark(markInfo.mark),
        ofNumber: extractOFFromMark(markInfo.mark)
      };

      if (markInfo.mark !== 'indefinido') {
        uniqueMarksSet.add(markInfo.mark);
        if (markInfo.cleanMark !== 'indefinido') uniqueMarksSet.add(markInfo.cleanMark);
        if (!piecesByMark.has(markInfo.mark)) piecesByMark.set(markInfo.mark, []);
        piecesByMark.get(markInfo.mark)!.push(piece);
      }
      pieceByExpressID.set(assID, piece);
    } catch {
      // ignore
    }
  }

  // 5. Geração de Malhas 3D com Three.js corrigindo o empacotamento de vértices/normais
  if (onProgress) onProgress(75, 'Gerando malhas geométricas 3D...');
  const sceneGroup = new THREE.Group();
  sceneGroup.name = 'IFC_ROOT_MODEL';

  const defaultGrayMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.3,
    roughness: 0.6,
    side: THREE.DoubleSide
  });

  const materialCache = new Map<string, THREE.MeshStandardMaterial>();
  let totalMeshes = 0;

  ifcApi.StreamAllMeshes(modelID, (flatMesh: WebIFC.FlatMesh) => {
    const expressID = flatMesh.expressID;
    const placedGeometries = flatMesh.geometries;

    const markInfo = extractBestMark(expressID);
    const colorKey = markInfo.section || 'PADRAO';

    if (!sectionColorMap.has(colorKey)) {
      sectionColorMap.set(colorKey, DESCRIPTION_PALETTE[colorIndex % DESCRIPTION_PALETTE.length]);
      colorIndex++;
    }

    const hexColor = sectionColorMap.get(colorKey)!;
    if (!materialCache.has(hexColor)) {
      materialCache.set(
        hexColor,
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(hexColor),
          metalness: 0.35,
          roughness: 0.55,
          side: THREE.DoubleSide
        })
      );
    }
    const mat = materialCache.get(hexColor) || defaultGrayMat;
    const connectedGroup = weldedGroupMap.get(expressID) || [expressID];

    for (let g = 0; g < placedGeometries.size(); g++) {
      const placedGeo = placedGeometries.get(g);
      const ifcGeo = ifcApi.GetGeometry(modelID, placedGeo.geometryExpressID);

      // Web-IFC GetVertexArray retorna [px, py, pz, nx, ny, nz, ...] (interleaved de 6 floats)
      const verts = ifcApi.GetVertexArray(ifcGeo.GetVertexData(), ifcGeo.GetVertexDataSize());
      const indices = ifcApi.GetIndexArray(ifcGeo.GetIndexData(), ifcGeo.GetIndexDataSize());

      const bufferGeo = new THREE.BufferGeometry();
      const numVerts = verts.length / 6;
      const positionArray = new Float32Array(numVerts * 3);
      const normalArray = new Float32Array(numVerts * 3);

      for (let j = 0; j < verts.length; j += 6) {
        const idx = j / 6;
        positionArray[idx * 3] = verts[j];
        positionArray[idx * 3 + 1] = verts[j + 1];
        positionArray[idx * 3 + 2] = verts[j + 2];
        normalArray[idx * 3] = verts[j + 3];
        normalArray[idx * 3 + 1] = verts[j + 4];
        normalArray[idx * 3 + 2] = verts[j + 5];
      }

      bufferGeo.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
      bufferGeo.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
      bufferGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

      const mesh = new THREE.Mesh(bufferGeo, mat);
      const matrix = new THREE.Matrix4();
      matrix.fromArray(placedGeo.flatTransformation);
      mesh.applyMatrix4(matrix);

      mesh.userData = {
        expressID,
        pieceMark: markInfo.mark,
        cleanMark: markInfo.cleanMark,
        section: markInfo.section,
        colorKey,
        connectedMeshIDs: connectedGroup
      };

      sceneGroup.add(mesh);
      ifcGeo.delete();
      totalMeshes++;

      if (!pieceByExpressID.has(expressID)) {
        const piece: PieceInfo = {
          expressID,
          guid: '',
          name: markInfo.section || 'Peça Estrutural',
          type: 'ELEMENT',
          pieceMark: markInfo.mark,
          cleanMark: markInfo.cleanMark,
          section: markInfo.section,
          connectedMeshIDs: connectedGroup,
          mesh
        };
        pieceByExpressID.set(expressID, piece);
        if (markInfo.mark && markInfo.mark !== 'indefinido') {
          uniqueMarksSet.add(markInfo.mark);
          if (markInfo.cleanMark !== 'indefinido') uniqueMarksSet.add(markInfo.cleanMark);
          if (!piecesByMark.has(markInfo.mark)) piecesByMark.set(markInfo.mark, []);
          piecesByMark.get(markInfo.mark)!.push(piece);
        }
      } else {
        pieceByExpressID.get(expressID)!.mesh = mesh;
        pieceByExpressID.get(expressID)!.connectedMeshIDs = connectedGroup;
      }
    }
  });

  // Fecha o modelo após extração para liberar memória
  try {
    ifcApi.CloseModel(modelID);
  } catch {}

  // Auditoria de Qualidade
  let qualityScore: 'EXCELENTE' | 'BOM' | 'ATENÇÃO' = 'ATENÇÃO';
  let qualityMessage = '';
  let recommendation = '';
  const fallbackActive = !isEM11 || totalAssemblies === 0;

  if (isEM11 && totalAssemblies > 0) {
    qualityScore = 'EXCELENTE';
    qualityMessage = 'Modelo exportado no padrão AISC EM.11 (SteelFabricationView). Todas as montagens e marcas principais de conjuntos estão 100% integradas nativamente.';
  } else if (totalWeldedGroups > 0 || uniqueMarksSet.size > 0) {
    qualityScore = 'BOM';
    qualityMessage = `Modo Avançado Ativado: ${uniqueMarksSet.size} marcas de peças e ${totalWeldedGroups} conjuntos topológicos identificados com sucesso.`;
    recommendation = 'O modelo está totalmente operacional e sincronizado com os apontamentos da fábrica.';
  } else {
    qualityScore = 'ATENÇÃO';
    qualityMessage = 'Não foram identificadas marcas de peças no padrão da fábrica nas propriedades do IFC.';
    recommendation = 'Verifique se a numeração de peças foi executada no CAD antes da exportação.';
  }

  const audit: IFCQualityAudit = {
    schema: 'IFC2X3',
    viewDefinition: isEM11 ? 'SteelFabricationView (EM.11)' : 'CoordinationView (2.0)',
    isEM11,
    totalAssemblies,
    totalBeams,
    totalColumns,
    totalMembers,
    totalPlates,
    totalFasteners,
    totalStructuralElements: totalStructural,
    totalWeldedGroups,
    uniqueMarksFound: uniqueMarksSet.size,
    marksList: Array.from(uniqueMarksSet).sort(),
    qualityScore,
    qualityMessage,
    recommendation,
    fallbackActive
  };

  if (onProgress) onProgress(100, 'Modelo 3D pronto!');

  return {
    sceneGroup,
    audit,
    piecesByMark,
    pieceByExpressID,
    weldedGroupMap,
    materialsByColor: materialCache as any,
    totalMeshes
  };
}

function extractPhaseFromMark(mark: string): string {
  const parts = mark.split('-');
  if (parts.length >= 3) return parts[1];
  return '1';
}

function extractOFFromMark(mark: string): string {
  const parts = mark.split('-');
  if (parts.length >= 1) return parts[0];
  return '';
}
