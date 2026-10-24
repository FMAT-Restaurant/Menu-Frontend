interface SavedProperty {
  element: HTMLElement;
  name: string;
  value: string;
  priority: string;
}

interface ScrollLock {
  count: number;
  x: number;
  y: number;
  properties: SavedProperty[];
}

const locks = new WeakMap<Document, ScrollLock>();

/** One lock per document, shared by every modal in an active task. */
export function acquireModalScrollLock(document: Document): () => void {
  let lock = locks.get(document);
  if (!lock) {
    const view = document.defaultView;
    const body = document.body;
    const root = document.documentElement;
    const properties: SavedProperty[] = [];
    const change = (element: HTMLElement, name: string, value: string) => {
      properties.push({ element, name, value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name) });
      element.style.setProperty(name, value);
    };
    lock = { count: 0, x: view?.scrollX ?? 0, y: view?.scrollY ?? 0, properties };
    const scrollbar = view ? Math.max(0, view.innerWidth - root.clientWidth) : 0;
    const padding = view ? Number.parseFloat(view.getComputedStyle(body).paddingRight) || 0 : 0;
    change(root, "overflow", "hidden");
    change(body, "position", "fixed");
    change(body, "top", `${-lock.y}px`);
    change(body, "left", `${-lock.x}px`);
    change(body, "right", "0px");
    change(body, "width", "100%");
    change(body, "overflow", "hidden");
    if (scrollbar > 0 && root.clientWidth > 0) change(body, "padding-right", `${padding + scrollbar}px`);
    locks.set(document, lock);
  }
  lock.count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lock.count -= 1;
    if (lock.count > 0) return;
    for (const property of lock.properties.reverse()) {
      if (property.value) property.element.style.setProperty(property.name, property.value, property.priority);
      else property.element.style.removeProperty(property.name);
    }
    locks.delete(document);
    const view = document.defaultView;
    if (view && (view.scrollX !== lock.x || view.scrollY !== lock.y)) view.scrollTo(lock.x, lock.y);
  };
}
