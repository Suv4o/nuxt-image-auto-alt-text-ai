export default defineNuxtConfig({
  modules: ["../src/altCraft"],
  altCraft: {
    modelName: "nlpconnect/vit-gpt2-image-captioning",
    accessToken: "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",
  },
  devtools: { enabled: true },
});
