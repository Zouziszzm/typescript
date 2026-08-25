import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("bundle", { recursive: true });

await esbuild.build({
  entryPoints: {
    index: "src/index.ts",
  },
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "bundle/index.js",
  external: [],
  sourcemap: true,
});

console.log("Bundled Lambda to bundle/index.js");
