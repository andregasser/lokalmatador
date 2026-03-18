/// <reference path="./.sst/platform/config.d.ts" />

/**
 * SST Configuration for Lokalmatador
 * Deploys the React frontend to AWS S3 + CloudFront.
 */
export default $config({
  app(input) {
    return {
      name: "lokalmatador",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // Deploy the React frontend as a static site
    const site = new sst.aws.StaticSite("Frontend", {
      path: "frontend",
      build: {
        command: "npm run build",
        output: "dist",
      },
      environment: {
        // Here we can inject API URLs later
        VITE_APP_STAGE: $app.stage,
      },
    });

    return {
      url: site.url,
    };
  },
});
