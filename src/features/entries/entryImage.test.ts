import { validateEntryImage } from "./entryImage";

const originalCreateImageBitmap = globalThis.createImageBitmap;

function mockBitmap(width: number, height: number) {
  const close = jest.fn();
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: jest.fn().mockResolvedValue({ width, height, close }),
  });
  return close;
}

afterEach(() => {
  if (originalCreateImageBitmap) {
    Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: originalCreateImageBitmap });
  } else {
    Reflect.deleteProperty(globalThis, "createImageBitmap");
  }
});

test.each(["image/jpeg", "image/png", "image/webp"])("accepts a decodable %s within the limits", async (type) => {
  const close = mockBitmap(4096, 4096);
  const file = new File(["image bytes"], "entry-image", { type });

  await expect(validateEntryImage(file)).resolves.toBeUndefined();
  expect(close).toHaveBeenCalledTimes(1);
});

test("rejects formats outside JPEG, PNG and WebP before decoding", async () => {
  const decode = jest.fn();
  Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: decode });

  await expect(validateEntryImage(new File(["image"], "entry.gif", { type: "image/gif" })))
    .rejects.toThrow("Selecciona una imagen JPEG, PNG o WebP.");
  expect(decode).not.toHaveBeenCalled();
});

test("rejects files larger than 10 MiB before decoding", async () => {
  const decode = jest.fn();
  Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: decode });
  const file = { type: "image/png", size: 10 * 1024 * 1024 + 1 } as File;

  await expect(validateEntryImage(file)).rejects.toThrow("La imagen no puede superar 10 MiB.");
  expect(decode).not.toHaveBeenCalled();
});

test("accepts a file exactly 10 MiB", async () => {
  mockBitmap(100, 100);
  const file = { type: "image/png", size: 10 * 1024 * 1024 } as File;

  await expect(validateEntryImage(file)).resolves.toBeUndefined();
});

test.each([[4097, 100], [100, 4097]])("rejects images over 4096 px (%i × %i)", async (width, height) => {
  const close = mockBitmap(width, height);

  await expect(validateEntryImage(new File(["image"], "entry.png", { type: "image/png" })))
    .rejects.toThrow("La imagen no puede superar 4096 × 4096 px.");
  expect(close).toHaveBeenCalledTimes(1);
});

test("rejects unreadable image content", async () => {
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: jest.fn().mockRejectedValue(new Error("decode failed")),
  });

  await expect(validateEntryImage(new File(["not an image"], "dish.png", { type: "image/png" })))
    .rejects.toThrow("No se pudo leer la imagen. Selecciona un archivo válido.");
});
