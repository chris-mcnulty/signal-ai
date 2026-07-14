import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// __dirname resolves to src/ in source mode and dist/ in the esbuild bundle —
// both are exactly one level below the package root (artifacts/api-server/).
export const PACKAGE_ROOT = path.resolve(__dirname, "..");
export const LIBRARY_DIR = path.join(PACKAGE_ROOT, "public", "static", "library");
export const GENERATED_DIR = path.join(PACKAGE_ROOT, "public", "static", "generated");
