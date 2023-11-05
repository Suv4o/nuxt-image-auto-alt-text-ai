import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import type { NitroAppPlugin } from "nitropack";

function readCacheImageAltText() {
  const pathname = path
    // @ts-ignore
    .dirname(new URL(import.meta.url).pathname);
  const sliceToPosition = pathname.indexOf(".nuxt");
  const dirname = pathname.slice(0, sliceToPosition);

  const filePath = path.join(dirname, "auto-image-alt-text-cache.json");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}), "utf-8");
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return data;
}

function replaceAltPatterns(inputString: string, replacement: string) {
  const result = inputString.replace(/\balt\b(="")?/g, replacement);
  return result;
}

function generateHash(input) {
  const hash = crypto.createHash("sha256");
  hash.update(input);
  return hash.digest("hex");
}

export default <NitroAppPlugin>function (nitroApp) {
  nitroApp.hooks.hook("render:response", (response) => {
    response.body = response.body.replaceAll("alt", `alt="NitroPack"`);
  });
};
