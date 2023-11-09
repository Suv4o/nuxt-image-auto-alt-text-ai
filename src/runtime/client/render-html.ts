// @ts-ignore
import { defineNuxtPlugin } from "#app";
import { watch } from "vue";
import { useRoute } from "vue-router";

export default defineNuxtPlugin(async () => {
  const route = useRoute();

  if (process.client) {
    const body = document.querySelector("body");
    console.log(body);
  }

  watch(
    () => route.fullPath,
    () => {
      const body = document.querySelector("body");
      console.log(body);
    }
  );
});
