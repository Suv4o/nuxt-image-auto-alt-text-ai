import type { NitroAppPlugin } from "nitropack";

export default <NitroAppPlugin>function (nitroApp) {
  nitroApp.hooks.hook("render:response", (response) => {
    response.body = response.body.replaceAll("alt", `alt="NitroPack"`);
  });
};
