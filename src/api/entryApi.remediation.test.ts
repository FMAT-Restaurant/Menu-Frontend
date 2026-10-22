import axios, { AxiosError, type AxiosAdapter } from "axios";
import { createMenuApi } from "./menuApi";

const entry = {
  id: "entry-1",
  brandName: "Entrada",
  description: "Descripción",
  status: "INACTIVE",
  categoryIds: [],
  image: null,
};
const draft = {
  brandName: "Borrador",
  description: "Datos abiertos antes del cambio",
  categoryIds: [],
  status: "INACTIVE" as const,
};

test("retains the opening ETag and detects a concurrent change without refreshing the precondition", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config.method ?? "");
    if (config.method === "patch") {
      expect(config.headers.get("If-Match")).toBe('"opened-1"');
      expect(JSON.parse(config.data)).toEqual(draft);
      throw new AxiosError(
        "Request failed with status code 412",
        "ERR_BAD_REQUEST",
        config,
        {},
        {
          config,
          headers: {},
          status: 412,
          statusText: "Precondition Failed",
          data: { error: { message: "La entrada cambió." } },
        },
      );
    }
    return {
      config,
      data: { data: entry },
      headers: { etag: '"opened-1"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  const opened = await api.getEntry("entry-1");
  await expect(
    api.updateEntry("entry-1", draft, opened.etag ?? ""),
  ).rejects.toHaveProperty("response.status", 412);
  expect(requests).toEqual(["get", "patch"]);
});

test.each(["", 'W/"rev-1"', "unquoted", "*"])(
  "does not issue PATCH with an invalid opening version %s",
  async (etag) => {
    const adapter = jest.fn();
    const api = createMenuApi(axios.create({ adapter }));
    await expect(api.updateEntry("entry-1", draft, etag)).rejects.toThrow(
      "versión fuerte",
    );
    expect(adapter).not.toHaveBeenCalled();
  },
);

test("an unexpected body ETag cannot substitute the missing HTTP version header", async () => {
  const adapter: AxiosAdapter = jest.fn(async (config) => ({
    config,
    data: { data: { ...entry, etag: '"body-version"' } },
    headers: {},
    status: 200,
    statusText: "OK",
  }));
  const api = createMenuApi(axios.create({ adapter }));
  const opened = await api.getEntry("entry-1");
  expect(opened.etag).toBeUndefined();
  await expect(
    api.updateEntry("entry-1", draft, opened.etag ?? ""),
  ).rejects.toThrow("versión fuerte");
  expect(adapter).toHaveBeenCalledTimes(1);
});

test("bounds reads, upload and persistence separately and lets the caller reuse an uploaded id", async () => {
  const requests: { method?: string; url?: string; timeout?: number }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      timeout: config.timeout,
    });
    let data: unknown = { data: entry };
    if (config.url === "/media/images") {
      data = {
        data: {
          id: "uploaded-1",
          url: "/images/uploaded-1.png",
          thumbnailUrl: "/images/uploaded-1-thumb.png",
        },
      };
    }
    if (config.url === "/menu/categories") {
      data = {
        data: [],
        meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      };
    }
    return {
      config,
      data,
      headers: { etag: '"rev-1"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  const current = await api.getEntry("entry-1");
  await api.listCategories();
  const uploadKey = "11111111-1111-4111-8111-111111111111";
  const createKey = "22222222-2222-4222-8222-222222222222";
  const imageId = await api.uploadEntryImage(
    new File(["image"], "entry.png", { type: "image/png" }),
    uploadKey,
  );
  await api.createEntry(
    {
      brandName: "Entrada",
      description: "Descripción",
      categoryIds: [],
      imageId,
    },
    createKey,
  );
  await api.updateEntry("entry-1", { ...draft, imageId }, current.etag ?? "");
  await api.updateEntry("entry-1", { ...draft, imageId }, current.etag ?? "");
  expect(requests.map((request) => request.timeout)).toEqual([
    12000, 12000, 120000, 20000, 20000, 20000,
  ]);
  expect(
    requests.filter((request) => request.url === "/media/images"),
  ).toHaveLength(1);
});

test("loads every category page with at most four concurrent later pages", async () => {
  let active = 0,
    maxActive = 0;
  const pages: number[] = [];
  const adapter: AxiosAdapter = async (config) => {
    const page = Number(config.params.page);
    pages.push(page);
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    const count = page === 8 ? 1 : 100;
    return {
      config,
      data: {
        data: Array.from({ length: count }, (_, i) => ({
          id: `${page}-${i}`,
          name: `Categoría ${page}-${i}`,
        })),
        meta: { page, pageSize: 100, total: 701, totalPages: 8 },
      },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ adapter }));
  expect(await api.listCategories()).toHaveLength(701);
  expect(pages).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(maxActive).toBeLessThanOrEqual(4);
});
