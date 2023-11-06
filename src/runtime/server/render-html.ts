import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { JSDOM } from "jsdom";
import type { NitroAppPlugin } from "nitropack";

function readCachedImageAltText() {
  const pathname = path
    // @ts-ignore
    .dirname(new URL(import.meta.url).pathname);
  const sliceToPosition = pathname.indexOf(".nuxt");
  const dirname = pathname.slice(0, sliceToPosition);

  const filePath = path.join(dirname, "nuxt-image-auto-alt-ai-cache.json");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}), "utf-8");
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return data;
}

function getImgAttributes(htmlString: string) {
  const dom = new JSDOM(htmlString);
  const imgTags = dom.window.document.querySelectorAll(
    "img"
  ) as HTMLImageElement[];
  const imgAttributes = Array.from(imgTags).map((img) => {
    const attributes: { [key: string]: string } = {};
    for (let i = 0; i < img.attributes.length; i++) {
      const attr = img.attributes[i];
      attributes[attr.name] = attr.value;
    }
    const start = htmlString.indexOf("<img");
    const end = htmlString.indexOf(">", start) + 1;
    return { attributes, start, end };
  });
  return imgAttributes;
}

function generateHash(input: string) {
  const hash = crypto.createHash("sha256");
  hash.update(input);
  return hash.digest("hex");
}

export default <NitroAppPlugin>function (nitroApp) {
  nitroApp.hooks.hook("render:response", (response) => {
    console.log(getImgAttributes(response.body));
    // response.body = response.body.replaceAll("alt", `alt="NitroPack"`);
  });
};
