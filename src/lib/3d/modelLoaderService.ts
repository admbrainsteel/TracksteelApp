import { loadAndAuditIFC, LoadedIFCResult, PieceInfo, IFCQualityAudit, getColorForMaterialName, isValidMark } from '@/lib/ifc/ifcLoaderService';
import { loadAndAuditWRL } from '@/lib/3d/wrlLoaderService';

export type { LoadedIFCResult, PieceInfo, IFCQualityAudit };
export { getColorForMaterialName, isValidMark };

// Tipo genérico para o resultado de qualquer modelo 3D carregado (IFC ou WRL)
export type LoadedModel3DResult = LoadedIFCResult;

/**
 * Detecta se os bytes iniciais ou a extensão correspondem a um arquivo VRML / WRL.
 */
function isWrlFormat(fileName?: string, buffer?: ArrayBuffer): boolean {
  if (fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.wrl') || lower.endsWith('.wrz') || lower.endsWith('.vrml')) {
      return true;
    }
  }

  if (buffer && buffer.byteLength >= 10) {
    const bytes = new Uint8Array(buffer.slice(0, 100));

    // Checa assinatura mágica GZIP (0x1f 0x8b) que arquivos .wrz frequentemente usam
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      // É gzip, em arquivos 3D industriais costuma ser VRML comprimido (.wrz)
      return true;
    }

    // Checa cabeçalho ASCII VRML (ex: "#VRML V2.0 utf8" ou "#VRML V1.0 ascii")
    const headerStr = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (headerStr.includes('#VRML')) {
      return true;
    }
  }

  return false;
}

/**
 * Função unificada para carregar e auditar qualquer modelo 3D suportado (IFC ou WRL/VRML).
 */
export async function loadAndAuditModel3D(
  fileOrBuffer: File | ArrayBuffer,
  fileNameHint?: string,
  onProgress?: (percent: number, step: string) => void
): Promise<LoadedModel3DResult> {
  const fileName = fileOrBuffer instanceof File ? fileOrBuffer.name : fileNameHint;
  let bufferSample: ArrayBuffer | undefined = undefined;

  if (fileOrBuffer instanceof ArrayBuffer) {
    bufferSample = fileOrBuffer;
  }

  const isWrl = isWrlFormat(fileName, bufferSample);

  if (isWrl) {
    return await loadAndAuditWRL(fileOrBuffer, onProgress);
  }

  // Padrão: IFC
  return await loadAndAuditIFC(fileOrBuffer, onProgress);
}
