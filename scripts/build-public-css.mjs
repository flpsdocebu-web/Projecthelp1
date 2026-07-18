import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const appDirectory = join(root, "app");
const sources = (await readdir(appDirectory))
  .filter((name) => name.endsWith(".css"))
  .sort((a, b) => a.localeCompare(b));

const sections = await Promise.all(
  sources.map(async (source) =>
    `\n/* app/${source} */\n${await readFile(join(appDirectory, source), "utf8")}\n`,
  ),
);

const output = join(root, "public", "project-helps-runtime.css");
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  `/* Generated during the active production build. */\n${sections.join("")}`,
  "utf8",
);
console.log(`Generated public stylesheet from ${sources.length} CSS files.`);
