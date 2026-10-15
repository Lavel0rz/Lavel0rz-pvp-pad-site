// Builds dist/: a self-contained static site. ethers is bundled INTO app.js
// (no separate runtime library file that a partial upload could drop).
import { cp, mkdir, rm, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { root, requireTool } from "./tools.mjs";
const { build } = requireTool("esbuild");
const ethersBundle = resolve(root, "third_party/ethers/ethers-6.15.0.min.js");
const pinEthers = {
  name: "pinned-ethers",
  setup(b) {
    b.onResolve({ filter: /^ethers$/ }, () => ({ path: ethersBundle }));
  },
};
const dist = resolve(root, "dist");
await rm(dist, { recursive: true, force: true });
await mkdir(dist);
await cp(resolve(root, "public"), dist, { recursive: true });
await build({
  entryPoints: [resolve(root, "src/app.ts"), resolve(root, "src/salt-worker.ts")],
  outdir: dist,
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2022",
  plugins: [pinEthers],
  legalComments: "eof",
});
await cp(resolve(root, "third_party/ethers/LICENSE.md"), resolve(dist, "vendor/ethers-LICENSE.md"));
let total = 0;
async function walk(dir) {
  for (const f of await readdir(dir)) {
    const p = resolve(dir, f);
    const s = await stat(p);
    if (s.isDirectory()) await walk(p);
    else total += s.size;
  }
}
await walk(dist);
console.log(`dist/ built: ${(total / 1024).toFixed(0)} KB, ethers bundled into app.js`);
