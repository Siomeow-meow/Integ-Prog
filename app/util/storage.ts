/**
 * Frontend-only stand-in for Supabase Storage. Images are converted to
 * base64 data URLs and kept in localStorage/component state instead of
 * being uploaded anywhere — good enough for a local demo, though large
 * images will eat into localStorage's ~5MB quota.
 */
type UploadImageProps = {
  file: File;
  bucket?: string;
  path?: string;
};
type DeleteImageProps = {
  path: string;
  bucket?: string;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export const uploadImage = async ({ file }: UploadImageProps) => {
  return fileToDataUrl(file);
};

export const deleteImage = async (_props: DeleteImageProps) => {
  return null;
};
