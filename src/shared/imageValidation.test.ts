import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
  validateImage,
} from "./imageValidation";

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

describe("validateImage", () => {
  test("exports the expected shared validation limits and accepted MIME types", () => {
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_IMAGE_DIMENSION).toBe(4096);
    expect(Array.from(ACCEPTED_IMAGE_TYPES)).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  test.each(["image/jpeg", "image/png", "image/webp"])(
    "accepts a decodable %s image at the 4096 × 4096 px limit and closes the bitmap",
    async (type) => {
      const close = mockBitmap(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION);
      const file = new File(["image bytes"], "valid-image", { type });

      await expect(validateImage(file)).resolves.toBeUndefined();
      expect(close).toHaveBeenCalledTimes(1);
    },
  );

  test.each(["image/gif", "image/svg+xml", ""])(
    "rejects unsupported format %s before decoding",
    async (type) => {
      const decode = jest.fn();
      Object.defineProperty(globalThis, "createImageBitmap", {
        configurable: true,
        writable: true,
        value: decode,
      });

      await expect(
        validateImage(new File(["image"], "unsupported", { type })),
      ).rejects.toThrow("Selecciona una imagen JPEG, PNG o WebP.");
      expect(decode).not.toHaveBeenCalled();
    },
  );

  test("accepts a file of exactly 10 MiB and closes the bitmap", async () => {
    const close = mockBitmap(100, 100);
    const file = { type: "image/png", size: MAX_IMAGE_BYTES } as File;

    await expect(validateImage(file)).resolves.toBeUndefined();
    expect(close).toHaveBeenCalledTimes(1);
  });

  test("rejects files larger than 10 MiB before decoding with the default message", async () => {
    const decode = jest.fn();
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      writable: true,
      value: decode,
    });
    const file = { type: "image/png", size: MAX_IMAGE_BYTES + 1 } as File;

    await expect(validateImage(file)).rejects.toThrow(
      "La imagen no puede superar 10 MiB.",
    );
    expect(decode).not.toHaveBeenCalled();
  });

  test("rejects files larger than 10 MiB before decoding with a custom maxSizeMessage", async () => {
    const decode = jest.fn();
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      writable: true,
      value: decode,
    });
    const file = { type: "image/png", size: MAX_IMAGE_BYTES + 1 } as File;

    await expect(
      validateImage(file, {
        maxSizeMessage: "La imagen no puede superar aproximadamente 10,49 MB.",
      }),
    ).rejects.toThrow("La imagen no puede superar aproximadamente 10,49 MB.");
    expect(decode).not.toHaveBeenCalled();
  });

  test.each([
    [MAX_IMAGE_DIMENSION + 1, 100],
    [100, MAX_IMAGE_DIMENSION + 1],
    [MAX_IMAGE_DIMENSION + 1, MAX_IMAGE_DIMENSION + 1],
  ])(
    "rejects images over 4096 px (%i × %i) and still closes the bitmap",
    async (width, height) => {
      const close = mockBitmap(width, height);

      await expect(
        validateImage(new File(["image"], "oversized.png", { type: "image/png" })),
      ).rejects.toThrow("La imagen no puede superar 4096 × 4096 px.");
      expect(close).toHaveBeenCalledTimes(1);
    },
  );

  test("rejects unreadable or corrupted image content when decoding fails", async () => {
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      writable: true,
      value: jest.fn().mockRejectedValue(new Error("decode failed")),
    });

    await expect(
      validateImage(new File(["not an image"], "corrupt.png", { type: "image/png" })),
    ).rejects.toThrow("No se pudo leer la imagen. Selecciona un archivo válido.");
  });
});
