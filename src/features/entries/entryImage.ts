import { validateImage } from "../../shared/imageValidation";

const entryMaxSizeMessage = "La imagen no puede superar aproximadamente 10,49 MB.";

export async function validateEntryImage(file: File): Promise<void> {
  await validateImage(file, { maxSizeMessage: entryMaxSizeMessage });
}
