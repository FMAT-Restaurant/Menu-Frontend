import axios from "axios";
import { createMenuApi } from "./menuApi";

const key = "83f34a6a-5611-41dd-b437-a9cb96d932c2";

describe("A02/A10: every conditional mutation rejects an invalid version before writing", () => {
  test.each([undefined, 'W/"v1"', "*", "unquoted", '"unterminated'])("invalid ETag %s", async etag => {
    const families = ["entry.patch", "offer.patch", "offer.status", "category.patch", "recipe.patch",
      "entry.status", "entry.delete", "offer.delete", "recipe.delete"];
    for (const family of families) {
      const writes: string[] = [];
      const client = axios.create({ adapter: async config => {
        if (config.method !== "get") writes.push(config.method ?? "unknown");
        const entry = { id: "entry-1", brandName: "Entrada", description: "Descripción", status: "ARCHIVED", categoryIds: [] };
        const recipe = { id: "recipe-1", name: "Receta", description: "Descripción", instructions: "Preparar", supplies: [] };
        const offer = { id: "offer-1", entryId: "entry-1", presentationTag: "Oferta", basePrice: 10, status: "INACTIVE", image: null, composition: { slots: [] } };
        return { status: 200, statusText: "OK", config, headers: etag === undefined ? {} : { etag }, data: {
          data: config.url?.includes("recipes") ? recipe : config.url?.includes("offers") ? offer : entry,
        } };
      } });
      const api = createMenuApi(client);
      const invoke = () => {
        // Reflect supplies intentionally invalid runtime values without weakening the public signature.
        if (family === "entry.patch") return Reflect.apply(api.updateEntry, api, ["entry-1", { brandName: "Local" }, etag]);
        if (family === "offer.patch") return Reflect.apply(api.updateOffer, api, ["offer-1", { presentationTag: "Local" }, etag, key]);
        if (family === "offer.status") return Reflect.apply(api.setOfferStatus, api, ["offer-1", { status: "ACTIVE" }, etag, key]);
        if (family === "category.patch") return Reflect.apply(api.updateCategory, api, ["category-1", { name: "Local" }, etag]);
        if (family === "recipe.patch") return Reflect.apply(api.updateRecipe, api, ["recipe-1", { name: "Local", description: "D", instructions: "I", supplies: [] }, etag]);
        if (family === "entry.status") return api.setEntryStatus("entry-1", "INACTIVE");
        if (family === "entry.delete") return api.deleteArchivedEntry("entry-1");
        if (family === "offer.delete") return api.deleteInactiveOffer("offer-1");
        return api.deleteRecipe("recipe-1");
      };
      await expect(invoke()).rejects.toThrow();
      expect({ family, writes }).toEqual({ family, writes: [] });
    }
  });
});
