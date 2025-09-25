import path from "node:path";
import { pathToFileURL } from "node:url";

const compiledRoot = path.resolve(".test-dist");
const projectRoot = path.resolve(".");

function ensureExtension(targetPath) {
  return path.extname(targetPath) ? targetPath : `${targetPath}.js`;
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("@/lib/")) {
    const compiledTarget = ensureExtension(
      path.join(compiledRoot, specifier.slice("@/lib/".length)),
    );
    return defaultResolve(pathToFileURL(compiledTarget).href, context, defaultResolve);
  }

  if (specifier.startsWith("@/")) {
    const sourceTarget = ensureExtension(
      path.join(projectRoot, specifier.slice(2)),
    );
    return defaultResolve(pathToFileURL(sourceTarget).href, context, defaultResolve);
  }

  return defaultResolve(specifier, context, defaultResolve);
}
