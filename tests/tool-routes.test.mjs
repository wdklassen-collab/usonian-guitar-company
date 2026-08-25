import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("every homepage tool link has a deployed application route", async () => {
  const source = await readFile("app/page.tsx", "utf8");
  const toolsBlock = source.match(/const tools = \[([\s\S]*?)\n\];/);
  assert.ok(toolsBlock, "Could not find the homepage tools registry");

  const routes = [...toolsBlock[1].matchAll(/"\/(.+?)\/"\]/g)].map((match) => match[1]);
  assert.ok(routes.length > 0, "The homepage tools registry is empty");

  for (const route of routes) {
    await assert.doesNotReject(
      access(path.join("app", route, "route.ts")),
      `Homepage tool /${route}/ is missing app/${route}/route.ts`,
    );
  }
});
