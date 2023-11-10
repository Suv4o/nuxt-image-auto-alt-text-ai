import {
  defineNuxtModule,
  createResolver,
  addServerPlugin,
  // addPlugin,
} from "@nuxt/kit";

export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "alt-craft",
    configKey: "altCraft",
  },
  setup(options) {
    // @ts-ignore
    const resolver = createResolver(import.meta.url);
    const { resolve } = resolver;

    // Assign options to global config so we can access them in the nitro plugin
    Object.entries(options).forEach(([key, value]) => {
      // @ts-ignore
      import.meta.env[key] = value;
    });

    // addPlugin(resolve("./runtime/client/render-html"));
    addServerPlugin(resolve("./runtime/server/render-html"));
  },
});
