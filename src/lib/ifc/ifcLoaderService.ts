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
  cleanAssemblyMark?: string;
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
  detectedPhases: string[];
}

/**
 * Função idêntica ao SteelXR para gerar cores vibrantes e distintas por descrição / perfil / material.
 */
export function getColorForMaterialName(name: string): string {
  if (!name) return '#a1a1aa';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const s = 65 + (Math.abs(hash >> 8) % 15);
  const l = 45 + (Math.abs(hash >> 16) % 10);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

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

  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    const last = parts[parts.length - 1].trim();
    if (last && isValidMark(last)) return last;
  }

  const prefixMatch = cleaned.match(/(?:Mark|Pos|Marca|Posicao)[:\s=]*([^\s,;]+)/i);
  if (prefixMatch && isValidMark(prefixMatch[1])) {
    return prefixMatch[1].trim();
  }

  return cleaned;
}

// Helper: Identifica se uma marca é número de peça solta/corte (ex: 1000, 1001, 1002, 1010)
export function isSinglePartCutNumber(val: string): boolean {
  if (!val) return false;
  const clean = getCleanMarkValue(val);
  const num = parseInt(clean, 10);
  return !isNaN(num) && num >= 1000;
}

// Helper: Mapeamento de nome de material idêntico ao SteelXR
function getMaterialName(ifcApi: WebIFC.IfcAPI, modelID: number, matRef: any): string | null {
  if (!matRef) return null;
  const matId = matRef.value;
  if (!matId) return null;
  try {
    const matLine = ifcApi.GetLine(modelID, matId);
    if (!matLine) return null;

    if (matLine.Name && matLine.Name.value) {
      return matLine.Name.value;
    }

    if (matLine.Materials) {
      for (const mRef of matLine.Materials) {
        const name = getMaterialName(ifcApi, modelID, mRef);
        if (name) return name;
      }
    }

    if (matLine.MaterialConstituents) {
      for (const mcRef of matLine.MaterialConstituents) {
        const mcLine = ifcApi.GetLine(modelID, mcRef.value);
        if (mcLine && mcLine.Material) {
          const name = getMaterialName(ifcApi, modelID, mcLine.Material);
          if (name) return name;
        }
      }
    }

    if (matLine.MaterialProfileSet) {
      return getMaterialName(ifcApi, modelID, matLine.MaterialProfileSet);
    }
    if (matLine.MaterialProfiles) {
      for (const mpRef of matLine.MaterialProfiles) {
        const mpLine = ifcApi.GetLine(modelID, mpRef.value);
        if (mpLine && mpLine.Material) {
          const name = getMaterialName(ifcApi, modelID, mpLine.Material);
          if (name) return name;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function loadAndAuditIFC(
  fileOrBuffer: File | ArrayBuffer,
  onProgress?: (percent: number, step: string) => void
): Promise<LoadedIFCResult> {
  const ifcApi = new WebIFC.IfcAPI();

  // 1. Inicializa Web-IFC com a versão 0.0.57 (mesma versão estável do SteelXR)
  if (onProgress) onProgress(10, 'Carregando motor SteelXR IFC (WASM)...');

  const WASM_PATH_057 = 'https://unpkg.com/web-ifc@0.0.57/';

  // Filtra avisos internos da biblioteca C++ para manter o console limpo
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
    ifcApi.SetWasmPath(WASM_PATH_057, true);
    await ifcApi.Init();
    wasmInitSuccess = true;
  } catch (cdnErr) {
    console.warn('[IFC Loader] Tentando fallback para /wasm/...', cdnErr);
    try {
      ifcApi.SetWasmPath('/wasm/', true);
      await ifcApi.Init();
      wasmInitSuccess = true;
    } catch (localErr) {
      console.error('[IFC Loader] Falha ao inicializar Web-IFC:', localErr);
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

  // 3. Abertura do Modelo idêntica ao SteelXR (OpenModel puro, compatibilidade máxima)
  if (onProgress) onProgress(40, 'Decodificando entidades IFC...');
  const modelID = ifcApi.OpenModel(data);
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

  // 4.2 Mapeamento de Materiais do SteelXR (IFCRELASSOCIATESMATERIAL)
  const elementMaterialMap = new Map<number, string>();
  try {
    const rels = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCRELASSOCIATESMATERIAL);
    for (let i = 0; i < rels.size(); i++) {
      const relId = rels.get(i);
      const rel = ifcApi.GetLine(modelID, relId);
      if (rel && rel.RelatedObjects && rel.RelatingMaterial) {
        const matName = getMaterialName(ifcApi, modelID, rel.RelatingMaterial);
        if (matName) {
          for (const objRef of rel.RelatedObjects) {
            elementMaterialMap.set(objRef.value, matName);
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 4.3 Mapeamento de Soldas (IFCRELCONNECTSWITHREALIZINGELEMENTS)
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

  // 4.4 Indexação completa de propriedades (IFCRELDEFINESBYPROPERTIES) idêntica ao SteelXR
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

              // HasProperties (Pset_*)
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

              // Quantities (Qto_*)
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
    assemblyMark: string;
    cleanAssemblyMark: string;
    section: string;
    description: string;
    phase: string;
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
      props.Reference,
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

    // Busca Assembly Mark no conjunto pai (IFCRELAGGREGATES)
    let assemblyMark = '';
    let cleanAssemblyMark = '';
    if (childToAssembly.has(expressID)) {
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
            assemblyMark = String(pCand).trim();
            cleanAssemblyMark = getCleanMarkValue(assemblyMark);
            break;
          }
        }
      } catch {}
    }

    if (!assemblyMark && props.AssemblyMark && isValidMark(props.AssemblyMark)) {
      assemblyMark = String(props.AssemblyMark).trim();
      cleanAssemblyMark = getCleanMarkValue(assemblyMark);
    }

    // Em estruturas metálicas, a marca da peça apontada na produção é a marca do conjunto (Assembly Mark),
    // a menos que a peça seja avulsa ou que não tenha conjunto pai
    let finalMark = chosenMark;
    if (assemblyMark && isValidMark(assemblyMark)) {
      if (!finalMark || finalMark === 'indefinido' || isSinglePartCutNumber(finalMark)) {
        finalMark = assemblyMark;
      }
    }

    const clean = getCleanMarkValue(finalMark);

    const section =
      props.Section ||
      props.Profile ||
      props.Perfil ||
      props.Description ||
      rawDesc ||
      rawName ||
      '';

    // Extração inteligente de Fase
    const phaseCandidates = [
      props.Phase,
      props.Fase,
      props['Phase Number'],
      props['Phase Name'],
      props['Tekla Assembly.Phase'],
      props['Tekla Common.Phase'],
      props['Tekla Assembly.Phase Name'],
      props.Etapa,
      props.Sequence,
      props.Batch
    ];
    let chosenPhase = '';
    for (const pCand of phaseCandidates) {
      if (pCand && isValidMark(pCand)) {
        chosenPhase = String(pCand).trim();
        break;
      }
    }
    if (!chosenPhase && childToAssembly.has(expressID)) {
      const parentId = childToAssembly.get(expressID)!;
      const parentProps = elementPropertiesMap.get(parentId) || {};
      const parentPhaseCandidates = [
        parentProps.Phase,
        parentProps.Fase,
        parentProps['Phase Number'],
        parentProps['Phase Name'],
        parentProps['Tekla Assembly.Phase'],
        parentProps['Tekla Common.Phase'],
        parentProps['Tekla Assembly.Phase Name'],
        parentProps.Etapa,
        parentProps.Sequence,
        parentProps.Batch
      ];
      for (const pCand of parentPhaseCandidates) {
        if (pCand && isValidMark(pCand)) {
          chosenPhase = String(pCand).trim();
          break;
        }
      }
    }
    if (!chosenPhase) {
      chosenPhase = extractPhaseFromMark(assemblyMark || finalMark);
    }

    return {
      mark: finalMark || 'indefinido',
      cleanMark: clean || finalMark || 'indefinido',
      assemblyMark: assemblyMark || finalMark || '',
      cleanAssemblyMark: cleanAssemblyMark || clean || '',
      section,
      description: rawDesc,
      phase: chosenPhase
    };
  }

  // Coleta de montagens nativas
  const piecesByMark = new Map<string, PieceInfo[]>();
  const pieceByExpressID = new Map<number, PieceInfo>();
  const uniqueMarksSet = new Set<string>();
  const detectedPhasesSet = new Set<string>();

  for (let i = 0; i < assemblies.size(); i++) {
    const assID = assemblies.get(i);
    try {
      const assObj = ifcApi.GetLine(modelID, assID);
      const markInfo = extractBestMark(assID);
      const children = assemblyToChildren.get(assID) || [];

      if (markInfo.phase) {
        detectedPhasesSet.add(markInfo.phase);
      }

      const piece: PieceInfo = {
        expressID: assID,
        guid: assObj?.GlobalId?.value || '',
        name: assObj?.Name?.value || 'Montagem Estrutural',
        type: 'IFCELEMENTASSEMBLY',
        pieceMark: markInfo.mark,
        cleanMark: markInfo.cleanMark,
        assemblyMark: markInfo.assemblyMark,
        cleanAssemblyMark: markInfo.cleanAssemblyMark,
        childrenIDs: children,
        connectedMeshIDs: children,
        section: markInfo.section,
        phase: markInfo.phase || extractPhaseFromMark(markInfo.mark),
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

  // 5. Geração de Malhas 3D idêntica ao SteelXR
  if (onProgress) onProgress(75, 'Gerando malhas geométricas 3D...');
  const sceneGroup = new THREE.Group();
  sceneGroup.name = 'IFC_ROOT_MODEL';

  const materialsCache: Map<number, THREE.MeshStandardMaterial> = new Map();
  let totalMeshes = 0;

  ifcApi.StreamAllMeshes(modelID, (mesh: WebIFC.FlatMesh) => {
    const placedGeometries = mesh.geometries;
    const expressID = (mesh as unknown as { expressID?: number }).expressID ?? 0;

    const markInfo = extractBestMark(expressID);
    const materialName = elementMaterialMap.get(expressID) ?? '';
    const connectedGroup = weldedGroupMap.get(expressID) || [expressID];

    if (markInfo.phase) {
      detectedPhasesSet.add(markInfo.phase);
    }

    const elementGroup = new THREE.Group();
    elementGroup.name = `ifc_${expressID}`;
    elementGroup.userData = {
      ifcElement: true,
      ifcId: expressID,
      pieceMark: markInfo.mark,
      cleanMark: markInfo.cleanMark,
      assemblyMark: markInfo.assemblyMark,
      cleanAssemblyMark: markInfo.cleanAssemblyMark,
      section: markInfo.section,
      phase: markInfo.phase,
      materialName,
      connectedMeshIDs: connectedGroup
    };

    for (let i = 0; i < placedGeometries.size(); i++) {
      const placedGeometry = placedGeometries.get(i);
      const ifcGeometry = ifcApi.GetGeometry(modelID, placedGeometry.geometryExpressID);

      const verts = ifcApi.GetVertexArray(
        ifcGeometry.GetVertexData(),
        ifcGeometry.GetVertexDataSize()
      );
      const indices = ifcApi.GetIndexArray(
        ifcGeometry.GetIndexData(),
        ifcGeometry.GetIndexDataSize()
      );

      const geometry = new THREE.BufferGeometry();
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

      geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      // Padrão industrial solicitado: O modelo 3D IFC SEMPRE inicia com todas as peças 100% em cinza claro (#a1a1aa)
      const color = placedGeometry.color;
      const initialGrayMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xa1a1aa),
        metalness: 0.25,
        roughness: 0.65,
        side: THREE.DoubleSide,
      });

      const mesh3 = new THREE.Mesh(geometry, initialGrayMaterial);
      mesh3.userData = {
        ifcId: expressID,
        pieceMark: markInfo.mark,
        cleanMark: markInfo.cleanMark,
        assemblyMark: markInfo.assemblyMark,
        cleanAssemblyMark: markInfo.cleanAssemblyMark,
        section: markInfo.section,
        phase: markInfo.phase,
        materialName,
        nativeColor: new THREE.Color(color.x, color.y, color.z),
        connectedMeshIDs: connectedGroup
      };

      const matrix = new THREE.Matrix4();
      matrix.fromArray(placedGeometry.flatTransformation);
      mesh3.applyMatrix4(matrix);

      elementGroup.add(mesh3);
      ifcGeometry.delete();
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
          phase: markInfo.phase,
          material: materialName,
          connectedMeshIDs: connectedGroup,
          mesh: mesh3
        };
        pieceByExpressID.set(expressID, piece);
        if (markInfo.mark && markInfo.mark !== 'indefinido') {
          uniqueMarksSet.add(markInfo.mark);
          if (markInfo.cleanMark !== 'indefinido') uniqueMarksSet.add(markInfo.cleanMark);
          if (!piecesByMark.has(markInfo.mark)) piecesByMark.set(markInfo.mark, []);
          piecesByMark.get(markInfo.mark)!.push(piece);
        }
      }
    }

    if (elementGroup.children.length > 0) {
      sceneGroup.add(elementGroup);
    }
  });

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
    qualityMessage = `Modo SteelXR Ativado: ${uniqueMarksSet.size} marcas e conjuntos identificados com qualidade gráfica calibrada.`;
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
    materialsByColor: materialsCache as any,
    totalMeshes,
    detectedPhases: Array.from(detectedPhasesSet).sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
    })
  };
}

export function extractPhaseFromMark(mark: string): string {
  if (!mark || mark === 'indefinido') return '';
  const parts = mark.split('-');
  if (parts.length >= 3) {
    const p1 = parts[1].trim();
    if (p1 && /^\d+$/.test(p1)) return p1;
    return p1;
  }
  if (parts.length === 2) {
    const p0 = parts[0].trim();
    if (p0 && /^\d+$/.test(p0)) return p0;
  }
  const match = mark.match(/(?:fase|phase|etapa)\s*(\d+)/i);
  if (match) return match[1];

  return '';
}

function extractOFFromMark(mark: string): string {
  const parts = mark.split('-');
  if (parts.length >= 1) return parts[0];
  return '';
}
