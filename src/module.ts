import {
  defineNuxtModule,
  addComponent,
  createResolver,
  addServerPlugin,
} from "@nuxt/kit";

export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-image-auto-alt-text-ai",
    configKey: "nuxtImageAutoAltTextAi",
  },
  setup(options, nuxt) {
    // @ts-ignore
    const resolver = createResolver(import.meta.url);
    const { resolve } = resolver;

    addServerPlugin(resolve("./runtime/server/render-html"));

    addComponent({
      name: "ImageAltTextAi",
      filePath: resolver.resolve("runtime/components/ImageAltTextAi.vue"),
    });
  },
});
