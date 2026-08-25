import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Only needed on Vercel: pnpm keeps `next` at the monorepo root, but the
// serverless packager resolves modules from apps/web.
if (!process.env.VERCEL) {
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "node_modules/next");
const dest = path.join(root, "apps/web/node_modules/next");

if (!fs.existsSync(src)) {
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

const relativeTarget = path.relative(path.dirname(dest), src);
fs.symlinkSync(relativeTarget, dest, "dir");
