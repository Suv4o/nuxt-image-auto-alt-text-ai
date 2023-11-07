export default defineNuxtConfig({
  modules: ["../src/module"],
  nuxtImageAutoAltAi: {
    modelName: "nlpconnect/vit-gpt2-image-captioning",
    accessToken: "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",
  },
  devtools: { enabled: true },
});
