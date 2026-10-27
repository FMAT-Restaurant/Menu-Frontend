export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 4096;
export const ACCEPTED_IMAGE_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export interface ImageValidationOptions {
  readonly maxSizeMessage?: string;
}

const defaultMaxSizeMessage = "La imagen no puede superar 10 MiB.";

export async function validateImage(
  file: File,
  options?: ImageValidationOptions,
): Promise<void> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Selecciona una imagen JPEG, PNG o WebP.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(options?.maxSizeMessage ?? defaultMaxSizeMessage);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("No se pudo leer la imagen. Selecciona un archivo válido.");
  }

  try {
    if (bitmap.width > MAX_IMAGE_DIMENSION || bitmap.height > MAX_IMAGE_DIMENSION) {
      throw new Error("La imagen no puede superar 4096 × 4096 px.");
    }
  } finally {
    bitmap.close();
  }
}
