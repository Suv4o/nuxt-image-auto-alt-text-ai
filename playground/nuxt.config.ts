export default defineNuxtConfig({
  modules: ["../src/module"],
  altCraft: {
    modelName: process.env.MODEL_NAME,
    accessToken: process.env.ACCESS_TOKEN,
    prompt: `What's in this image?`,
    serveFrom: "https://localhost:3000",
    createGitIgnore: true,
  },
  devtools: { enabled: true },
});
