import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rolldownOptions: {
      input: [
        "./dawn-mazurka/index.html",
        "./cross-step-waltz-variations/index.html",
      ],
      checks: {
        // TODO: https://github.com/Dash-Industry-Forum/dash.js/issues/5026
        commonJsVariableInEsm: false,
      },
    },
  },
});
