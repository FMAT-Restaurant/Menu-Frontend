import { MENU_PERMISSIONS } from "../shared/permissions";
import { createDemoToken, parseDemoPermissions } from "./permissions";

test("uses all demo permissions by default and accepts a validated query subset", () => {
  expect(parseDemoPermissions("")).toEqual(MENU_PERMISSIONS);
  expect(parseDemoPermissions("?permissions=menu%3Acatalog%3Aread%2Cunknown%3Awrite")).toEqual(["menu:catalog:read"]);
  expect(parseDemoPermissions("?permissions=")).toEqual([]);
});

test("creates a local token carrying only the selected demo permissions", () => {
  const token = createDemoToken("?permissions=menu%3Aentries%3Aread");
  const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { permissions: string[] };

  expect(payload.permissions).toEqual(["menu:entries:read"]);
});
