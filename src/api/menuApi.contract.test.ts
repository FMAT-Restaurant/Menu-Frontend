import axios, { type AxiosAdapter } from "axios";
import { createMenuApi } from "./menuApi";

const entry = {
  id: "entry-1",
  brandName: "Bowl de pollo",
  description: "Con arroz",
  status: "INACTIVE",
  categoryIds: ["category-1"],
  image: { id: "image-1", url: "/images/1", thumbnailUrl: "/images/1" },
};

test("uploads an image first, then creates an inactive entry with its imageId in JSON", async () => {
  const requests: { method?: string; url?: string; data: unknown }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ method: config.method, url: config.url, data: config.data });
    const upload = config.url === "/media/images";
    return {
      config,
      data: { data: upload ? { id: "image-1" } : entry },
      headers: {},
      status: 201,
      statusText: "Created",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  const image = new File(["image bytes"], "bowl.png", { type: "image/png" });

  await expect(api.createEntry({ brandName: entry.brandName, description: entry.description, categoryIds: entry.categoryIds }, image))
    .resolves.toEqual(entry);

  expect(requests.map(({ method, url }) => `${method} ${url}`)).toEqual([
    "post /media/images",
    "post /menu/entries",
  ]);
  expect(requests[0].data).toBeInstanceOf(FormData);
  expect((requests[0].data as FormData).get("file")).toBe(image);
  expect(JSON.parse(requests[1].data as string)).toEqual({
    brandName: entry.brandName,
    description: entry.description,
    categoryIds: entry.categoryIds,
    imageId: "image-1",
  });
});

test("edits an entry with If-Match and preserves its image when no file is selected", async () => {
  const requests: { method?: string; url?: string; data?: unknown; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({
      method: config.method,
      url: config.url,
      data: config.data ? JSON.parse(config.data as string) : undefined,
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
  const draft = { brandName: "Bowl especial", description: "Con verduras", categoryIds: [], status: "INACTIVE" as const };

  await expect(api.updateEntry(entry.id, draft)).resolves.toEqual(entry);
  expect(requests).toEqual([
    { method: "get", url: "/menu/entries/entry-1", data: undefined, ifMatch: undefined },
    { method: "patch", url: "/menu/entries/entry-1", data: draft, ifMatch: '"rev-3"' },
  ]);
});

test("uploads a replacement image before PATCH and sends only its id with the current ETag", async () => {
  const requests: { method?: string; url?: string; data: unknown; ifMatch?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ method: config.method, url: config.url, data: config.data, ifMatch: config.headers.get("If-Match")?.toString() });
    return {
      config,
      data: { data: config.url === "/media/images" ? { id: "image-2" } : entry },
      headers: { etag: '"rev-3"' },
      status: 200,
      statusText: "OK",
    };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));
  const image = new File(["new image"], "new.png", { type: "image/png" });
  const draft = { brandName: "Bowl especial", description: "Con verduras", categoryIds: [], status: "INACTIVE" as const };

  await api.updateEntry(entry.id, draft, image);
  expect(requests.map(({ method, url }) => `${method} ${url}`)).toEqual([
    "post /media/images",
    "get /menu/entries/entry-1",
    "patch /menu/entries/entry-1",
  ]);
  expect((requests[0].data as FormData).get("file")).toBe(image);
  expect(JSON.parse(requests[2].data as string)).toEqual({ ...draft, imageId: "image-2" });
  expect(requests[2].ifMatch).toBe('"rev-3"');
});

test("does not create an entry when image upload fails", async () => {
  const requests: string[] = [];
  const uploadError = new Error("Invalid image");
  const adapter: AxiosAdapter = async (config) => {
    requests.push(`${config.method} ${config.url}`);
    throw uploadError;
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.createEntry({ brandName: "Bowl", description: "Con arroz", categoryIds: [] }, new File(["bad"], "bad.png", { type: "image/png" })))
    .rejects.toBe(uploadError);
  expect(requests).toEqual(["post /media/images"]);
});

test("does not create an entry when the upload response has no imageId", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(`${config.method} ${config.url}`);
    return { config, data: { data: {} }, headers: {}, status: 201, statusText: "Created" };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.createEntry({ brandName: "Bowl", description: "Con arroz", categoryIds: [] }, new File(["image"], "bowl.png", { type: "image/png" })))
    .rejects.toThrow("No se recibió el identificador de la imagen");
  expect(requests).toEqual(["post /media/images"]);
});

test("does not patch an entry if its current ETag is missing", async () => {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(`${config.method} ${config.url}`);
    return { config, data: { data: entry }, headers: {}, status: 200, statusText: "OK" };
  };
  const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

  await expect(api.updateEntry(entry.id, {
    brandName: "Bowl especial", description: "Con arroz", categoryIds: [], status: "INACTIVE",
  })).rejects.toThrow("No se recibió la versión de la entrada");
  expect(requests).toEqual(["get /menu/entries/entry-1"]);
});
