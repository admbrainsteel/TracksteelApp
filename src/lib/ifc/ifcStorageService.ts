import { supabase } from '@/integrations/supabase/client';

const DB_NAME = 'TrackSteel_3D_Cache';
const STORE_NAME = 'ifc_models';
const DB_VERSION = 1;

/**
 * Abre o banco local IndexedDB para cache de alta performance de arquivos IFC.
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não disponível'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'ofNumber' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva o buffer binário do IFC no cache do navegador.
 */
export async function cacheIFCModel(ofNumber: string, url: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        ofNumber,
        url,
        buffer,
        cachedAt: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IFC Cache] Falha ao salvar no IndexedDB:', err);
  }
}

/**
 * Recupera o modelo IFC em cache local se a URL coincidir com a gravada no banco.
 */
export async function getCachedIFCModel(ofNumber: string, url?: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(ofNumber);

      req.onsuccess = () => {
        const res = req.result;
        if (res && res.buffer) {
          // Se uma URL específica foi solicitada, checa compatibilidade
          if (url && res.url && res.url !== url) {
            resolve(null);
            return;
          }
          resolve(res.buffer as ArrayBuffer);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[IFC Cache] Falha ao ler IndexedDB:', err);
    return null;
  }
}

/**
 * Remove do cache local
 */
export async function clearCachedIFCModel(ofNumber: string): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(ofNumber);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

/**
 * Realiza o upload do arquivo de modelo 3D (IFC ou WRL) para o Supabase Storage e salva o vínculo na OF.
 */
export async function uploadIFCToCloud(
  file: File,
  ofNumber: string,
  auditData?: any,
  onProgress?: (step: string, percent: number) => void
): Promise<{ publicUrl: string; filePath: string }> {
  const sanitizedOf = ofNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = file.name.split('.').pop()?.toLowerCase();
  const folder = (ext === 'wrl' || ext === 'wrz') ? 'wrl' : 'ifc';
  const filePath = `${folder}/${sanitizedOf}/${cleanFileName}`;

  if (onProgress) onProgress('Enviando modelo 3D para a nuvem...', 20);

  // 1. Upload no Supabase Storage (bucket modelos-3d)
  const { error: uploadError } = await supabase.storage
    .from('modelos-3d')
    .upload(filePath, file, {
      upsert: true,
      contentType: 'application/octet-stream'
    });

  if (uploadError) {
    console.error('[Storage] Erro no upload:', uploadError);
    throw new Error(`Falha ao salvar no storage: ${uploadError.message}`);
  }

  if (onProgress) onProgress('Obtendo link de acesso...', 60);

  // 2. Obter URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('modelos-3d')
    .getPublicUrl(filePath);

  if (onProgress) onProgress('Atualizando registro da Ordem de Fabricação...', 80);

  // 3. Atualizar tabela ordens_fabricacao
  const { error: dbError } = await supabase
    .from('ordens_fabricacao' as any)
    .update({
      ifc_url: publicUrl,
      ifc_filename: file.name,
      ifc_file_size: file.size,
      ifc_updated_at: new Date().toISOString()
    })
    .eq('num_of', ofNumber);

  if (dbError) {
    console.warn('[Storage] Aviso ao atualizar ordens_fabricacao:', dbError);
  }

  // 4. Inserir histórico em of_modelos_3d
  try {
    await supabase
      .from('of_modelos_3d' as any)
      .insert({
        of_number: ofNumber,
        filename: file.name,
        storage_path: filePath,
        public_url: publicUrl,
        file_size: file.size,
        audit_data: auditData || null,
        updated_at: new Date().toISOString()
      });
  } catch (histErr) {
    console.debug('[Storage] Registro histórico:', histErr);
  }

  // 5. Salva no cache local do navegador
  try {
    const buffer = await file.arrayBuffer();
    await cacheIFCModel(ofNumber, publicUrl, buffer);
  } catch (cErr) {
    console.debug('[Storage] Cache local:', cErr);
  }

  if (onProgress) onProgress('Modelo 3D salvo com sucesso!', 100);

  return { publicUrl, filePath };
}

export const uploadModel3DToCloud = uploadIFCToCloud;

/**
 * Baixa e armazena em cache o modelo IFC salvo para a OF.
 */
export async function fetchSavedIFCModel(
  ofNumber: string,
  url: string,
  onProgress?: (percent: number, step: string) => void
): Promise<ArrayBuffer> {
  // 1. Tenta recuperar do cache local primeiro para carregamento instantâneo
  const cached = await getCachedIFCModel(ofNumber, url);
  if (cached) {
    if (onProgress) onProgress(30, 'Modelo recuperado do cache ultrarrápido...');
    return cached;
  }

  // 2. Se não estiver no cache, baixa via rede
  if (onProgress) onProgress(15, 'Baixando modelo 3D salvo da nuvem...');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro ao baixar modelo (${response.status}: ${response.statusText})`);
  }

  const contentLengthHeader = response.headers.get('content-length');
  const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

  let arrayBuffer: ArrayBuffer;

  if (response.body && totalBytes > 0) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        if (onProgress && totalBytes > 0) {
          const downloadPercent = Math.min(Math.round((receivedBytes / totalBytes) * 40) + 10, 50);
          const mbDownloaded = (receivedBytes / (1024 * 1024)).toFixed(1);
          const mbTotal = (totalBytes / (1024 * 1024)).toFixed(1);
          onProgress(downloadPercent, `Baixando modelo 3D (${mbDownloaded}MB de ${mbTotal}MB)...`);
        }
      }
    }

    const fullBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    arrayBuffer = fullBuffer.buffer;
  } else {
    arrayBuffer = await response.arrayBuffer();
  }

  // 3. Salva no cache local para próximos acessos
  await cacheIFCModel(ofNumber, url, arrayBuffer);

  return arrayBuffer;
}

/**
 * Remove o vínculo de modelo IFC de uma OF.
 */
export async function removeSavedIFCModel(ofNumber: string): Promise<void> {
  await supabase
    .from('ordens_fabricacao' as any)
    .update({
      ifc_url: null,
      ifc_filename: null,
      ifc_file_size: null,
      ifc_updated_at: new Date().toISOString()
    })
    .eq('num_of', ofNumber);

  await clearCachedIFCModel(ofNumber);
}
