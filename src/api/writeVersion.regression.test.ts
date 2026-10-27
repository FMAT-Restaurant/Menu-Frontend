import axios, { type AxiosAdapter } from "axios";
import { createMenuApi } from "./menuApi";
const key = "11111111-1111-4111-8111-111111111111";

test.each(["entry", "offer", "recipe"] as const)("RV06: %s conserva la versión de la respuesta confirmada sin otro GET", async kind => {
  const methods: string[] = [];
  const data = kind === "entry"
    ? { id: "e1", brandName: "Entrada", description: "Descripción", categoryIds: [], status: "INACTIVE", image: null }
    : kind === "offer" ? { id: "o1", entryId: "e1", presentationTag: "Oferta", basePrice: 100, status: "INACTIVE", image: null, composition: { slots: [] } }
      : { id: "r1", name: "Receta", description: "Descripción", instructions: "Preparar", supplies: [] };
  const adapter: AxiosAdapter = async config => {
    methods.push(config.method!);
    return { config, data: { data }, headers: { ETag: '"confirmed-version"' }, status: 201, statusText: "Created" };
  };
  const api = createMenuApi(axios.create({ adapter }));
  const result = kind === "entry" ? await api.createEntry({ brandName: "Entrada", description: "Descripción", categoryIds: [], imageId: "img" }, key)
    : kind === "offer" ? await api.createOffer("e1", { presentationTag: "Oferta", basePrice: 100, composition: { slots: [] } }, "img", key)
      : await api.createRecipe({ name: "Receta", description: "Descripción", instructions: "Preparar", supplies: [] }, key);
  expect(result.etag).toBe('"confirmed-version"');
  expect(methods).toEqual(["post"]);
});
