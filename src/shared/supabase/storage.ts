import { supabase } from './client';

export interface UploadAssetOptions {
  bucket: 'items' | 'batalha' | 'midias';
  path: string;
  file: Blob | File | ArrayBuffer | Uint8Array;
  contentType?: string;
  upsert?: boolean;
}

export async function uploadPublicAsset({
  bucket,
  path,
  file,
  contentType,
  upsert = true,
}: UploadAssetOptions): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert,
    cacheControl: '31536000',
  });

  if (error) {
    throw new Error(`Falha ao enviar arquivo para ${bucket}/${path}: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function getPublicAssetUrl(bucket: 'items' | 'batalha' | 'midias', path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deletePublicAsset(
  bucket: 'items' | 'batalha' | 'midias',
  paths: string[],
): Promise<void> {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    throw new Error(`Falha ao remover arquivo(s) de ${bucket}: ${error.message}`);
  }
}
