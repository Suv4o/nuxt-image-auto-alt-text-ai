export default defineNuxtConfig({
  modules: ["../src/altCraft"],
  altCraft: {
    modelName: process.env.MODEL_NAME,
    accessToken: process.env.ACCESS_TOKEN,
    createGitIgnore: true,
  },
  devtools: { enabled: true },
});
