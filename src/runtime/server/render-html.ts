import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { JSDOM } from "jsdom";
import * as hf from "@huggingface/inference";
import OpenAI from "openai";
import type { NitroAppPlugin } from "nitropack";
// @ts-ignore
import { useRuntimeConfig } from "#imports";

function createOrUpdateGitignore(dirname: string) {
  const gitignorePath = path.join(dirname, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, ".alt-craft-cache.json", "utf-8");
  } else {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
    if (!gitignoreContent.includes(".alt-craft-cache.json")) {
      fs.appendFileSync(gitignorePath, "\n.alt-craft-cache.json", "utf-8");
    }
  }
}

function writeCachedImageAltText(data: { [key: string]: string }) {
  const pathname = path
    // @ts-ignore
    .dirname(new URL(import.meta.url).pathname);
  const sliceToPosition = pathname.indexOf(".nuxt");
  const dirname = pathname.slice(0, sliceToPosition);

  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname);
  }

  const filePath = path.join(dirname, ".alt-craft-cache.json");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(data), "utf-8");
  } else {
    const cachedData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const newData = { ...cachedData, ...data };
    fs.writeFileSync(filePath, JSON.stringify(newData), "utf-8");
  }

  // Crete or update .gitignore only in the project not in the build
  // @ts-ignore
  if (
    useRuntimeConfig().altCraftOptions.createGitIgnore &&
    !dirname.includes(".output")
  ) {
    createOrUpdateGitignore(dirname);
  }
}

function readCachedImageAltText() {
  const pathname = path
    // @ts-ignore
    .dirname(new URL(import.meta.url).pathname);
  const sliceToPosition = pathname.indexOf(".nuxt");
  const dirname = pathname.slice(0, sliceToPosition);

  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname);
  }

  const filePath = path.join(dirname, ".alt-craft-cache.json");

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

async function getImageCaptionFromApi(imgUrl: string) {
  try {
    const model = useRuntimeConfig().altCraftOptions.modelName;
    const accessToken = useRuntimeConfig().altCraftOptions.accessToken;
    const prompt = useRuntimeConfig().altCraftOptions.prompt;
    const mainDomain = useRuntimeConfig().altCraftOptions.serveFrom ?? "";

    const src = imgUrl.includes("http") ? imgUrl : mainDomain + imgUrl;

    let aiPlatform = null;

    if (accessToken.includes("sk-")) {
      aiPlatform = "OpenAI";
    }

    if (accessToken.includes("hf_")) {
      aiPlatform = "HuggingFace";
    }

    if (!aiPlatform) {
      throw new Error(
        "Invalid access token. Please provide a valid access token."
      );
    }

    if (aiPlatform === "HuggingFace") {
      const { generated_text } = await hf.imageToText({
        accessToken,
        data: await urlToBlob(src),
        model,
      });

      if (!generated_text) {
        return "";
      }

      return generated_text;
    }

    if (aiPlatform === "OpenAI") {
      const openai = new OpenAI({ apiKey: accessToken });

      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: src,
                },
              },
            ],
          },
        ],
      });

      const message = response?.choices?.[0]?.message?.content;

      if (!message) {
        return "";
      }

      return response?.choices?.[0]?.message?.content;
    }
  } catch (error) {
    console.error(error);
  }
}

async function prepareImageData(htmlString: string) {
  const imgAttributes = getImgAttributes(htmlString);

  const cachedImageAltText = readCachedImageAltText();

  const imgAttributesWithAlt = await Promise.all(
    imgAttributes.map(async ({ attributes, start, end }) => {
      const src = attributes?.src;

      // We don't want to process images that has no src attribute
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

async function moveCacheFileFromDevToProd() {
  const pathname = path
    // @ts-ignore
    .dirname(new URL(import.meta.url).pathname);
  const sliceToThePreviousDirectory = pathname.indexOf(".output");
  const sliceToPosition = pathname.indexOf(".nuxt");
  const dirnameToPreviousDirectory = pathname.slice(
    0,
    sliceToThePreviousDirectory
  );
  const dirname = pathname.slice(0, sliceToPosition);

  const oldPath = path.join(
    dirnameToPreviousDirectory,
    ".alt-craft-cache.json"
  );
  const newPath = path.join(dirname, ".alt-craft-cache.json");

  if (!dirname.includes(".output")) {
    return;
  }

  if (fs.existsSync(newPath)) {
    return;
  }

  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname);
  }

  if (!fs.existsSync(oldPath)) {
    return;
  }

  fs.copyFileSync(oldPath, newPath);
}

async function replaceImgTags(htmlString: string) {
  await moveCacheFileFromDevToProd();

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
