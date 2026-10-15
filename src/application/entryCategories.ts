import type { MenuCategory, MenuRepository } from "./catalog";
import { cachedCategories, categoryCacheRevision, rememberCategories } from "./catalogCache";

type Repository = Pick<MenuRepository, "listCategories">;
interface Request {
  controller: AbortController;
  promise: Promise<MenuCategory[]>;
  users: number;
  settled: boolean;
  revision: number;
}
const requests = new WeakMap<Repository, Request>();

function subscribe(request: Request, signal: AbortSignal): Promise<MenuCategory[]> {
  request.users += 1;
  return new Promise((resolve, reject) => {
    let finished = false;
    function finish(action: () => void) {
      if (finished) return;
      finished = true;
      signal.removeEventListener("abort", abort);
      request.users -= 1;
      action();
      // StrictMode may immediately attach another consumer after its cleanup.
      queueMicrotask(() => {
        if (request.users === 0 && !request.settled) request.controller.abort();
      });
    }
    function abort() { finish(() => reject(new DOMException("Consulta cancelada.", "AbortError"))); }
    signal.addEventListener("abort", abort, { once: true });
    request.promise.then((value) => finish(() => resolve(value)), (error: unknown) => finish(() => reject(error)));
  });
}

function start(repository: Repository): Request {
  const controller = new AbortController();
  const revision = categoryCacheRevision(repository);
  const request: Request = { controller, revision, users: 0, settled: false, promise: Promise.resolve([]) };
  request.promise = Promise.resolve().then(() => repository.listCategories(controller.signal)).then((items) => {
    if (!controller.signal.aborted && categoryCacheRevision(repository) === revision) rememberCategories(repository, items);
    return items;
  }).finally(() => {
    request.settled = true;
    if (requests.get(repository) === request) requests.delete(repository);
  });
  requests.set(repository, request);
  return request;
}

export function loadEntryCategories(repository: Repository, signal: AbortSignal, force = false): Promise<MenuCategory[]> {
  if (signal.aborted) return Promise.reject(new DOMException("Consulta cancelada.", "AbortError"));
  const cached = cachedCategories(repository);
  if (cached && !force) return Promise.resolve(cached);
  let request = requests.get(repository);
  if (!request || request.controller.signal.aborted || request.revision !== categoryCacheRevision(repository)) request = start(repository);
  return subscribe(request, signal);
}
