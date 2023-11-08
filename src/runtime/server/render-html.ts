import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { JSDOM } from "jsdom";
import * as hf from "@huggingface/inference";
import type { NitroAppPlugin } from "nitropack";

function createOrUpdateGitignore(dirname: string) {
  const gitignorePath = path.join(dirname, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, ".img-alt-text-cache.json", "utf-8");
  } else {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
    if (!gitignoreContent.includes(".img-alt-text-cache.json")) {
      fs.appendFileSync(gitignorePath, "\n.img-alt-text-cache.json", "utf-8");
    }
  }
}

function writeCachedImageAltText(data: { [key: string]: string }) {
  const pathname = path
    // @ts-ignore
    .dirname(new URL(import.meta.url).pathname);
  const sliceToPosition = pathname.indexOf(".nuxt");
  const dirname = pathname.slice(0, sliceToPosition);

  const filePath = path.join(dirname, ".img-alt-text-cache.json");
  fs.writeFileSync(filePath, JSON.stringify(data), "utf-8");

  // Update .gitignore
  createOrUpdateGitignore(dirname);
}

function readCachedImageAltText() {
  const pathname = path
    // @ts-ignore
    .dirname(new URL(import.meta.url).pathname);
  const sliceToPosition = pathname.indexOf(".nuxt");
  const dirname = pathname.slice(0, sliceToPosition);

  const filePath = path.join(dirname, ".img-alt-text-cache.json");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}), "utf-8");
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return data;
}

function createImgTag(attributes: { [key: string]: string }) {
  const attrs = Object.entries(attributes)
    .map(([key, value]) => (value !== "" ? `${key}="${value}"` : key))
    .join(" ");
  return `<img ${attrs}>`;
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
    return attributes;
  });

  const imgPositions = [];
  const regex = /<img[^>]*>/g;
  let match;
  while ((match = regex.exec(htmlString)) !== null) {
    imgPositions.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return imgAttributes.map((attributes, i) => ({
    attributes,
    ...imgPositions[i],
  }));
}

async function urlToBlob(url: string) {
  const response = await fetch(url);
  const buffer = await response.blob();
  return buffer;
}

async function getImageCaptionFromApi(src: string) {
  const { generated_text } = await hf.imageToText({
    // @ts-ignore
    accessToken: import.meta.env.accessToken,
    data: await urlToBlob(src),
    // @ts-ignore
    model: import.meta.env.modelName,
  });

  if (!generated_text) {
    return "";
  }

  return generated_text;
}

async function prepareImageData(htmlString: string) {
  const imgAttributes = getImgAttributes(htmlString);

  const cachedImageAltText = readCachedImageAltText();

  const imgAttributesWithAlt = await Promise.all(
    imgAttributes.map(async ({ attributes, start, end }) => {
      const src = attributes?.src;

      // We don;t want to process images that has no src attribute
      if (!src) {
        return;
      }

      const hash = generateHash(src);
      let alt = attributes?.alt || cachedImageAltText?.[hash];

      // We don't want to add alt text to images that already have it
      if (!alt) {
        const altText = await getImageCaptionFromApi(src);
        cachedImageAltText[hash] = altText;
        writeCachedImageAltText(cachedImageAltText);
        alt = altText;
      }

      return { attributes: { ...attributes, alt }, start, end };
    })
  );

  const result = imgAttributesWithAlt.filter((img) => img).reverse();

  return result;
}

function generateHash(input: string) {
  const hash = crypto.createHash("sha256");
  hash.update(input);
  return hash.digest("hex");
}

async function replaceImgTags(htmlString: string) {
  const imagesData = await prepareImageData(htmlString);

  const imagesToReplace = [];

  for (const img of imagesData) {
    imagesToReplace.push({
      oldImg: htmlString.slice(img.start, img.end),
      newImg: createImgTag(img.attributes),
    });
  }

  for (const img of imagesToReplace) {
    htmlString = htmlString.replace(img.oldImg, img.newImg);
  }

  return htmlString;
}

export default <NitroAppPlugin>function (nitroApp) {
  nitroApp.hooks.hook("render:response", async (response) => {
    response.body = await replaceImgTags(response.body);
  });
};
