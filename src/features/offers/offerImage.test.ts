import { MAX_IMAGE_BYTES } from "../../shared/imageValidation";
import { validateOfferImage } from "./offerImage";

const originalCreateImageBitmapDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "createImageBitmap",
);

function mockBitmap(width: number, height: number) {
  const close = jest.fn();
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    writable: true,
    value: jest.fn().mockResolvedValue({ width, height, close }),
  });
  return close;
}

afterEach(() => {
  if (originalCreateImageBitmapDescriptor) {
    Object.defineProperty(
      globalThis,
      "createImageBitmap",
      originalCreateImageBitmapDescriptor,
    );
  } else {
    Reflect.deleteProperty(globalThis, "createImageBitmap");
  }
  jest.restoreAllMocks();
});

test("accepts a valid offer image within shared limits and closes the bitmap", async () => {
  const close = mockBitmap(4096, 4096);
  const file = new File(["image bytes"], "offer-image.jpeg", { type: "image/jpeg" });

  await expect(validateOfferImage(file)).resolves.toBeUndefined();
  expect(close).toHaveBeenCalledTimes(1);
});

test("rejects files larger than 10 MiB with the offer-specific size message before decoding", async () => {
  const decode = jest.fn();
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    writable: true,
    value: decode,
  });
  const file = { type: "image/png", size: MAX_IMAGE_BYTES + 1 } as File;

  await expect(validateOfferImage(file)).rejects.toThrow(
    "La imagen no puede superar 10 MiB.",
  );
  expect(decode).not.toHaveBeenCalled();
});

test("delegates format, decode, and dimension checks to the shared validator", async () => {
  const decode = jest.fn();
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    writable: true,
    value: decode,
  });

  await expect(
    validateOfferImage(new File(["image"], "offer.gif", { type: "image/gif" })),
  ).rejects.toThrow("Selecciona una imagen JPEG, PNG o WebP.");
  expect(decode).not.toHaveBeenCalled();

  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    writable: true,
    value: jest.fn().mockRejectedValue(new Error("Corrupt file")),
  });
  await expect(
    validateOfferImage(new File(["bad bytes"], "corrupted.png", { type: "image/png" })),
  ).rejects.toThrow("No se pudo leer la imagen. Selecciona un archivo válido.");

  const close = mockBitmap(100, 4097);
  await expect(
    validateOfferImage(new File(["image"], "offer.png", { type: "image/png" })),
  ).rejects.toThrow("La imagen no puede superar 4096 × 4096 px.");
  expect(close).toHaveBeenCalledTimes(1);
});
