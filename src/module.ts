import {
  defineNuxtModule,
  createResolver,
  addServerPlugin,
  useNitro,
} from "@nuxt/kit";

export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-image-auto-alt-ai",
    configKey: "nuxtImageAutoAltAi",
  },
  setup(options, nuxt) {
    // @ts-ignore
    const resolver = createResolver(import.meta.url);
    const { resolve } = resolver;

    // Assign options to global config so we can access them in the nitro plugin
    Object.entries(options).forEach(([key, value]) => {
      // @ts-ignore
      import.meta.env[key] = value;
    });

    addServerPlugin(resolve("./runtime/server/render-html"));
  },
});
