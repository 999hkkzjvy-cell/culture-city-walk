import { pathToFileURL } from "node:url";

const root = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(
      pathToFileURL(`${root}/src/${specifier.slice(2)}.ts`).href,
      context,
    );
  }

  return nextResolve(specifier, context);
}
