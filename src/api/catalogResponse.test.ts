import { categoryPage, entryPage } from "./catalogResponse";

const entry = {
  id: "entry-1", brandName: "Bowl", description: "Con arroz", status: "INACTIVE", image: null,
  categories: [{ id: "category-1", name: "Platos" }], offerCount: 0,
};
const meta = { page: 1, pageSize: 12, total: 1, totalPages: 1 };

test("accepts complete entry and category pages", () => {
  expect(entryPage({ data: [entry], meta }).data[0].brandName).toBe("Bowl");
  expect(categoryPage({ data: [{ id: "category-1", name: "Platos" }], meta }).data[0].name).toBe("Platos");
});

test.each([
  { data: {}, meta },
  { data: [entry], meta: { ...meta, page: 0 } },
  { data: [{ ...entry, categories: null }], meta },
  { data: [{ ...entry, status: "PUBLISHED" }], meta },
  { data: [{ ...entry, image: { url: 4 } }], meta },
  { data: [{ ...entry, offerCount: -1 }], meta },
])("rejects malformed entry responses before rendering", (payload) => {
  expect(() => entryPage(payload)).toThrow("Respuesta de entradas inválida");
});

test("rejects malformed category responses", () => {
  expect(() => categoryPage({ data: [{ id: "category-1" }], meta })).toThrow("Respuesta de categorías inválida");
});
