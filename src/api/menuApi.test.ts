import axios, { type AxiosAdapter } from "axios";
import { createMenuApi } from "./menuApi";

test("rejects an incomplete entry list before the UI consumes it", async () => {
  const adapter: AxiosAdapter = async (config) => ({
    config, data: { data: [{ id: "entry-1", brandName: "Bowl" }], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } },
    headers: {}, status: 200, statusText: "OK",
  });
  const api = createMenuApi(axios.create({ adapter }));
  await expect(api.listEntries({ page: 1, pageSize: 12 })).rejects.toThrow("Respuesta de entradas inválida");
});

test("rejects an invalid entry status before a mutation", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config.method ?? "");
    return { config, data: { data: { status: "UNKNOWN" } }, headers: { etag: '"rev-2"' }, status: 200, statusText: "OK" };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await expect(api.setEntryStatus("entry-1", "ARCHIVED")).rejects.toThrow("Respuesta de entrada inválida");
  expect(requests).toEqual(["get"]);
});

test("rejects a weak entry ETag before sending If-Match", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config.method ?? "");
    return { config, data: { data: { status: "INACTIVE" } }, headers: { etag: 'W/"rev-2"' }, status: 200, statusText: "OK" };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await expect(api.setEntryStatus("entry-1", "ARCHIVED")).rejects.toThrow("versión fuerte");
  expect(requests).toEqual(["get"]);
});

test("lists only offers of the selected entry with server pagination", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(axios.getUri(config));
    return { config, data: { data: [], meta: { page: 2, pageSize: 12, total: 13, totalPages: 2 } }, headers: {}, status: 200, statusText: "OK" };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  const page = await api.listOffers("entry-1", 2, 12);
  expect(page.meta.total).toBe(13);
  expect(requests).toEqual(["/api/v1/menu/offers?entryId=entry-1&page=2&pageSize=12"]);
});

test("reads a strong offer ETag before changing only its status", async () => {
  const requests: { method?: string; url?: string; body?: unknown; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ method: config.method, url: config.url, body: config.data ? JSON.parse(config.data as string) : undefined, ifMatch: config.headers?.get("If-Match") as string | undefined });
    return { config, data: { data: { status: "INACTIVE" } }, headers: { etag: '"offer-rev-2"' }, status: 200, statusText: "OK" };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  await api.setOfferStatus("offer-1", "ACTIVE");
  expect(requests).toEqual([
    { method: "get", url: "/menu/offers/offer-1", body: undefined, ifMatch: undefined },
    { method: "patch", url: "/menu/offers/offer-1", body: { status: "ACTIVE" }, ifMatch: '"offer-rev-2"' },
  ]);
});

test("rejects a weak or missing ETag before mutating an offer", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config.method ?? "");
    return { config, data: { data: { status: "INACTIVE" } }, headers: { etag: 'W/"offer-rev-2"' }, status: 200, statusText: "OK" };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await expect(api.setOfferStatus("offer-1", "ACTIVE")).rejects.toThrow("versión fuerte");
  expect(requests).toEqual(["get"]);
});

test("deletes only an inactive offer using its current ETag", async () => {
  const requests: { method?: string; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ method: config.method, ifMatch: config.headers?.get("If-Match") as string | undefined });
    return { config, data: { data: { status: "INACTIVE" } }, headers: { etag: '"offer-rev-4"' }, status: config.method === "delete" ? 204 : 200, statusText: "OK" };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await api.deleteInactiveOffer("offer-1");
  expect(requests).toEqual([{ method: "get", ifMatch: undefined }, { method: "delete", ifMatch: '"offer-rev-4"' }]);
});

test("does not send DELETE for an active offer", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config.method ?? "");
    return { config, data: { data: { status: "ACTIVE" } }, headers: { etag: '"offer-rev-1"' }, status: 200, statusText: "OK" };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await expect(api.deleteInactiveOffer("offer-1")).rejects.toThrow("inactiva");
  expect(requests).toEqual(["get"]);
});

const entry = {
  id: "entry-1",
  brandName: "Hamburguesa Hawaiana",
  description: "Carne, queso y piña",
  status: "ACTIVE",
  image: { id: "image-1", url: "https://images.example/1", thumbnailUrl: "https://images.example/thumb-1" },
  categories: [{ id: "category-1", name: "Hamburguesas" }],
  offerCount: 2,
};

test("lists administrative entries using only the contract filters and server pagination", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(axios.getUri(config));
    return {
      config,
      data: { data: [entry], meta: { page: 2, pageSize: 6, total: 7, totalPages: 2 } },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  const result = await api.listEntries({ q: "piña", categoryId: "category-1", status: "ACTIVE", page: 2, pageSize: 6 });

  expect(result.data).toEqual([entry]);
  expect(result.meta.total).toBe(7);
  expect(requests).toEqual([
    "/api/v1/menu/entries?q=pi%C3%B1a&categoryId=category-1&status=ACTIVE&page=2&pageSize=6",
  ]);
});

test("omits empty entry filters and forwards the request cancellation signal", async () => {
  const controller = new AbortController();
  const requests: { url?: string; signal?: AbortSignal }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ url: axios.getUri(config), signal: config.signal as AbortSignal | undefined });
    return {
      config,
      data: { data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await api.listEntries({ page: 1, pageSize: 12 }, controller.signal);

  expect(requests).toEqual([{ url: "/api/v1/menu/entries?page=1&pageSize=12", signal: controller.signal }]);
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

test("creates a category with the supplied draft", async () => {
  const draft = { name: "Bebidas", description: "Bebidas frías" };
  const created = { id: "category-2", ...draft, entryCount: 0 };
  const requests: { method?: string; url?: string; body?: unknown }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ method: config.method, url: config.url, body: JSON.parse(config.data as string) });
    return {
      config,
      data: { data: created },
      headers: {},
      status: 201,
      statusText: "Created",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.createCategory(draft)).resolves.toEqual(created);
  expect(requests).toEqual([{ method: "post", url: "/menu/categories", body: draft }]);
});

test("updates an encoded category ID with its current ETag", async () => {
  const draft = { name: "Bebidas", description: "Bebidas frías" };
  const updated = { id: "category /2", ...draft, entryCount: 1 };
  const requests: { method?: string; url?: string; body?: unknown; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      body: config.data ? JSON.parse(config.data as string) : undefined,
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

  await expect(api.updateCategory("category /2", draft)).resolves.toEqual(updated);
  expect(requests).toEqual([
    { method: "get", url: "/menu/categories/category%20%2F2", body: undefined, ifMatch: undefined },
    { method: "patch", url: "/menu/categories/category%20%2F2", body: draft, ifMatch: '"rev-3"' },
  ]);
});

test("does not update a category when its ETag is unavailable", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config.method ?? "");
    return { config, data: { data: { id: "category-1", name: "Bebidas", entryCount: 0 } }, headers: {}, status: 200, statusText: "OK" };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  await expect(api.updateCategory("category-1", { name: "Bebidas", description: "" })).rejects.toThrow("No se recibió la versión");
  expect(requests).toEqual(["get"]);
});
test("reads a strong ETag before archiving and sends only the new status", async () => {
  const requests: { method?: string; url?: string; body?: unknown; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      body: config.data ? JSON.parse(config.data) : undefined,
      ifMatch: config.headers.get("If-Match")?.toString(),
    });
    return {
      config,
      data: { data: { id: "entry-1", status: config.method === "get" ? "ACTIVE" : "ARCHIVED" } },
      headers: { etag: '"rev-3"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await api.setEntryStatus("entry-1", "ARCHIVED");

  expect(requests).toEqual([
    { method: "get", url: "/menu/entries/entry-1", body: undefined, ifMatch: undefined },
    { method: "patch", url: "/menu/entries/entry-1", body: { status: "ARCHIVED" }, ifMatch: '"rev-3"' },
  ]);
});

test("does not request the server when activation is unavailable", async () => {
  const methods: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    methods.push(config.method ?? "");
    return {
      config,
      data: { data: { id: "entry-1", status: "INACTIVE" } },
      headers: { etag: '"rev-3"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.setEntryStatus("entry-1", "ACTIVE"))
    .rejects.toThrow("La activación estará disponible cuando el servidor valide las ofertas activas");
  expect(methods).toEqual([]);
});

test("does not send a status mutation when the entry already has that status", async () => {
  const methods: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    methods.push(config.method ?? "");
    return {
      config,
      data: { data: { id: "entry-1", status: "INACTIVE" } },
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
      data: { data: { id: "entry-1", status: "INACTIVE" } },
      headers: { etag: '"rev-3"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.deleteArchivedEntry("entry-1")).rejects.toThrow("Solo se puede eliminar una entrada archivada");
  expect(methods).toEqual(["get"]);
});

test("deletes an archived entry conditionally with its current ETag", async () => {
  const requests: { method?: string; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ method: config.method, ifMatch: config.headers.get("If-Match")?.toString() });
    return {
      config,
      data: { data: { id: "entry-1", status: "ARCHIVED" } },
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
    data: { data: { id: "entry-1", status: "ACTIVE" } },
    headers: {},
    status: 200,
    statusText: "OK",
  });
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.setEntryStatus("entry-1", "ARCHIVED")).rejects.toThrow("No se recibió una versión fuerte de la entrada");
});

test.each([401, 403])("propagates HTTP %i errors from the transport", async (status) => {
  const error = Object.assign(new Error(`HTTP ${status}`), { response: { status } });
  const adapter: AxiosAdapter = async () => { throw error; };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.listEntries({ page: 1, pageSize: 12 })).rejects.toBe(error);
});

test("propagates a 412 conflict when an entry changed after its ETag was read", async () => {
  const conflict = Object.assign(new Error("Precondition Failed"), { response: { status: 412 } });
  const adapter: AxiosAdapter = async (config) => {
    if (config.method === "get") {
      return {
        config,
        data: { data: { id: "entry-1", status: "ACTIVE" } },
        headers: { etag: '"rev-8"' },
        status: 200,
        statusText: "OK",
      };
    }
    throw conflict;
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.setEntryStatus("entry-1", "ARCHIVED")).rejects.toBe(conflict);
});

test("propagates network failures without translating them", async () => {
  const networkError = new Error("Network unavailable");
  const adapter: AxiosAdapter = async () => { throw networkError; };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.listEntries({ page: 1, pageSize: 12 })).rejects.toBe(networkError);
});

test("forwards cancellation when loading category pages", async () => {
  const controller = new AbortController();
  const signals: unknown[] = [];
  const adapter: AxiosAdapter = async (config) => {
    signals.push(config.signal);
    return {
      config,
      data: { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } },
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
    status: "INACTIVE",
    categoryIds: ["category-1"],
  };
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ url: config.url, method: config.method });
    return { config, data: { data: detail }, headers: {}, status: 200, statusText: "OK" };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.getEntry("entry /1")).resolves.toEqual(detail);
  expect(requests).toEqual([{ method: "get", url: "/menu/entries/entry%20%2F1" }]);
});

test("lists recipes with query parameters and server pagination", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(axios.getUri(config));
    return {
      config,
      data: {
        data: [{ id: "recipe-1", name: "Hamburguesa", description: "Clásica", supplies: [] }],
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

test("gets recipe details by id", async () => {
  const recipeDetail = {
    id: "recipe-1",
    name: "Hamburguesa",
    description: "Clásica",
    instructions: "Cocinar carne",
    supplies: [{ inventoryItemId: "item-1", quantity: 150, inventoryItem: { id: "item-1", name: "Carne", unit: "g" } }],
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

  expect(result).toEqual(recipeDetail);
});

test("creates a recipe with JSON body", async () => {
  const requests: { method?: string; url?: string; data?: unknown }[] = [];
  const draft = {
    name: "Salsa especial",
    description: "Casera",
    instructions: "Mezclar todo",
    supplies: [{ inventoryItemId: "item-2", quantity: 50 }],
  };
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ method: config.method, url: config.url, data: JSON.parse(config.data as string) });
    return {
      config,
      data: { data: { id: "recipe-new", ...draft, supplies: [] } },
      headers: { etag: '"rec-new"' },
      status: 201,
      statusText: "Created",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  const created = await api.createRecipe(draft);

  expect(created.id).toBe("recipe-new");
  expect(requests).toEqual([{ method: "post", url: "/menu/recipes", data: draft }]);
});

test("updates a recipe using If-Match from current recipe ETag", async () => {
  const requests: { method?: string; url?: string; data?: unknown; ifMatch?: string }[] = [];
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
      data: config.data ? JSON.parse(config.data as string) : undefined,
      ifMatch: config.headers?.get("If-Match") as string | undefined,
    });
    return {
      config,
      data: { data: { id: "recipe-1", ...draft, supplies: [] } },
      headers: { etag: '"rec-etag-1"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  await api.updateRecipe("recipe-1", draft);

  expect(requests).toEqual([
    { method: "get", url: "/menu/recipes/recipe-1", data: undefined, ifMatch: undefined },
    { method: "patch", url: "/menu/recipes/recipe-1", data: draft, ifMatch: '"rec-etag-1"' },
  ]);
});

test("deletes a recipe using If-Match from current recipe ETag", async () => {
  const requests: { method?: string; url?: string; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      ifMatch: config.headers?.get("If-Match") as string | undefined,
    });
    return {
      config,
      data: { data: { id: "recipe-1" } },
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
  const result = await api.listInventoryItems({ q: "carne", page: 1, pageSize: 50 });

  expect(result.data).toHaveLength(1);
  expect(result.data[0].unit).toBe("g");
  expect(requests).toEqual(["/api/v1/inventory/items?q=carne&page=1&pageSize=50"]);
});

