import axios, { type AxiosAdapter, type AxiosResponse } from "axios";
import { createMenuApi } from "./menuApi";
import { CatalogResponseError, catalogViewCategories, catalogViewPage } from "./catalogResponse";

const entry = {
  id: "entry-1", brandName: "Agua", description: "Agua fresca", image: null, categoryIds: [], isAvailable: false, offers: [],
};

describe("public catalog API contract", () => {
  test("requests the paginated public catalog using only supported filters", async () => {
    let request: AxiosResponse["config"] | undefined;
    const adapter: AxiosAdapter = async config => {
      request = config;
      return { data: { data: [entry], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } }, status: 200, statusText: "OK", headers: {}, config };
    };
    const api = createMenuApi(axios.create({ baseURL: "/api/v1", adapter }));

    await expect(api.getMenuCatalog({ q: "agua", categoryId: "__uncategorized__", page: 1, pageSize: 12 })).resolves.toMatchObject({ data: [entry] });
    expect(request?.url).toBe("/menu/catalog");
    expect(request?.params).toEqual({ q: "agua", categoryId: "__uncategorized__", page: 1, pageSize: 12 });
  });

  test("requests categories and validates uncategorized count", async () => {
    const adapter: AxiosAdapter = async config => ({ data: { data: [{ id: "cat-1", name: "Bebidas", entryCount: 2 }], uncategorized: { entryCount: 1 } }, status: 200, statusText: "OK", headers: {}, config });
    const api = createMenuApi(axios.create({ adapter }));

    await expect(api.listMenuCatalogCategories()).resolves.toEqual({ data: [{ id: "cat-1", name: "Bebidas", entryCount: 2 }], uncategorized: { entryCount: 1 } });
  });

  test("rejects invalid availability and category counts", () => {
    expect(() => catalogViewPage({ data: [{ ...entry, isAvailable: "yes" }], meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 } })).toThrow(CatalogResponseError);
    expect(() => catalogViewCategories({ data: [{ id: "cat-1", name: "Bebidas", entryCount: -1 }], uncategorized: { entryCount: 0 } })).toThrow(CatalogResponseError);
  });

  test("rejects malformed nested offer composition before exposing it to the view", () => {
    const offer = {
      id: "offer-1", presentationTag: "Individual", basePrice: 25, image: null, isAvailable: true,
      composition: { slots: [{ slotId: "slot-1", name: "Plato", quantity: 1, course: "invalid", isAvailable: true, options: [] }] },
    };
    expect(() => catalogViewPage({
      data: [{ ...entry, offers: [offer] }],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    })).toThrow(CatalogResponseError);
  });
});
