import type {
  CatalogImage,
  CatalogViewCategories,
  CatalogViewEntry,
  MenuRepository,
} from "../../application/catalog";

export const PRINTABLE_MENU_NAME = "FMAT Restaurant";
export const PRINTABLE_MENU_CURRENCY = "MXN";
export const UNCATEGORIZED_SECTION_ID = "__uncategorized__";
export const UNCATEGORIZED_SECTION_NAME = "Sin categoría";

const PRINTABLE_CATALOG_PAGE_SIZE = 100;

export interface PrintableMenuOffer {
  id: string;
  presentationTag: string;
  basePrice: number;
  image: CatalogImage | null;
}

export interface PrintableMenuEntry {
  id: string;
  brandName: string;
  description: string;
  image: CatalogImage | null;
  offers: PrintableMenuOffer[];
}

export interface PrintableMenuSection {
  id: string;
  name: string;
  description?: string;
  entries: PrintableMenuEntry[];
}

function compareSpanishText(left: string, right: string): number {
  return left.localeCompare(right, "es", { sensitivity: "base" });
}

function toPrintableEntry(entry: CatalogViewEntry): PrintableMenuEntry {
  const sortedOffers: PrintableMenuOffer[] = [...entry.offers]
    .sort((left, right) =>
      compareSpanishText(left.presentationTag, right.presentationTag) ||
      left.id.localeCompare(right.id),
    )
    .map((offer) => ({
      id: offer.id,
      presentationTag: offer.presentationTag,
      basePrice: offer.basePrice,
      image: offer.image,
    }));

  return {
    id: entry.id,
    brandName: entry.brandName,
    description: entry.description,
    image: entry.image,
    offers: sortedOffers,
  };
}

/**
 * Organiza las entradas y ofertas activas de la carta imprimible conforme a
 * RF-CONS-07 (sin disponibilidad ni composición; solo entradas con ofertas activas)
 * y RF-CONS-08 (secciones por categoría en orden alfabético, omitiendo vacías,
 * entradas sin categoría al final, entradas por nombre comercial y ofertas por etiqueta).
 */
export function buildPrintableMenuSections(
  entries: readonly CatalogViewEntry[],
  categories: CatalogViewCategories,
): PrintableMenuSection[] {
  const eligibleEntries = entries.filter((entry) => entry.offers.length > 0);
  if (eligibleEntries.length === 0) {
    return [];
  }

  const printableById = new Map<string, PrintableMenuEntry>(
    eligibleEntries.map((entry) => [entry.id, toPrintableEntry(entry)]),
  );

  const sortedCategories = [...categories.data].sort(
    (left, right) => compareSpanishText(left.name, right.name) || left.id.localeCompare(right.id),
  );

  const sections: PrintableMenuSection[] = [];

  for (const category of sortedCategories) {
    const categoryEntries = eligibleEntries
      .filter((entry) => entry.categoryIds.includes(category.id))
      .map((entry) => printableById.get(entry.id)!)
      .sort(
        (left, right) =>
          compareSpanishText(left.brandName, right.brandName) || left.id.localeCompare(right.id),
      );

    if (categoryEntries.length > 0) {
      sections.push({
        id: category.id,
        name: category.name,
        ...(category.description ? { description: category.description } : {}),
        entries: categoryEntries,
      });
    }
  }

  const uncategorizedEntries = eligibleEntries
    .filter((entry) => entry.categoryIds.length === 0)
    .map((entry) => printableById.get(entry.id)!)
    .sort(
      (left, right) =>
        compareSpanishText(left.brandName, right.brandName) || left.id.localeCompare(right.id),
    );

  if (uncategorizedEntries.length > 0) {
    sections.push({
      id: UNCATEGORIZED_SECTION_ID,
      name: UNCATEGORIZED_SECTION_NAME,
      entries: uncategorizedEntries,
    });
  }

  return sections;
}

export async function loadAllPrintableCatalogEntries(
  repository: Pick<MenuRepository, "getMenuCatalog">,
  signal?: AbortSignal,
): Promise<CatalogViewEntry[]> {
  const firstPage = await repository.getMenuCatalog(
    { page: 1, pageSize: PRINTABLE_CATALOG_PAGE_SIZE },
    signal,
  );
  const totalPages = firstPage.meta.totalPages;
  if (totalPages <= 1) {
    return firstPage.data;
  }

  const remainingPageNumbers = Array.from(
    { length: totalPages - 1 },
    (_, index) => index + 2,
  );
  const remainingPages = await Promise.all(
    remainingPageNumbers.map((page) =>
      repository.getMenuCatalog({ page, pageSize: PRINTABLE_CATALOG_PAGE_SIZE }, signal),
    ),
  );

  return [firstPage.data, ...remainingPages.map((page) => page.data)].flat();
}

export function formatPrintableGenerationDate(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
