import { MAX_IMAGE_BYTES } from "../../shared/imageValidation";
import { validateEntryImage } from "./entryImage";

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

test("accepts a valid entry image within shared limits and closes the bitmap", async () => {
  const close = mockBitmap(4096, 4096);
  const file = new File(["image bytes"], "entry-image.webp", { type: "image/webp" });

  await expect(validateEntryImage(file)).resolves.toBeUndefined();
  expect(close).toHaveBeenCalledTimes(1);
});

test("rejects files larger than 10 MiB with the entry-specific size message before decoding", async () => {
  const decode = jest.fn();
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    writable: true,
    value: decode,
  });
  const file = { type: "image/png", size: MAX_IMAGE_BYTES + 1 } as File;

  await expect(validateEntryImage(file)).rejects.toThrow(
    "La imagen no puede superar aproximadamente 10,49 MB.",
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
    validateEntryImage(new File(["image"], "entry.gif", { type: "image/gif" })),
  ).rejects.toThrow("Selecciona una imagen JPEG, PNG o WebP.");
  expect(decode).not.toHaveBeenCalled();

  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    writable: true,
    value: jest.fn().mockRejectedValue(new Error("decode failed")),
  });
  await expect(
    validateEntryImage(new File(["not an image"], "dish.png", { type: "image/png" })),
  ).rejects.toThrow("No se pudo leer la imagen. Selecciona un archivo válido.");

  const close = mockBitmap(4097, 100);
  await expect(
    validateEntryImage(new File(["image"], "entry.png", { type: "image/png" })),
  ).rejects.toThrow("La imagen no puede superar 4096 × 4096 px.");
  expect(close).toHaveBeenCalledTimes(1);
});
