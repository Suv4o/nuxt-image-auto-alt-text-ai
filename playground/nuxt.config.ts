export default defineNuxtConfig({
  modules: ["../src/altCraft"],
  altCraft: {
    modelName: process.env.MODEL_NAME,
    accessToken: process.env.ACCESS_TOKEN,
    prompt: `What's in this image?`,
    createGitIgnore: true,
  },
  devtools: { enabled: true },
});
