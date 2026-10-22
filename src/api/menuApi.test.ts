import axios, { type AxiosAdapter } from "axios";
import { collectCategoryPages, createMenuApi } from "./menuApi";

const validEntryDetail = {
  id: "entry-1",
  brandName: "Bowl",
  description: "Con arroz",
  status: "INACTIVE" as const,
  categoryIds: ["category-1"],
  image: null,
};

const validOfferDetail = {
  id: "offer-1",
  entryId: "entry-1",
  presentationTag: "Ejecutivo",
  basePrice: 120,
  status: "INACTIVE" as const,
  image: null,
  composition: { slots: [] },
};

const validRecipeDetail = {
  id: "recipe-1",
  name: "Hamburguesa",
  description: "Clásica",
  instructions: "Cocinar carne",
  supplies: [],
};

test("rejects an incomplete entry list before the UI consumes it", async () => {
  const adapter: AxiosAdapter = async (config) => ({
    config,
    data: {
      data: [{ id: "entry-1", brandName: "Bowl" }],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    },
    headers: {},
    status: 200,
    statusText: "OK",
  });
  const api = createMenuApi(axios.create({ adapter }));
  await expect(api.listEntries({ page: 1, pageSize: 12 })).rejects.toThrow(
    "Respuesta de entradas inválida",
  );
});

test("rejects an invalid entry status before a mutation", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config.method ?? "");
    return {
      config,
      data: { data: { ...validEntryDetail, status: "UNKNOWN" } },
      headers: { etag: '"rev-2"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await expect(api.setEntryStatus("entry-1", "ARCHIVED")).rejects.toThrow(
    "Respuesta de entrada inválida",
  );
  expect(requests).toEqual(["get"]);
});

test("rejects a weak entry ETag before sending If-Match", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config.method ?? "");
    return {
      config,
      data: { data: validEntryDetail },
      headers: { etag: 'W/"rev-2"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await expect(api.setEntryStatus("entry-1", "ARCHIVED")).rejects.toThrow(
    "versión fuerte",
  );
  expect(requests).toEqual(["get"]);
});

test("lists only offers of the selected entry with server pagination", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(axios.getUri(config));
    return {
      config,
      data: { data: [], meta: { page: 2, pageSize: 12, total: 13, totalPages: 2 } },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  const page = await api.listOffers("entry-1", 2, 12);
  expect(page.meta.total).toBe(13);
  expect(requests).toEqual([
    "/api/v1/menu/offers?entryId=entry-1&page=2&pageSize=12",
  ]);
});

test("bounds entry, offer list, and offer mutation requests with distinct read (12s) and write (20s) timeouts", async () => {
  const timeouts: number[] = [];
  const adapter: AxiosAdapter = async (config) => {
    timeouts.push(config.timeout ?? 0);
    const isOfferDetail = config.url?.includes("/menu/offers/");
    const data =
      config.url === "/menu/offers"
        ? { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } }
        : isOfferDetail
          ? { data: validOfferDetail }
          : { data: validEntryDetail };
    return {
      config,
      data: config.method === "delete" ? undefined : data,
      headers: isOfferDetail ? { etag: '"offer-rev-1"' } : {},
      status: config.method === "delete" ? 204 : 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  await api.getEntry("entry-1");
  await api.getOffer("offer-1");
  await api.listOffers("entry-1", 1, 12);
  await api.setOfferStatus(
    "offer-1",
    { presentationTag: "Combo", status: "ACTIVE" },
    '"offer-rev-1"',
    "11111111-1111-4111-8111-111111111111",
  );
  await api.deleteInactiveOffer("offer-1");

  expect(timeouts).toEqual([12000, 12000, 12000, 20000, 12000, 20000]);
});

test("updates offer status directly using opening strong ETag and Idempotency-Key without pre-GET", async () => {
  const requests: {
    method?: string;
    url?: string;
    body?: unknown;
    ifMatch?: string;
    idempotencyKey?: string;
  }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      body: typeof config.data === "string" ? JSON.parse(config.data) : undefined,
      ifMatch: config.headers?.get("If-Match")?.toString(),
      idempotencyKey: config.headers?.get("Idempotency-Key")?.toString(),
    });
    return {
      config,
      data: {
        data: {
          ...validOfferDetail,
          status: "ACTIVE",
        },
      },
      headers: { etag: '"offer-rev-2"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  await api.setOfferStatus(
    "offer-1",
    { presentationTag: "Combo", status: "ACTIVE" },
    '"offer-rev-1"',
    "11111111-1111-4111-8111-111111111111",
  );
  expect(requests).toEqual([
    {
      method: "patch",
      url: "/menu/offers/offer-1",
      body: { presentationTag: "Combo", status: "ACTIVE" },
      ifMatch: '"offer-rev-1"',
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
    },
  ]);
});

test("rejects a weak or missing ETag before mutating an offer without HTTP requests", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config.method ?? "");
    return {
      config,
      data: { data: validOfferDetail },
      headers: { etag: 'W/"offer-rev-2"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await expect(
    api.setOfferStatus(
      "offer-1",
      { presentationTag: "Combo", status: "ACTIVE" },
      'W/"offer-rev-2"',
      "11111111-1111-4111-8111-111111111111",
    ),
  ).rejects.toThrow("versión fuerte");
  expect(requests).toEqual([]);
});

test("deletes only an inactive offer using its current ETag", async () => {
  const requests: { method?: string; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      ifMatch: config.headers?.get("If-Match")?.toString(),
    });
    return {
      config,
      data: { data: validOfferDetail },
      headers: { etag: '"offer-rev-4"' },
      status: config.method === "delete" ? 204 : 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await api.deleteInactiveOffer("offer-1");
  expect(requests).toEqual([
    { method: "get", ifMatch: undefined },
    { method: "delete", ifMatch: '"offer-rev-4"' },
  ]);
});

test("does not send DELETE for an active offer", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config.method ?? "");
    return {
      config,
      data: { data: { ...validOfferDetail, status: "ACTIVE" } },
      headers: { etag: '"offer-rev-1"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await expect(api.deleteInactiveOffer("offer-1")).rejects.toThrow("inactiva");
  expect(requests).toEqual(["get"]);
});

const entry = {
  id: "entry-1",
  brandName: "Hamburguesa Hawaiana",
  description: "Carne, queso y piña",
  status: "ACTIVE" as const,
  image: {
    id: "image-1",
    url: "https://images.example/1",
    thumbnailUrl: "https://images.example/thumb-1",
  },
  categories: [{ id: "category-1", name: "Hamburguesas" }],
  offerCount: 2,
};

test("lists administrative entries using only the contract filters and server pagination", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(axios.getUri(config));
    return {
      config,
      data: {
        data: [entry],
        meta: { page: 2, pageSize: 6, total: 7, totalPages: 2 },
      },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  const result = await api.listEntries({
    q: "piña",
    categoryId: "category-1",
    status: "ACTIVE",
    page: 2,
    pageSize: 6,
  });

  expect(result.data).toEqual([entry]);
  expect(result.meta.total).toBe(7);
  expect(requests).toEqual([
    "/api/v1/menu/entries?q=pi%C3%B1a&categoryId=category-1&status=ACTIVE&page=2&pageSize=6",
  ]);
});

test("omits empty entry filters and forwards the request cancellation signal", async () => {
  const controller = new AbortController();
  const requests: { url?: string; signal?: unknown }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ url: axios.getUri(config), signal: config.signal });
    return {
      config,
      data: {
        data: [],
        meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
      },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await api.listEntries({ page: 1, pageSize: 12 }, controller.signal);

  expect(requests).toEqual([
    {
      url: "/api/v1/menu/entries?page=1&pageSize=12",
      signal: controller.signal,
    },
  ]);
});

test("loads every category page for the filter without inventing a new endpoint", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    const uri = axios.getUri(config);
    requests.push(uri);
    const page = uri.includes("page=2") ? 2 : 1;
    const data = Array.from({ length: page === 1 ? 100 : 1 }, (_, index) => ({
      id: `category-${page}-${index + 1}`,
      name: `Categoría ${page}-${index + 1}`,
      description: "",
      entryCount: 1,
    }));
    return {
      config,
      data: {
        data,
        meta: { page, pageSize: 100, total: 101, totalPages: 2 },
      },
      headers: page === 1 ? { etag: '"category-rev-1"' } : {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  const categories = await api.listCategories();

  expect(categories).toHaveLength(101);
  expect(categories[0].name).toBe("Categoría 1-1");
  expect(categories[100].name).toBe("Categoría 2-1");
  expect(categories[0]).not.toHaveProperty("etag");
  expect(requests).toEqual([
    "/api/v1/menu/categories?page=1&pageSize=100",
    "/api/v1/menu/categories?page=2&pageSize=100",
  ]);
});

test("collectCategoryPages loads 25 pages iteratively in batches of at most 4 while preserving order", async () => {
  let active = 0;
  let maxActive = 0;
  const requestedPages: number[] = [];

  const items = await collectCategoryPages(
    async (page) => {
      requestedPages.push(page);
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return {
        data: [{ id: `cat-${page}`, name: `Categoría ${page}` }],
        meta: { page, pageSize: 1, total: 25, totalPages: 25 },
      };
    },
    2,
    25,
  );

  expect(maxActive).toBeLessThanOrEqual(4);
  expect(requestedPages).toEqual(
    Array.from({ length: 24 }, (_, idx) => idx + 2),
  );
  expect(items.map((item) => item.id)).toEqual(
    Array.from({ length: 24 }, (_, idx) => `cat-${idx + 2}`),
  );
});

test("creates a category with an explicit Idempotency-Key header", async () => {
  const draft = { name: "Bebidas", description: "Bebidas frías" };
  const created = { id: "category-2", ...draft, entryCount: 0 };
  const idempotencyKey = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
  const requests: {
    method?: string;
    url?: string;
    body?: unknown;
    idempotencyKey?: string;
  }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      body: typeof config.data === "string" ? JSON.parse(config.data) : undefined,
      idempotencyKey: config.headers?.get("Idempotency-Key")?.toString(),
    });
    return {
      config,
      data: { data: created },
      headers: {},
      status: 201,
      statusText: "Created",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.createCategory(draft, idempotencyKey)).resolves.toEqual(created);
  expect(requests).toEqual([
    {
      method: "post",
      url: "/menu/categories",
      body: draft,
      idempotencyKey,
    },
  ]);
});

test("gets a category with its HTTP ETag and sanitizes JSON body", async () => {
  const categoryData = { id: "category-1", name: "Bebidas", description: "Frías", entryCount: 2 };
  const adapter: AxiosAdapter = async (config) => ({
    config,
    data: { data: { ...categoryData, etag: '"json-etag-to-ignore"' } },
    headers: { etag: '"strong-header-etag"' },
    status: 200,
    statusText: "OK",
  });
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  const result = await api.getCategory("category-1");
  expect(result).toEqual({
    data: categoryData,
    etag: '"strong-header-etag"',
  });
  expect((result.data as unknown as Record<string, unknown>).etag).toBeUndefined();
});

test("updates an encoded category ID using the opening ETag directly without pre-GET", async () => {
  const draft = { name: "Bebidas", description: "Bebidas frías" };
  const updated = { id: "category /2", ...draft, entryCount: 1 };
  const requests: {
    method?: string;
    url?: string;
    body?: unknown;
    ifMatch?: string;
  }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      body: typeof config.data === "string" ? JSON.parse(config.data) : undefined,
      ifMatch: config.headers.get("If-Match")?.toString(),
    });
    return {
      config,
      data: { data: updated },
      headers: { etag: '"rev-3"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(
    api.updateCategory("category /2", draft, '"rev-opening"'),
  ).resolves.toEqual(updated);
  expect(requests).toEqual([
    {
      method: "patch",
      url: "/menu/categories/category%20%2F2",
      body: draft,
      ifMatch: '"rev-opening"',
    },
  ]);
});

test("does not update a category when its opening ETag is invalid or weak (0 HTTP calls)", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config.method ?? "");
    return {
      config,
      data: { data: { id: "category-1", name: "Bebidas", entryCount: 0 } },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  await expect(
    api.updateCategory("category-1", { name: "Bebidas", description: "" }, 'W/"weak"'),
  ).rejects.toThrow("No se recibió la versión de la categoría");
  expect(requests).toEqual([]);
});

test("reads a strong ETag before archiving and sends only the new status", async () => {
  const requests: {
    method?: string;
    url?: string;
    body?: unknown;
    ifMatch?: string;
  }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      body: typeof config.data === "string" ? JSON.parse(config.data) : undefined,
      ifMatch: config.headers.get("If-Match")?.toString(),
    });
    return {
      config,
      data: {
        data: {
          ...validEntryDetail,
          status: config.method === "get" ? "ACTIVE" : "ARCHIVED",
        },
      },
      headers: { etag: '"rev-3"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await api.setEntryStatus("entry-1", "ARCHIVED");

  expect(requests).toEqual([
    {
      method: "get",
      url: "/menu/entries/entry-1",
      body: undefined,
      ifMatch: undefined,
    },
    {
      method: "patch",
      url: "/menu/entries/entry-1",
      body: { status: "ARCHIVED" },
      ifMatch: '"rev-3"',
    },
  ]);
});

test("requests server activation when transition to ACTIVE is requested", async () => {
  const requests: { method?: string; url?: string; data?: unknown; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      data: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
      ifMatch: config.headers?.get?.("If-Match")?.toString(),
    });
    const isPatch = config.method === "patch";
    return {
      config,
      data: { data: { ...validEntryDetail, status: isPatch ? "ACTIVE" : "INACTIVE" } },
      headers: { etag: '"rev-3"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await api.setEntryStatus("entry-1", "ACTIVE");
  expect(requests).toEqual([
    { method: "get", url: "/menu/entries/entry-1", data: undefined, ifMatch: undefined },
    { method: "patch", url: "/menu/entries/entry-1", data: { status: "ACTIVE" }, ifMatch: '"rev-3"' },
  ]);
});

test("does not send a status mutation when the entry already has that status", async () => {
  const methods: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    methods.push(config.method ?? "");
    return {
      config,
      data: { data: validEntryDetail },
      headers: { etag: '"rev-3"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await api.setEntryStatus("entry-1", "INACTIVE");

  expect(methods).toEqual(["get"]);
});

test("never deletes a non-archived entry even if the server DELETE would accept it", async () => {
  const methods: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    methods.push(config.method ?? "");
    return {
      config,
      data: { data: validEntryDetail },
      headers: { etag: '"rev-3"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.deleteArchivedEntry("entry-1")).rejects.toThrow(
    "Solo se puede eliminar una entrada archivada",
  );
  expect(methods).toEqual(["get"]);
});

test("deletes an archived entry conditionally with its current ETag", async () => {
  const requests: { method?: string; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      ifMatch: config.headers.get("If-Match")?.toString(),
    });
    return {
      config,
      data: { data: { ...validEntryDetail, status: "ARCHIVED" } },
      headers: { etag: '"rev-4"' },
      status: config.method === "delete" ? 204 : 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await api.deleteArchivedEntry("entry-1");

  expect(requests).toEqual([
    { method: "get", ifMatch: undefined },
    { method: "delete", ifMatch: '"rev-4"' },
  ]);
});

test("rejects a mutation without the resource ETag required for If-Match", async () => {
  const adapter: AxiosAdapter = async (config) => ({
    config,
    data: { data: { ...validEntryDetail, status: "ACTIVE" } },
    headers: {},
    status: 200,
    statusText: "OK",
  });
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.setEntryStatus("entry-1", "ARCHIVED")).rejects.toThrow(
    "No se recibió una versión fuerte de la entrada",
  );
});

test.each([401, 403])(
  "propagates HTTP %i errors from the transport",
  async (status) => {
    const error = Object.assign(new Error(`HTTP ${status}`), {
      response: { status },
    });
    const adapter: AxiosAdapter = async () => {
      throw error;
    };
    const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

    await expect(api.listEntries({ page: 1, pageSize: 12 })).rejects.toBe(
      error,
    );
  },
);

test("propagates a 412 conflict when an entry changed after its ETag was read", async () => {
  const conflict = Object.assign(new Error("Precondition Failed"), {
    response: { status: 412 },
  });
  const adapter: AxiosAdapter = async (config) => {
    if (config.method === "get") {
      return {
        config,
        data: { data: { ...validEntryDetail, status: "ACTIVE" } },
        headers: { etag: '"rev-8"' },
        status: 200,
        statusText: "OK",
      };
    }
    throw conflict;
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.setEntryStatus("entry-1", "ARCHIVED")).rejects.toBe(
    conflict,
  );
});

test("propagates network failures without translating them", async () => {
  const networkError = new Error("Network unavailable");
  const adapter: AxiosAdapter = async () => {
    throw networkError;
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.listEntries({ page: 1, pageSize: 12 })).rejects.toBe(
    networkError,
  );
});

test("forwards cancellation when loading category pages", async () => {
  const controller = new AbortController();
  const signals: unknown[] = [];
  const adapter: AxiosAdapter = async (config) => {
    signals.push(config.signal);
    return {
      config,
      data: {
        data: [],
        meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.listCategories(controller.signal)).resolves.toEqual([]);
  expect(signals).toEqual([controller.signal]);
});

test("gets an entry from the administrative menu route and maps its details", async () => {
  const requests: { url?: string; method?: string }[] = [];
  const detail = {
    id: "entry-1",
    brandName: "Bowl de pollo",
    description: "Pollo con arroz.",
    imageRef: "img-1",
    status: "INACTIVE" as const,
    categoryIds: ["category-1"],
  };
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ url: config.url, method: config.method });
    return {
      config,
      data: { data: detail },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.getEntry("entry /1")).resolves.toEqual(detail);
  expect(requests).toEqual([
    { method: "get", url: "/menu/entries/entry%20%2F1" },
  ]);
});

test("lists recipes with query parameters and server pagination", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(axios.getUri(config));
    return {
      config,
      data: {
        data: [
          {
            id: "recipe-1",
            name: "Hamburguesa",
            description: "Clásica",
            supplies: [],
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  const result = await api.listRecipes({ q: "Hamb", page: 1, pageSize: 20 });

  expect(result.data).toHaveLength(1);
  expect(result.data[0].name).toBe("Hamburguesa");
  expect(requests).toEqual(["/api/v1/menu/recipes?q=Hamb&page=1&pageSize=20"]);
});

test("gets a recipe by id with its HTTP ETag", async () => {
  const recipeDetail = {
    id: "recipe-1",
    name: "Hamburguesa",
    description: "Clásica",
    instructions: "Cocinar carne",
    supplies: [
      {
        inventoryItemId: "item-1",
        quantity: 150,
        inventoryItem: { id: "item-1", name: "Carne", unit: "g" },
      },
    ],
  };
  const adapter: AxiosAdapter = async (config) => ({
    config,
    data: { data: recipeDetail },
    headers: { etag: '"rec-1"' },
    status: 200,
    statusText: "OK",
  });
  const api = createMenuApi(axios.create({ adapter }));
  const result = await api.getRecipe("recipe-1");

  expect(result).toEqual({
    data: recipeDetail,
    etag: '"rec-1"',
  });
});

test("creates a recipe with JSON body and Idempotency-Key", async () => {
  const requests: { method?: string; url?: string; data?: unknown; idempotencyKey?: string }[] = [];
  const draft = {
    name: "Salsa especial",
    description: "Casera",
    instructions: "Mezclar todo",
    supplies: [{ inventoryItemId: "item-2", quantity: 50 }],
  };
  const idempotencyKey = "22222222-2222-4222-8222-222222222222";
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      data: typeof config.data === "string" ? JSON.parse(config.data) : undefined,
      idempotencyKey: config.headers?.get("Idempotency-Key")?.toString(),
    });
    return {
      config,
      data: { data: { id: "recipe-new", ...draft, supplies: [] } },
      headers: { etag: '"rec-new"' },
      status: 201,
      statusText: "Created",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  const created = await api.createRecipe(draft, idempotencyKey);

  expect(created.id).toBe("recipe-new");
  expect(requests).toEqual([
    { method: "post", url: "/menu/recipes", data: draft, idempotencyKey },
  ]);
});

test("updates a recipe using opening ETag directly without pre-GET", async () => {
  const requests: {
    method?: string;
    url?: string;
    data?: unknown;
    ifMatch?: string;
  }[] = [];
  const draft = {
    name: "Salsa actualizada",
    description: "Casera v2",
    instructions: "Mezclar bien",
    supplies: [{ inventoryItemId: "item-2", quantity: 60 }],
  };
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      data: typeof config.data === "string" ? JSON.parse(config.data) : undefined,
      ifMatch: config.headers?.get("If-Match")?.toString(),
    });
    return {
      config,
      data: { data: { id: "recipe-1", ...draft, supplies: [] } },
      headers: { etag: '"rec-etag-2"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await api.updateRecipe("recipe-1", draft, '"rec-etag-1"');

  expect(requests).toEqual([
    {
      method: "patch",
      url: "/menu/recipes/recipe-1",
      data: draft,
      ifMatch: '"rec-etag-1"',
    },
  ]);
});

test("handles concurrent recipe modification with 412 Precondition Failed, preserving draft and requiring explicit review (A09 recipe)", async () => {
  const serverVersion = "v2";
  const requests: { method?: string; url?: string; ifMatch?: string }[] = [];
  const draft = {
    name: "Salsa con borrador preservado",
    description: "Casera v1 editada",
    instructions: "Mezclar todo cuidadosamente",
    supplies: [{ inventoryItemId: "item-2", quantity: 75 }],
  };
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      ifMatch: config.headers?.get("If-Match")?.toString(),
    });

    if (config.method === "get") {
      return {
        config,
        data: {
          data: {
            id: "recipe-1",
            name: "Salsa en servidor",
            description: "Modificada por otro usuario",
            instructions: "Paso del servidor",
            supplies: [],
          },
        },
        headers: { etag: `"${serverVersion}"` },
        status: 200,
        statusText: "OK",
      };
    }

    if (config.method === "patch") {
      const ifMatch = config.headers?.get("If-Match")?.toString();
      if (ifMatch !== `"${serverVersion}"`) {
        const error = new Error("Precondition Failed") as Error & { response?: unknown };
        error.response = {
          status: 412,
          data: { error: { code: "PRECONDITION_FAILED", message: "Versión desactualizada" } },
        };
        throw error;
      }
      return {
        config,
        data: { data: { id: "recipe-1", ...draft } },
        headers: { etag: '"v3"' },
        status: 200,
        statusText: "OK",
      };
    }

    throw new Error(`Unexpected request: ${config.method}`);
  };

  const api = createMenuApi(axios.create({ adapter }));

  // 1. First attempt with opening etag "v1" produces 412
  await expect(api.updateRecipe("recipe-1", draft, '"v1"')).rejects.toMatchObject({
    response: { status: 412 },
  });

  // 2. Draft is preserved and user explicitly reviews server version
  const serverResource = await api.getRecipe("recipe-1");
  expect(serverResource.etag).toBe('"v2"');
  expect(serverResource.data.name).toBe("Salsa en servidor");

  // 3. User retries with reviewed etag "v2" and the preserved draft
  const updated = await api.updateRecipe("recipe-1", draft, serverResource.etag!);
  expect(updated.name).toBe("Salsa con borrador preservado");

  // Verify full sequence of HTTP calls: PATCH(v1) -> GET -> PATCH(v2), with no silent auto-PATCH
  expect(requests).toEqual([
    { method: "patch", url: "/menu/recipes/recipe-1", ifMatch: '"v1"' },
    { method: "get", url: "/menu/recipes/recipe-1", ifMatch: undefined },
    { method: "patch", url: "/menu/recipes/recipe-1", ifMatch: '"v2"' },
  ]);
});

test("handles concurrent category modification with 412 Precondition Failed, preserving draft and requiring explicit review (A09 category)", async () => {
  const serverVersion = "v2";
  const requests: { method?: string; url?: string; ifMatch?: string }[] = [];
  const draft = {
    name: "Categoría borrador preservado",
    description: "Editada localmente",
  };
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      ifMatch: config.headers?.get("If-Match")?.toString(),
    });

    if (config.method === "get") {
      return {
        config,
        data: {
          data: {
            id: "cat-1",
            name: "Categoría en servidor",
            description: "Modificada por otro usuario",
            entryCount: 5,
          },
        },
        headers: { etag: `"${serverVersion}"` },
        status: 200,
        statusText: "OK",
      };
    }

    if (config.method === "patch") {
      const ifMatch = config.headers?.get("If-Match")?.toString();
      if (ifMatch !== `"${serverVersion}"`) {
        const error = new Error("Precondition Failed") as Error & { response?: unknown };
        error.response = {
          status: 412,
          data: { error: { code: "PRECONDITION_FAILED", message: "Versión desactualizada" } },
        };
        throw error;
      }
      return {
        config,
        data: { data: { id: "cat-1", ...draft, entryCount: 5 } },
        headers: { etag: '"v3"' },
        status: 200,
        statusText: "OK",
      };
    }

    throw new Error(`Unexpected request: ${config.method}`);
  };

  const api = createMenuApi(axios.create({ adapter }));

  // 1. PATCH with "v1" produces 412
  await expect(api.updateCategory("cat-1", draft, '"v1"')).rejects.toMatchObject({
    response: { status: 412 },
  });

  // 2. Draft is preserved and user explicitly reviews server version
  const serverResource = await api.getCategory("cat-1");
  expect(serverResource.etag).toBe('"v2"');
  expect(serverResource.data.name).toBe("Categoría en servidor");

  // 3. User retries with reviewed etag "v2" and preserved draft
  const updated = await api.updateCategory("cat-1", draft, serverResource.etag!);
  expect(updated.name).toBe("Categoría borrador preservado");

  expect(requests).toEqual([
    { method: "patch", url: "/menu/categories/cat-1", ifMatch: '"v1"' },
    { method: "get", url: "/menu/categories/cat-1", ifMatch: undefined },
    { method: "patch", url: "/menu/categories/cat-1", ifMatch: '"v2"' },
  ]);
});

test("deletes a recipe using If-Match from current recipe ETag", async () => {
  const requests: { method?: string; url?: string; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      ifMatch: config.headers?.get("If-Match")?.toString(),
    });
    return {
      config,
      data: { data: validRecipeDetail },
      headers: { etag: '"rec-etag-2"' },
      status: config.method === "delete" ? 204 : 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await api.deleteRecipe("recipe-1");

  expect(requests).toEqual([
    { method: "get", url: "/menu/recipes/recipe-1", ifMatch: undefined },
    { method: "delete", url: "/menu/recipes/recipe-1", ifMatch: '"rec-etag-2"' },
  ]);
});

test("lists inventory items with search and pagination", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(axios.getUri(config));
    return {
      config,
      data: {
        data: [{ id: "item-1", name: "Carne Molida", unit: "g" }],
        meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
      },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  const result = await api.listInventoryItems({
    q: "carne",
    page: 1,
    pageSize: 50,
  });

  expect(result.data).toHaveLength(1);
  expect(result.data[0].unit).toBe("g");
  expect(requests).toEqual([
    "/api/v1/inventory/items?q=carne&page=1&pageSize=50",
  ]);
});

test("rejects invalid recipe identifiers, stops category batches when aborted, and fetches offer with strong ETag", async () => {
  const methods: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    methods.push(config.method ?? "");
    if (config.url?.includes("/inventory/items")) {
      return {
        config,
        data: {
          data: [{ id: "item-1", name: "Carne", unit: "g" }],
          meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
        },
        headers: {},
        status: 200,
        statusText: "OK",
      };
    }
    return {
      config,
      data: { data: validOfferDetail },
      headers: { etag: '"offer-rev-1"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.getRecipe("invalid id!")).rejects.toThrow(
    "Identificador inválido.",
  );

  const offerVersioned = await api.getOffer("offer-1");
  expect(offerVersioned.etag).toBe('"offer-rev-1"');
  expect(offerVersioned.data.id).toBe("offer-1");
  expect(methods).toEqual(["get"]);

  const defaultInventory = await api.listInventoryItems();
  expect(defaultInventory.data).toHaveLength(1);

  const abortController = new AbortController();
  abortController.abort();
  const abortedCategories = await collectCategoryPages(
    async () => ({
      data: [],
      meta: { page: 2, pageSize: 100, total: 200, totalPages: 2 },
    }),
    2,
    5,
    abortController.signal,
  );
  expect(abortedCategories).toEqual([]);
});
