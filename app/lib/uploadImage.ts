/**
 * Frontend-only image "upload" — converts a File or existing data/URL
 * string to a base64 data URL kept entirely in the browser. No network
 * call, no storage bucket.
 */
export async function uploadImage(
  fileOrDataUrl: File | string,
  _bucket = "images",
  _folder = "uploads",
): Promise<string> {
  if (typeof fileOrDataUrl === "string") {
    return fileOrDataUrl;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(fileOrDataUrl);
  });
}
