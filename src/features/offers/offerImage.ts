import { validateImage } from "../../shared/imageValidation";

const offerMaxSizeMessage = "La imagen no puede superar 10 MiB.";

export async function validateOfferImage(file: File): Promise<void> {
  await validateImage(file, { maxSizeMessage: offerMaxSizeMessage });
}
