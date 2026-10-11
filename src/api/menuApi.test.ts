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
    "/api/v1/menus/1/categories?page=1&pageSize=100",
    "/api/v1/menus/1/categories?page=2&pageSize=100",
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
  expect(requests).toEqual([{ method: "post", url: "/menus/1/categories", body: draft }]);
});

test("updates an encoded category ID using the documented menu path", async () => {
  const draft = { name: "Bebidas", description: "Bebidas frías" };
  const updated = { id: "category /2", ...draft, entryCount: 1 };
  const requests: { method?: string; url?: string; body?: unknown; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      body: JSON.parse(config.data as string),
      ifMatch: config.headers.get("If-Match")?.toString(),
    });
    return {
      config,
      data: { data: updated },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.updateCategory("category /2", draft)).resolves.toEqual(updated);
  expect(requests).toEqual([{
    method: "patch",
    url: "/menus/1/categories/category%20%2F2",
    body: draft,
    ifMatch: undefined,
  }]);
});

test("updates a category without requiring an ETag", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config.method ?? "");
    return { config, data: { data: { id: "category-1", name: "Bebidas", entryCount: 0 } }, headers: {}, status: 200, statusText: "OK" };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  await expect(api.updateCategory("category-1", { name: "Bebidas", description: "" })).resolves.toMatchObject({ id: "category-1" });
  expect(requests).toEqual(["patch"]);
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

test("reads category pages using the current OpenAPI items and pagination shape", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    const uri = axios.getUri(config);
    requests.push(uri);
    const page = uri.includes("page=2") ? 2 : 1;
    return {
      config,
      data: {
        items: [{ id: `category-${page}`, menuId: "menu-current", name: `Category ${page}`, description: "" }],
        pagination: { page, pageSize: 100, totalItems: 2, totalPages: 2 },
      },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }), "menu-current");

  await expect(api.listCategories()).resolves.toEqual([
    { id: "category-1", menuId: "menu-current", name: "Category 1", description: "" },
    { id: "category-2", menuId: "menu-current", name: "Category 2", description: "" },
  ]);
  expect(requests).toEqual([
    "/api/v1/menus/menu-current/categories?page=1&pageSize=100",
    "/api/v1/menus/menu-current/categories?page=2&pageSize=100",
  ]);
});

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

test("gets an entry from the selected menu and maps its administrative details", async () => {
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
    return { config, data: detail, headers: {}, status: 200, statusText: "OK" };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }), "menu-42");

  await expect(api.getEntry("entry /1")).resolves.toEqual(detail);
  expect(requests).toEqual([{ method: "get", url: "/menus/menu-42/entries/entry%20%2F1" }]);
});

test("creates an inactive entry using the documented entry and image multipart parts", async () => {
  let requestBody: unknown;
  const adapter: AxiosAdapter = async (config) => {
    requestBody = config.data;
    return {
      config,
      data: { id: "entry-new", brandName: "Bowl de pollo", description: "Pollo con arroz.", imageRef: "img-1", status: "INACTIVE", categoryIds: [] },
      headers: {},
      status: 201,
      statusText: "Created",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }), "menu-42");
  const image = new File(["image bytes"], "bowl.png", { type: "image/png" });

  await expect(api.createEntry({ brandName: "Bowl de pollo", description: "Pollo con arroz.", categoryIds: [] }, image))
    .resolves.toMatchObject({ id: "entry-new", status: "INACTIVE" });

  expect(requestBody).toBeInstanceOf(FormData);
  const multipart = requestBody as FormData;
  const entryPart = multipart.get("entry");
  expect(entryPart).toBeInstanceOf(Blob);
  expect((entryPart as Blob).type).toBe("application/json");
  expect(JSON.parse(await readBlob(entryPart as Blob))).toEqual({
    brandName: "Bowl de pollo", description: "Pollo con arroz.", categoryIds: [],
  });
  expect(multipart.get("image")).toBe(image);
});

test("edits entry metadata as JSON without sending or clearing the current image", async () => {
  let request: { url?: string; method?: string; data?: unknown } = {};
  const adapter: AxiosAdapter = async (config) => {
    request = { url: config.url, method: config.method, data: config.data ? JSON.parse(config.data as string) : undefined };
    return {
      config,
      data: { id: "entry-1", brandName: "Bowl especial", description: "Con vegetales.", imageRef: "img-current", status: "ACTIVE", categoryIds: ["category-1"] },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }), "menu-42");

  await api.updateEntry("entry-1", {
    brandName: "Bowl especial", description: "Con vegetales.", categoryIds: ["category-1"], status: "ACTIVE",
  });

  expect(request).toEqual({
    method: "patch",
    url: "/menus/menu-42/entries/entry-1",
    data: { brandName: "Bowl especial", description: "Con vegetales.", categoryIds: ["category-1"], status: "ACTIVE" },
  });
});

test("edits entry metadata and replaces its image in one multipart request", async () => {
  let request: { url?: string; method?: string; data?: unknown } = {};
  const adapter: AxiosAdapter = async (config) => {
    request = { url: config.url, method: config.method, data: config.data };
    return {
      config,
      data: { id: "entry-1", brandName: "Bowl especial", description: "Con vegetales.", imageRef: "img-new", status: "INACTIVE", categoryIds: [] },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }), "menu-42");
  const image = new File(["new image"], "new.png", { type: "image/png" });

  await api.updateEntry("entry-1", {
    brandName: "Bowl especial", description: "Con vegetales.", categoryIds: [], status: "INACTIVE",
  }, image);

  expect(request).toMatchObject({ method: "patch", url: "/menus/menu-42/entries/entry-1" });
  expect(request.data).toBeInstanceOf(FormData);
  const multipart = request.data as FormData;
  expect(JSON.parse(await readBlob(multipart.get("entry") as Blob))).toEqual({
    brandName: "Bowl especial", description: "Con vegetales.", categoryIds: [], status: "INACTIVE",
  });
  expect(multipart.get("image")).toBe(image);
});
