import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sources = [
  "app/globals.css",
  "app/upload-modal.css",
  "app/resource-admin.css",
  "app/report-modal.css",
  "app/typography-enhancements.css",
  "app/home-stats.css",
  "app/user-management.css",
  "app/admin-loader.css",
  "app/deployment-fixes-v2.css",
];

const sections = await Promise.all(
  sources.map(async (source) => `\n/* ${source} */\n${await readFile(join(root, source), "utf8")}\n`),
);
const output = join(root, "public/project-helps-runtime.css");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `/* Generated during production build. */\n${sections.join("")}`, "utf8");
console.log("Generated public/project-helps-runtime.css");
