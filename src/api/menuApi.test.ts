import axios, { type AxiosAdapter } from "axios";
import { createMenuApi } from "./menuApi";

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

  await expect(api.setEntryStatus("entry-1", "ARCHIVED")).rejects.toThrow("No se recibió la versión de la entrada");
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
