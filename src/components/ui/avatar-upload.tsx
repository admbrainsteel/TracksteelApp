
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AvatarUploadProps {
  currentImageUrl?: string | null;
  onImageUpload: (imageUrl: string) => void;
  onImageRemove: () => void;
  className?: string;
}

export function AvatarUpload({ 
  currentImageUrl, 
  onImageUpload, 
  onImageRemove,
  className = ""
}: AvatarUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File, maxSize: number = 256): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = maxSize;
        canvas.height = maxSize;

        // Draw image with aspect ratio maintained and centered
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        if (ctx) {
          ctx.drawImage(img, x, y, size, size, 0, 0, maxSize, maxSize);
        }

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.8);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato de arquivo não suportado. Use JPG, PNG, GIF ou WebP.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5242880) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    try {
      setUploading(true);

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);

      // Resize image
      const resizedBlob = await resizeImage(file);
      
      // Upload to Supabase Storage
      const fileName = `${user.id}/avatar-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, resizedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(data.path);

      onImageUpload(publicUrl);
      toast.success('Foto de perfil atualizada com sucesso!');

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao fazer upload da imagem');
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    try {
      // Extract file path from URL
      const urlParts = currentImageUrl.split('/');
      const filePath = urlParts.slice(-2).join('/'); // user_id/filename

      // Delete from storage
      await supabase.storage
        .from('profile-images')
        .remove([filePath]);

      setPreviewUrl(null);
      onImageRemove();
      toast.success('Foto de perfil removida');

    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Erro ao remover imagem');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-4">
        {/* Avatar Preview */}
        <div className="relative">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-600"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-600 flex items-center justify-center border-2 border-slate-500">
              <Upload className="w-8 h-8 text-slate-400" />
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <Upload className="w-4 h-4 mr-2" />
              {previewUrl ? 'Alterar' : 'Upload'}
            </Button>

            {previewUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveImage}
                disabled={uploading}
                className="bg-red-700 border-red-600 text-white hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            JPG, PNG, GIF ou WebP. Máximo 5MB.
          </p>
        </div>
      </div>
    </div>
  );
}
