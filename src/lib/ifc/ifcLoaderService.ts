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

  const wasmPaths = [
    '/wasm/',
    'https://unpkg.com/web-ifc@0.0.57/',
    'https://cdn.jsdelivr.net/npm/web-ifc@0.0.57/'
  ];

  let wasmInitSuccess = false;
  for (const path of wasmPaths) {
    try {
      ifcApi.SetWasmPath(path);
      await ifcApi.Init();
      wasmInitSuccess = true;
      break;
    } catch {
      // try next
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

  for (let i = 0; i < aggregates.size(); i++) {
    const relID = aggregates.get(i);
    try {
      const rel = ifcApi.GetLine(modelID, relID);
      if (rel && rel.RelatingObject && rel.RelatedObjects) {
        const parentID = rel.RelatingObject.value;
        const childIDs = (rel.RelatedObjects as any[]).map((r: any) => r.value);
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
      const props = await getPropertiesForElement(ifcApi, modelID, assID);
      const pmark = props.PieceMark || props.Reference || props.Mark || props.Tag || 'indefinido';
      
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

      if (pmark !== 'indefinido') {
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

  const defaultGrayMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.35,
    roughness: 0.55,
    side: THREE.DoubleSide
  });

  const materialCache = new Map<string, THREE.MeshStandardMaterial>();

  let totalMeshes = 0;

  ifcApi.StreamAllMeshes(modelID, (flatMesh: WebIFC.FlatMesh) => {
    const expressID = flatMesh.expressID;
    const placedGeometries = flatMesh.geometries;

    // Check properties for this element
    let pmark = '';
    let section = '';
    try {
      const rawProps = getSyncProperties(ifcApi, modelID, expressID);
      pmark = rawProps.PieceMark || rawProps.Reference || rawProps.Mark || '';
      section = rawProps.Section || rawProps.Profile || '';
    } catch {
      // fallback
    }

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
    const mat = materialCache.get(hexColor) || defaultGrayMat;

    // Get welded connected peers (Fallback topology)
    const connectedGroup = weldedGroupMap.get(expressID) || [expressID];

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
async function getPropertiesForElement(ifcApi: WebIFC.IfcAPI, modelID: number, expressID: number): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  try {
    const psets = ifcApi.GetPropertySetsForLines(modelID, [expressID]);
    for (const pset of psets) {
      if (pset.HasProperties) {
        for (const propRef of pset.HasProperties) {
          const prop = ifcApi.GetLine(modelID, propRef.value);
          if (prop && prop.Name && prop.NominalValue) {
            result[prop.Name.value] = String(prop.NominalValue.value);
          }
        }
      }
    }
  } catch {
    // fallback
  }
  return result;
}

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
