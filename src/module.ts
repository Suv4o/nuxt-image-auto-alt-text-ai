import { defineNuxtModule, createResolver, addServerPlugin } from "@nuxt/kit";

export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "alt-craft",
    configKey: "altCraft",
  },
  setup(options, nuxt) {
    // @ts-ignore
    const resolver = createResolver(import.meta.url);
    const { resolve } = resolver;

    // Assign options to nuxt config as private so we can access them in the nitro plugin
    nuxt.hook("nitro:config", async (nitroConfig) => {
      nitroConfig.runtimeConfig["altCraftOptions"] = options;
    });

    addServerPlugin(resolve("./runtime/server/render-html"));
  },
});
