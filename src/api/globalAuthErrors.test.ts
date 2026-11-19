import axios, { AxiosError } from "axios";
import { GLOBAL_AUTH_ERROR_EVENT, globalAuthMessage, installGlobalAuthInterceptor, isGlobalAuthError } from "./globalAuthErrors";

test.each([401, 403] as const)("notifies the host for HTTP %i and preserves the rejection", async status => {
  const listener = jest.fn();
  window.addEventListener(GLOBAL_AUTH_ERROR_EVENT, listener);
  const client = axios.create({
    adapter: async config => Promise.reject(new AxiosError(
      "Request rejected",
      "ERR_BAD_REQUEST",
      config,
      undefined,
      { data: {}, status, statusText: "Rejected", headers: {}, config },
    )),
  });
  installGlobalAuthInterceptor(client);

  const error = await client.get("/protected").then(
    () => { throw new Error("Expected the request to reject."); },
    reason => reason,
  );

  expect(isGlobalAuthError(error)).toBe(true);
  expect(error).toMatchObject({ response: { status } });
  expect(listener).toHaveBeenCalledWith(expect.objectContaining({
    detail: { status, message: globalAuthMessage(status) },
  }));
  window.removeEventListener(GLOBAL_AUTH_ERROR_EVENT, listener);
});
