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

test("loads every category page for the filter without inventing a new endpoint", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    const uri = axios.getUri(config);
    requests.push(uri);
    const page = uri.includes("page=2") ? 2 : 1;
    return {
      config,
      data: {
        data: [{ id: `category-${page}`, name: `Categoría ${page}`, description: "", entryCount: 1 }],
        meta: { page, pageSize: 100, total: 2, totalPages: 2 },
      },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  const categories = await api.listCategories();

  expect(categories.map((category) => category.name)).toEqual(["Categoría 1", "Categoría 2"]);
  expect(requests).toEqual([
    "/api/v1/menu/categories?page=1&pageSize=100",
    "/api/v1/menu/categories?page=2&pageSize=100",
  ]);
});

test("reads the current ETag before archiving and sends only the new status", async () => {
  const requests: { method?: string; url?: string; status?: string; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      status: config.data ? JSON.parse(config.data).status : undefined,
      ifMatch: config.headers.get("If-Match")?.toString(),
    });
    return {
      config,
      data: { data: { id: "entry-1", status: config.method === "get" ? "ACTIVE" : "ARCHIVED" } },
      headers: { etag: 'W/"rev-3"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await api.setEntryStatus("entry-1", "ARCHIVED");

  expect(requests).toEqual([
    { method: "get", url: "/menu/entries/entry-1", status: undefined, ifMatch: undefined },
    { method: "patch", url: "/menu/entries/entry-1", status: "ARCHIVED", ifMatch: 'W/"rev-3"' },
  ]);
});

test("never deletes a non-archived entry even if the server DELETE would accept it", async () => {
  const methods: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    methods.push(config.method ?? "");
    return {
      config,
      data: { data: { id: "entry-1", status: "INACTIVE" } },
      headers: { etag: 'W/"rev-3"' },
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
      headers: { etag: 'W/"rev-4"' },
      status: config.method === "delete" ? 204 : 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await api.deleteArchivedEntry("entry-1");

  expect(requests).toEqual([
    { method: "get", ifMatch: undefined },
    { method: "delete", ifMatch: 'W/"rev-4"' },
  ]);
});

test("does not activate entries while Back lacks valid-offer checks", async () => {
  const adapter: AxiosAdapter = jest.fn();
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.setEntryStatus("entry-1", "ACTIVE")).rejects.toThrow("servidor valide las ofertas activas");
  expect(adapter).not.toHaveBeenCalled();
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
