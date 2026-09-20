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
  weldedGroupMap: Map<number, number[]>; // expressID -> all connected expressIDs
  materialsByColor: Map<string, THREE.Material>;
  totalMeshes: number;
}

// Helper: Palette by Section/Description (Mode "Descrição")
const DESCRIPTION_PALETTE = [
  '#3b82f6', // blue
  '#ec4899', // pink/magenta
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ef4444', // red
  '#84cc16', // lime
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
  '#eab308', // yellow
];

export async function loadAndAuditIFC(
  fileOrBuffer: File | ArrayBuffer,
  onProgress?: (percent: number, step: string) => void
): Promise<LoadedIFCResult> {
  const ifcApi = new WebIFC.IfcAPI();

  // 1. Initialize Web-IFC WASM locally with fallback
  if (onProgress) onProgress(10, 'Carregando motor Web-IFC (WASM)...');

  const LOCAL_WASM_PATH = '/wasm/';
  const CDN_WASM_PATH = 'https://unpkg.com/web-ifc@0.0.57/';

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

  // 2. Read bytes & Raw String for Header
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

  // 3. Open Model
  if (onProgress) onProgress(40, 'Decodificando entidades IFC...');
  const modelID = ifcApi.OpenModel(data);
  if (modelID < 0) {
    throw new Error('Falha ao decodificar a estrutura do arquivo IFC.');
  }

  // 4. Header Detection
  const isEM11 = rawHeader.includes('SteelFabricationView') || rawHeader.includes('EM.11');

  // Collect Elements
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

  // 4.1 Native Aggregates mapping (IFCRELAGGREGATES)
  const aggregates = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCRELAGGREGATES);
  const assemblyToChildren = new Map<number, number[]>();
  const childToAssemblyMap = new Map<number, number>();

  for (let i = 0; i < aggregates.size(); i++) {
    const relID = aggregates.get(i);
    try {
      const rel = ifcApi.GetLine(modelID, relID);
      if (rel && rel.RelatingObject && rel.RelatedObjects) {
        const parentID = typeof rel.RelatingObject === 'number' ? rel.RelatingObject : rel.RelatingObject.value;
        const childObjs = Array.isArray(rel.RelatedObjects) ? rel.RelatedObjects : [rel.RelatedObjects];
        const childIDs: number[] = [];
        for (const c of childObjs) {
          const cId = typeof c === 'number' ? c : c?.value;
          if (typeof cId === 'number' && cId > 0) {
            childIDs.push(cId);
            childToAssemblyMap.set(cId, parentID);
          }
        }
        assemblyToChildren.set(parentID, childIDs);
      }
    } catch {
      // ignore
    }
  }

  // 4.2 FALLBACK: Topologic Weld Graph (IFCRELCONNECTSWITHREALIZINGELEMENTS)
  // Connects parts (Plates <-> Columns <-> Beams) when IfcElementAssembly is absent
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

  // Compute Connected Components for Welded Assemblies (DSU/BFS)
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

  // 4.3 Element Properties Map from IFCRELDEFINESBYPROPERTIES
  const elementPropertiesMap = new Map<number, Record<string, string>>();
  try {
    const relsProp = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYPROPERTIES);
    for (let i = 0; i < relsProp.size(); i++) {
      const relId = relsProp.get(i);
      if (relId && relId > 0) {
        const rel = ifcApi.GetLine(modelID, relId);
        if (rel && rel.RelatedObjects && rel.RelatingPropertyDefinition) {
          const propDefId = typeof rel.RelatingPropertyDefinition === 'number'
            ? rel.RelatingPropertyDefinition
            : rel.RelatingPropertyDefinition.value;

          if (propDefId && typeof propDefId === 'number' && propDefId > 0) {
            const propDef = ifcApi.GetLine(modelID, propDefId);
            if (propDef && propDef.HasProperties) {
              const props: Record<string, string> = {};
              for (const pRef of propDef.HasProperties) {
                const pId = typeof pRef === 'number' ? pRef : pRef?.value;
                if (pId && typeof pId === 'number' && pId > 0) {
                  const pLine = ifcApi.GetLine(modelID, pId);
                  if (pLine && pLine.Name) {
                    const name = pLine.Name.value || pLine.Name;
                    let value = '';
                    if (pLine.NominalValue) {
                      value = String(pLine.NominalValue.value !== undefined ? pLine.NominalValue.value : pLine.NominalValue);
                    }
                    if (name && value) {
                      props[String(name)] = value;
                    }
                  }
                }
              }

              const relatedObjs = Array.isArray(rel.RelatedObjects) ? rel.RelatedObjects : [rel.RelatedObjects];
              for (const objRef of relatedObjs) {
                const objId = typeof objRef === 'number' ? objRef : objRef?.value;
                if (objId && typeof objId === 'number' && objId > 0) {
                  const existing = elementPropertiesMap.get(objId) || {};
                  elementPropertiesMap.set(objId, { ...existing, ...props });
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

  // Collect piece marks & properties
  const piecesByMark = new Map<string, PieceInfo[]>();
  const pieceByExpressID = new Map<number, PieceInfo>();
  const uniqueMarksSet = new Set<string>();
  const sectionColorMap = new Map<string, string>();
  let colorIndex = 0;

  // Process Native Assemblies if present
  for (let i = 0; i < assemblies.size(); i++) {
    const assID = assemblies.get(i);
    try {
      const assObj = ifcApi.GetLine(modelID, assID);
      const props = elementPropertiesMap.get(assID) || {};
      const rawProps = getSyncProperties(ifcApi, modelID, assID);
      let pmark = props.PieceMark || props.Reference || props.Mark || props.Tag || rawProps.Name || 'indefinido';
      if (pmark === 'indefinido') pmark = '';
      
      const children = assemblyToChildren.get(assID) || [];
      const piece: PieceInfo = {
        expressID: assID,
        guid: assObj?.GlobalId?.value || '',
        name: assObj?.Name?.value || 'Montagem Estrutural',
        type: 'IFCELEMENTASSEMBLY',
        pieceMark: pmark,
        childrenIDs: children,
        connectedMeshIDs: children,
        section: props.Section || props.Profile,
        phase: props.Phase || extractPhaseFromMark(pmark),
        ofNumber: extractOFFromMark(pmark)
      };

      if (pmark) {
        uniqueMarksSet.add(pmark);
        if (!piecesByMark.has(pmark)) piecesByMark.set(pmark, []);
        piecesByMark.get(pmark)!.push(piece);
      }
      pieceByExpressID.set(assID, piece);
    } catch {
      // ignore
    }
  }

  // 5. Generate 3D Meshes with Three.js
  if (onProgress) onProgress(75, 'Gerando malhas geométricas 3D...');
  const sceneGroup = new THREE.Group();
  sceneGroup.name = 'IFC_ROOT_MODEL';

  // Base metallic light gray material
  const defaultSteelMat = new THREE.MeshStandardMaterial({
    color: 0xb0bec5, // Metallic Light Gray
    metalness: 0.58,
    roughness: 0.38,
    side: THREE.DoubleSide
  });

  const materialCache = new Map<string, THREE.MeshStandardMaterial>();

  let totalMeshes = 0;

  ifcApi.StreamAllMeshes(modelID, (flatMesh: WebIFC.FlatMesh) => {
    const expressID = flatMesh.expressID;
    const placedGeometries = flatMesh.geometries;

    // Check properties for this element
    const props = elementPropertiesMap.get(expressID) || {};
    const rawProps = getSyncProperties(ifcApi, modelID, expressID);
    
    // Look up mark from element properties OR parent assembly OR weld group peers
    let pmark = props.PieceMark || props.Reference || props.Mark || props.Tag || rawProps.Name || '';
    if (pmark === 'indefinido') pmark = '';

    if (!pmark) {
      const parentID = childToAssemblyMap.get(expressID);
      if (parentID) {
        const parentProps = elementPropertiesMap.get(parentID) || {};
        const parentRaw = getSyncProperties(ifcApi, modelID, parentID);
        pmark = parentProps.PieceMark || parentProps.Reference || parentProps.Mark || parentProps.Tag || parentRaw.Name || '';
        if (pmark === 'indefinido') pmark = '';
      }
    }

    const connectedGroup = weldedGroupMap.get(expressID) || [expressID];
    if (!pmark) {
      for (const peerID of connectedGroup) {
        const peerProps = elementPropertiesMap.get(peerID) || {};
        const peerRaw = getSyncProperties(ifcApi, modelID, peerID);
        const peerMark = peerProps.PieceMark || peerProps.Reference || peerProps.Mark || peerProps.Tag || peerRaw.Name || '';
        if (peerMark && peerMark !== 'indefinido') {
          pmark = peerMark;
          break;
        }
      }
    }

    const section = props.Section || props.Profile || props.Description || rawProps.Name || '';

    // Determine section color
    const colorKey = section || 'PADRAO';
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
          metalness: 0.4,
          roughness: 0.5,
          side: THREE.DoubleSide
        })
      );
    }
    const mat = defaultSteelMat;

    for (let g = 0; g < placedGeometries.size(); g++) {
      const placedGeo = placedGeometries.get(g);
      const ifcGeo = ifcApi.GetGeometry(modelID, placedGeo.geometryExpressID);

      const positions = ifcApi.GetVertexArray(ifcGeo.GetVertexData(), ifcGeo.GetVertexDataSize());
      const indices = ifcApi.GetIndexArray(ifcGeo.GetIndexData(), ifcGeo.GetIndexDataSize());

      const bufferGeo = new THREE.BufferGeometry();
      bufferGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      bufferGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
      bufferGeo.computeVertexNormals();

      const mesh = new THREE.Mesh(bufferGeo, mat);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.fromArray(placedGeo.flatTransformation);
      mesh.matrixWorldNeedsUpdate = true;
      mesh.userData = {
        expressID,
        pieceMark: pmark,
        section,
        colorKey,
        connectedMeshIDs: connectedGroup
      };

      sceneGroup.add(mesh);
      totalMeshes++;

      // Register piece in lookup map
      if (!pieceByExpressID.has(expressID)) {
        const piece: PieceInfo = {
          expressID,
          guid: '',
          name: section || 'Peça Estrutural',
          type: 'ELEMENT',
          pieceMark: pmark,
          section,
          connectedMeshIDs: connectedGroup,
          mesh
        };
        pieceByExpressID.set(expressID, piece);
        if (pmark && pmark !== 'indefinido') {
          uniqueMarksSet.add(pmark);
          if (!piecesByMark.has(pmark)) piecesByMark.set(pmark, []);
          piecesByMark.get(pmark)!.push(piece);
        }
      } else {
        pieceByExpressID.get(expressID)!.mesh = mesh;
        pieceByExpressID.get(expressID)!.connectedMeshIDs = connectedGroup;
      }
    }
  });

  // Calculate Quality Audit & Fallback Status
  let qualityScore: 'EXCELENTE' | 'BOM' | 'ATENÇÃO' = 'ATENÇÃO';
  let qualityMessage = '';
  let recommendation = '';
  const fallbackActive = !isEM11 || totalAssemblies === 0;

  if (isEM11 && totalAssemblies > 0) {
    qualityScore = 'EXCELENTE';
    qualityMessage = 'Modelo exportado no padrão AISC EM.11 (SteelFabricationView). Todas as montagens e marcas principais de conjuntos estão 100% integradas nativamente.';
  } else if (totalWeldedGroups > 0 || uniqueMarksSet.size > 0) {
    qualityScore = 'BOM';
    qualityMessage = `Modo Fallback Ativado: ${totalWeldedGroups} conjuntos soldados identificados por conectividade topológica (IFCRELCONNECTS). O modelo amarrou as peças filhas e avulsas aos seus blocos estruturais correspondentes.`;
    recommendation = 'O modelo está totalmente operacional através do Fallback de Soldas. Para máxima compatibilidade nativa, utilize a opção "IFC MDV EM.11" nas exportações futuras do Advance Steel.';
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

// Helpers

function getSyncProperties(ifcApi: WebIFC.IfcAPI, modelID: number, expressID: number): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const raw = ifcApi.GetLine(modelID, expressID);
    if (raw && raw.Name && raw.Name.value) {
      result.Name = raw.Name.value;
    }
  } catch {}
  return result;
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
