const maxImageBytes = 10 * 1024 * 1024;
const maxImageDimension = 4096;
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function validateEntryImage(file: File): Promise<void> {
  if (!acceptedImageTypes.has(file.type)) {
    throw new Error("Selecciona una imagen JPEG, PNG o WebP.");
  }
  if (file.size > maxImageBytes) {
    throw new Error("La imagen no puede superar 10 MiB.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("No se pudo leer la imagen. Selecciona un archivo válido.");
  }

  try {
    if (bitmap.width > maxImageDimension || bitmap.height > maxImageDimension) {
      throw new Error("La imagen no puede superar 4096 × 4096 px.");
    }
  } finally {
    bitmap.close();
  }
}
