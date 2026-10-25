import { runInThisContext } from "node:vm";
// jsdom does not expose the Node Fetch classes required by data-router navigation.
Object.assign(globalThis, { AbortController: runInThisContext("AbortController"), AbortSignal: runInThisContext("AbortSignal"), Request: runInThisContext("Request"), Response: runInThisContext("Response"), Headers: runInThisContext("Headers") });

