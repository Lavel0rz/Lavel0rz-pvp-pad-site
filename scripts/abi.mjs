// Regenerates public/abi.json and public/verification.json from a Foundry build
// of the deployed contracts. Usage:
//   node scripts/abi.mjs <contracts-repo>/out <deployment.json>
// deployment.json: { "sourceCommit": "...", "contracts": { "PvPPad": "0x..", ... } }
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { root, requireTool } from "./tools.mjs";
let keccak256, toUtf8Bytes;
try {
  ({ keccak256, toUtf8Bytes } = requireTool("ethers"));
} catch {
  ({ keccak256, toUtf8Bytes } = await import(
    resolve(root, "third_party/ethers/ethers-6.15.0.min.js")
  ));
}
const [outDir, deploymentFile] = process.argv.slice(2);
if (!outDir || !deploymentFile) {
  console.error("usage: node scripts/abi.mjs <out-dir> <deployment.json>");
  process.exit(1);
}
const deployment = JSON.parse(await readFile(deploymentFile, "utf8"));
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]))
      : v;
const abis = {};
const verification = { sourceCommit: deployment.sourceCommit, contracts: {} };
for (const [name, address] of Object.entries(deployment.contracts)) {
  const artifact = JSON.parse(
    await readFile(resolve(outDir, `${name}.sol/${name}.json`), "utf8"),
  );
  abis[name] = artifact.abi;
  let code = artifact.deployedBytecode.object;
  const masks = Object.values(artifact.deployedBytecode.immutableReferences || {}).flat();
  for (const m of masks)
    code =
      code.slice(0, 2 + m.start * 2) +
      "0".repeat(m.length * 2) +
      code.slice(2 + (m.start + m.length) * 2);
  verification.contracts[name] = {
    address: address.toLowerCase(),
    abiHash: keccak256(toUtf8Bytes(JSON.stringify(canonical(artifact.abi)))).slice(2),
    codeHash: keccak256(code),
    masks,
  };
  console.log(`${name}: ${(artifact.deployedBytecode.object.length - 2) / 2} bytes, ${masks.length} immutable masks`);
}
await writeFile(resolve(root, "public/abi.json"), JSON.stringify(abis));
await writeFile(resolve(root, "public/verification.json"), JSON.stringify(verification, null, 1));
