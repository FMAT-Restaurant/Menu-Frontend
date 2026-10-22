import axios, { type AxiosAdapter } from "axios";
import { createMenuApi, executeSealedAttemptWithClient } from "./menuApi";
import {
  createSealedAttempt,
  isUuidV4,
  sealJsonPayload,
  sealMultipartFilePayload,
} from "../application/operationAttempt";

const entry = {
  id: "entry-1",
  brandName: "Bowl de pollo",
  description: "Con arroz",
  status: "INACTIVE" as const,
  categoryIds: ["category-1"],
  image: { id: "image-1", url: "/images/1", thumbnailUrl: "/images/1" },
};

test("uploads an image first, then creates an inactive entry with its imageId in JSON", async () => {
  const requests: {
    method?: string;
    url?: string;
    data: unknown;
    idempotencyKey?: string;
  }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      data: config.data,
      idempotencyKey: config.headers?.get("Idempotency-Key")?.toString(),
    });
    const upload = config.url === "/media/images";
    return {
      config,
      data: {
        data: upload
          ? {
              id: "image-1",
              url: "/images/1",
              thumbnailUrl: "/images/1-thumb",
            }
          : entry,
      },
      headers: {},
      status: 201,
      statusText: "Created",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  const image = new File(["image bytes"], "bowl.png", { type: "image/png" });

  const imageId = await api.uploadEntryImage(image);
  await expect(
    api.createEntry({
      brandName: entry.brandName,
      description: entry.description,
      categoryIds: entry.categoryIds,
      imageId,
    }),
  ).resolves.toEqual(entry);

  expect(requests.map(({ method, url }) => `${method} ${url}`)).toEqual([
    "post /media/images",
    "post /menu/entries",
  ]);
  expect(isUuidV4(requests[0].idempotencyKey)).toBe(true);
  expect(isUuidV4(requests[1].idempotencyKey)).toBe(true);
  expect(requests[0].idempotencyKey).not.toBe(requests[1].idempotencyKey);
  expect(requests[0].data).toBeInstanceOf(FormData);
  if (requests[0].data instanceof FormData) {
    expect(requests[0].data.get("file")).toBe(image);
  }
  if (typeof requests[1].data === "string") {
    expect(JSON.parse(requests[1].data)).toEqual({
      brandName: entry.brandName,
      description: entry.description,
      categoryIds: entry.categoryIds,
      imageId: "image-1",
    });
  }
});

test("edits an entry with If-Match and preserves its image when no file is selected", async () => {
  const requests: {
    method?: string;
    url?: string;
    data?: unknown;
    ifMatch?: string;
  }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      data: typeof config.data === "string" ? JSON.parse(config.data) : undefined,
      ifMatch: config.headers.get("If-Match")?.toString(),
    });
    return {
      config,
      data: { data: entry },
      headers: { etag: '"rev-3"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  const draft = {
    brandName: "Bowl especial",
    description: "Con verduras",
    categoryIds: [],
    status: "INACTIVE" as const,
  };

  const opened = await api.getEntry(entry.id);
  await expect(
    api.updateEntry(entry.id, draft, opened.etag ?? ""),
  ).resolves.toEqual(entry);
  expect(requests).toEqual([
    {
      method: "get",
      url: "/menu/entries/entry-1",
      data: undefined,
      ifMatch: undefined,
    },
    {
      method: "patch",
      url: "/menu/entries/entry-1",
      data: draft,
      ifMatch: '"rev-3"',
    },
  ]);
});

test("uploads a replacement image before PATCH and sends only its id with the current ETag", async () => {
  const requests: {
    method?: string;
    url?: string;
    data: unknown;
    ifMatch?: string;
  }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      data: config.data,
      ifMatch: config.headers.get("If-Match")?.toString(),
    });
    return {
      config,
      data: {
        data:
          config.url === "/media/images"
            ? {
                id: "image-2",
                url: "/images/2.png",
                thumbnailUrl: "/images/2-thumb.png",
              }
            : entry,
      },
      headers: { etag: '"rev-3"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  const image = new File(["new image"], "new.png", { type: "image/png" });
  const draft = {
    brandName: "Bowl especial",
    description: "Con verduras",
    categoryIds: [],
    status: "INACTIVE" as const,
  };

  const imageId = await api.uploadEntryImage(image);
  await api.updateEntry(entry.id, { ...draft, imageId }, '"rev-opened"');
  expect(requests.map(({ method, url }) => `${method} ${url}`)).toEqual([
    "post /media/images",
    "patch /menu/entries/entry-1",
  ]);
  if (requests[0].data instanceof FormData) {
    expect(requests[0].data.get("file")).toBe(image);
  }
  if (typeof requests[1].data === "string") {
    expect(JSON.parse(requests[1].data)).toEqual({
      ...draft,
      imageId: "image-2",
    });
  }
  expect(requests[1].ifMatch).toBe('"rev-opened"');
});

test("does not create an entry when image upload fails", async () => {
  const requests: string[] = [];
  const uploadError = new Error("Invalid image");
  const adapter: AxiosAdapter = async (config) => {
    requests.push(`${config.method} ${config.url}`);
    throw uploadError;
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(
    api.uploadEntryImage(new File(["bad"], "bad.png", { type: "image/png" })),
  ).rejects.toBe(uploadError);
  expect(requests).toEqual(["post /media/images"]);
});

test("does not create an entry when the upload response has no imageId", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(`${config.method} ${config.url}`);
    return {
      config,
      data: { data: {} },
      headers: {},
      status: 201,
      statusText: "Created",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(
    api.uploadEntryImage(
      new File(["image"], "bowl.png", { type: "image/png" }),
    ),
  ).rejects.toThrow("No se recibió el identificador de la imagen");
  expect(requests).toEqual(["post /media/images"]);
});

test("does not patch an entry if its current ETag is missing", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(`${config.method} ${config.url}`);
    return {
      config,
      data: { data: entry },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(
    api.updateEntry(
      entry.id,
      {
        brandName: "Bowl especial",
        description: "Con arroz",
        categoryIds: [],
        status: "INACTIVE",
      },
      "",
    ),
  ).rejects.toThrow("No se recibió una versión fuerte de la entrada");
  expect(requests).toEqual([]);
});

test.each(["", 'W/"rec-1"', "unquoted", "*"])(
  "does not patch or delete a recipe if its current ETag is not strong (%p)",
  async (invalidEtag) => {
    const requests: string[] = [];
    const adapter: AxiosAdapter = async (config) => {
      requests.push(`${config.method} ${config.url}`);
      return {
        config,
        data: {
          data: {
            id: "recipe-1",
            name: "Receta",
            description: "Desc",
            instructions: "Inst",
            supplies: [],
          },
        },
        headers: invalidEtag ? { etag: invalidEtag } : {},
        status: 200,
        statusText: "OK",
      };
    };
    const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

    await expect(
      api.updateRecipe("recipe-1", {
        name: "Receta 2",
        description: "Desc 2",
        instructions: "Inst 2",
        supplies: [],
      }),
    ).rejects.toThrow("No se recibió la versión de la receta");

    await expect(api.deleteRecipe("recipe-1")).rejects.toThrow(
      "No se recibió la versión de la receta",
    );
    expect(requests).toEqual([
      "get /menu/recipes/recipe-1",
      "get /menu/recipes/recipe-1",
    ]);
  },
);

test.each(["", 'W/"cat-1"', "unquoted", "*"])(
  "does not patch a category if its opening ETag is not strong (%p)",
  async (invalidEtag) => {
    const requests: string[] = [];
    const adapter: AxiosAdapter = async (config) => {
      requests.push(`${config.method} ${config.url}`);
      return {
        config,
        data: { data: { id: "cat-1", name: "Postres" } },
        headers: {},
        status: 200,
        statusText: "OK",
      };
    };
    const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

    await expect(
      api.updateCategory("cat-1", { name: "Postres 2", description: "" }, invalidEtag),
    ).rejects.toThrow("No se recibió la versión de la categoría");
    expect(requests).toEqual([]);
  },
);

const offerDetail = {
  id: "offer-1",
  entryId: "entry-1",
  presentationTag: "Individual",
  basePrice: 150,
  status: "INACTIVE" as const,
  image: {
    id: "img-1",
    url: "/images/offer-1.png",
    thumbnailUrl: "/images/offer-1-thumb.png",
  },
  composition: {
    slots: [
      {
        slotId: "slot-1",
        name: "Principal",
        quantity: 1,
        course: "plato fuerte" as const,
        options: [
          {
            optionId: "opt-1",
            displayName: "Hamburguesa Doble",
            status: "ACTIVE" as const,
            sourceType: "RECIPE" as const,
            recipeId: "recipe-1",
            recipeRevision: 1,
          },
        ],
      },
    ],
  },
};

test("gets an offer by ID from the menu offers endpoint", async () => {
  const requests: { method?: string; url?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ method: config.method, url: config.url });
    return {
      config,
      data: { data: offerDetail },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.getOffer("offer-1")).resolves.toEqual(offerDetail);
  expect(requests).toEqual([{ method: "get", url: "/menu/offers/offer-1" }]);
});

test("creates an offer uploading its image first, then posting to /menu/entries/{entryId}/offers with Idempotency-Key", async () => {
  const requests: {
    method?: string;
    url?: string;
    data: unknown;
    idempotencyKey?: string;
  }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      data: config.data,
      idempotencyKey: config.headers?.get("Idempotency-Key")?.toString(),
    });
    const isImage = config.url === "/media/images";
    return {
      config,
      data: {
        data: isImage
          ? {
              id: "img-uploaded-1",
              url: "/images/offer-1.png",
              thumbnailUrl: "/images/offer-1-thumb.png",
            }
          : offerDetail,
      },
      headers: {},
      status: 201,
      statusText: "Created",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  const image = new File(["offer bytes"], "offer.png", { type: "image/png" });
  const draft = {
    presentationTag: "Individual",
    basePrice: 150,
    composition: offerDetail.composition,
  };

  await expect(api.createOffer("entry-1", draft, image)).resolves.toEqual(
    offerDetail,
  );

  expect(requests.map(({ method, url }) => `${method} ${url}`)).toEqual([
    "post /media/images",
    "post /menu/entries/entry-1/offers",
  ]);
  expect(isUuidV4(requests[0].idempotencyKey)).toBe(true);
  expect(isUuidV4(requests[1].idempotencyKey)).toBe(true);
  expect(requests[0].data).toBeInstanceOf(FormData);
  if (requests[0].data instanceof FormData) {
    expect(requests[0].data.get("file")).toBe(image);
  }
  if (typeof requests[1].data === "string") {
    expect(JSON.parse(requests[1].data)).toEqual({
      ...draft,
      imageId: "img-uploaded-1",
    });
  }
});

test("updates an offer with If-Match and Idempotency-Key from current offer ETag and preserves image when no file is passed", async () => {
  const requests: {
    method?: string;
    url?: string;
    data?: unknown;
    ifMatch?: string;
    idempotencyKey?: string;
  }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      data: typeof config.data === "string" ? JSON.parse(config.data) : undefined,
      ifMatch: config.headers?.get("If-Match")?.toString(),
      idempotencyKey: config.headers?.get("Idempotency-Key")?.toString(),
    });
    return {
      config,
      data: { data: offerDetail },
      headers: { etag: '"offer-rev-5"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  const updateDraft = {
    presentationTag: "Individual Modificado",
    basePrice: 160,
    status: "ACTIVE" as const,
    composition: offerDetail.composition,
  };

  await expect(api.updateOffer("offer-1", updateDraft)).resolves.toEqual(
    offerDetail,
  );
  expect(requests).toHaveLength(2);
  expect(requests[0]).toMatchObject({
    method: "get",
    url: "/menu/offers/offer-1",
    data: undefined,
    ifMatch: undefined,
  });
  expect(requests[1]).toMatchObject({
    method: "patch",
    url: "/menu/offers/offer-1",
    data: updateDraft,
    ifMatch: '"offer-rev-5"',
  });
  expect(isUuidV4(requests[1].idempotencyKey)).toBe(true);
});

test("updates an offer uploading new image before PATCH with If-Match", async () => {
  const requests: {
    method?: string;
    url?: string;
    data: unknown;
    ifMatch?: string;
  }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      data: config.data,
      ifMatch: config.headers?.get("If-Match")?.toString(),
    });
    return {
      config,
      data: {
        data:
          config.url === "/media/images"
            ? {
                id: "img-new-2",
                url: "/images/new-2.png",
                thumbnailUrl: "/images/new-2-thumb.png",
              }
            : offerDetail,
      },
      headers: { etag: '"offer-rev-6"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  const newImage = new File(["new image bytes"], "replacement.png", {
    type: "image/png",
  });
  const updateDraft = {
    presentationTag: "Individual",
    basePrice: 170,
    status: "ACTIVE" as const,
    composition: offerDetail.composition,
  };

  await api.updateOffer("offer-1", updateDraft, newImage);
  expect(requests.map(({ method, url }) => `${method} ${url}`)).toEqual([
    "post /media/images",
    "get /menu/offers/offer-1",
    "patch /menu/offers/offer-1",
  ]);
  if (requests[0].data instanceof FormData) {
    expect(requests[0].data.get("file")).toBe(newImage);
  }
  if (typeof requests[2].data === "string") {
    expect(JSON.parse(requests[2].data)).toEqual({
      ...updateDraft,
      imageId: "img-new-2",
    });
  }
  expect(requests[2].ifMatch).toBe('"offer-rev-6"');
});

test("executes sealed JSON and multipart attempts via executeSealedAttemptWithClient", async () => {
  const captured: Array<{
    method?: string;
    url?: string;
    idempotencyKey?: string;
    ifMatch?: string;
    timeout?: number;
  }> = [];
  const adapter: AxiosAdapter = async (config) => {
    captured.push({
      method: config.method,
      url: config.url,
      idempotencyKey: config.headers?.get("Idempotency-Key")?.toString(),
      ifMatch: config.headers?.get("If-Match")?.toString(),
      timeout: config.timeout,
    });
    return {
      config,
      data: { data: { id: "ok" } },
      headers: { etag: '"rev-9"' },
      status: 200,
      statusText: "OK",
    };
  };
  const client = axios.create({ baseURL: "/api/v1", adapter });

  const uploadAttempt = createSealedAttempt({
    operationKind: "image.upload",
    method: "POST",
    endpointPath: "/media/images",
    payload: sealMultipartFilePayload(
      new Blob(["bytes"], { type: "image/png" }),
      "pic.png",
    ),
    idempotencyKey: "11111111-2222-4333-8444-555555555555",
  });

  const patchAttempt = createSealedAttempt({
    operationKind: "offer.patch",
    method: "PATCH",
    endpointPath: "/menu/offers/offer-1",
    payload: sealJsonPayload({ basePrice: 180 }, '"offer-rev-2"'),
    idempotencyKey: "22222222-3333-4444-9555-666666666666",
  });

  const postAttempt = createSealedAttempt({
    operationKind: "category.create",
    method: "POST",
    endpointPath: "/menu/categories",
    payload: sealJsonPayload({ name: "Sopas" }),
    idempotencyKey: "33333333-4444-4555-8666-777777777777",
  });

  await executeSealedAttemptWithClient(client, uploadAttempt);
  await executeSealedAttemptWithClient(client, patchAttempt);
  await executeSealedAttemptWithClient(client, postAttempt);

  expect(captured).toEqual([
    {
      method: "post",
      url: "/media/images",
      idempotencyKey: "11111111-2222-4333-8444-555555555555",
      ifMatch: undefined,
      timeout: 120000,
    },
    {
      method: "patch",
      url: "/menu/offers/offer-1",
      idempotencyKey: "22222222-3333-4444-9555-666666666666",
      ifMatch: '"offer-rev-2"',
      timeout: 20000,
    },
    {
      method: "post",
      url: "/menu/categories",
      idempotencyKey: "33333333-4444-4555-8666-777777777777",
      ifMatch: undefined,
      timeout: 20000,
    },
  ]);
});
