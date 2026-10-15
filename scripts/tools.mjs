import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Build tools resolve from the repo's node_modules (npm install) first, then
// from PVP_TOOLS or common preinstalled locations, so a build works offline.
const candidates = [
  root,
  process.env.PVP_TOOLS,
  "/opt/npm-tools",
  "/opt/node-tools",
].filter(Boolean);
export function requireTool(name) {
  // ethers is pinned to the committed upstream bundle used by the build.
  if (name === "ethers")
    return createRequire(import.meta.url)(
      resolve(root, "third_party/ethers/ethers-6.15.0.min.js"),
    );
  for (const dir of candidates) {
    if (existsSync(resolve(dir, "node_modules", name)))
      return createRequire(resolve(dir, "package.json"))(name);
  }
  throw new Error(`Missing build tool "${name}". Run npm install.`);
}
export const toolsDir = root;
