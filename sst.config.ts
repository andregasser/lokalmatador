/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "lokalmatador",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  providers: {
    aws: {
      profile: process.env.AWS_PROFILE,
    },
  },
  async run() {
    // ── DynamoDB Tables ──────────────────────────────────────────
    const leaderboardTable = new sst.aws.Dynamo("Leaderboard", {
      fields: {
        id: "string",
        type: "string",
        score: "number",
        userId: "string",
        date: "string",
      },
      primaryIndex: { hashKey: "id" },
      globalIndexes: {
        byScore: { hashKey: "type", rangeKey: "score" },
        byUser: { hashKey: "userId", rangeKey: "date" },
      },
    });

    const userDataTable = new sst.aws.Dynamo("UserData", {
      fields: {
        userId: "string",
      },
      primaryIndex: { hashKey: "userId" },
    });

    // ── Cognito ──────────────────────────────────────────────────
    const userPool = new sst.aws.CognitoUserPool("UserPool", {
      usernames: ["email"],
    });
    const userPoolClient = userPool.addClient("WebClient");

    // ── API Gateway ──────────────────────────────────────────────
    const api = new sst.aws.ApiGatewayV2("Api", {
      cors: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const authorizer = api.addAuthorizer({
      name: "cognitoAuthorizer",
      jwt: {
        issuer: $interpolate`https://cognito-idp.${aws.getRegionOutput().name}.amazonaws.com/${userPool.id}`,
        audiences: [userPoolClient.id],
      },
    });

    const authConfig = {
      auth: { jwt: { authorizer: authorizer.id } },
    };

    // ── Leaderboard Routes ───────────────────────────────────────
    api.route("POST /leaderboard", {
      handler: "backend/src/leaderboard/post.handler",
      link: [leaderboardTable],
    }, authConfig);

    api.route("GET /leaderboard/top", {
      handler: "backend/src/leaderboard/getTop.handler",
      link: [leaderboardTable],
    }, authConfig);

    api.route("GET /leaderboard/me", {
      handler: "backend/src/leaderboard/getMe.handler",
      link: [leaderboardTable],
    }, authConfig);

    // ── UserData Routes ──────────────────────────────────────────
    api.route("GET /userdata", {
      handler: "backend/src/userdata/get.handler",
      link: [userDataTable],
    }, authConfig);

    api.route("PUT /userdata", {
      handler: "backend/src/userdata/put.handler",
      link: [userDataTable],
    }, authConfig);

    // ── Domain Config ───────────────────────────────────────────
    // DNS is managed in the management account (Route 53), so dns:false + explicit cert
    const domainMap: Record<string, { name: string; cert: string }> = {
      dev: {
        name: "lokalmatador-dev.andregasser.dev",
        cert: "arn:aws:acm:us-east-1:297088704837:certificate/fc24868b-acc2-421e-8230-756b493456bd",
      },
      production: {
        name: "lokalmatador.andregasser.dev",
        cert: "arn:aws:acm:us-east-1:517506432410:certificate/9ff890de-601d-4dbc-9c6a-68b63b2b3370",
      },
    };
    const domainConfig = domainMap[$app.stage]
      ? { name: domainMap[$app.stage].name, cert: domainMap[$app.stage].cert, dns: false }
      : undefined;

    // ── Frontend ─────────────────────────────────────────────────
    const site = new sst.aws.StaticSite("Frontend", {
      path: "frontend",
      domain: domainConfig,
      build: {
        command: "npm run build",
        output: "dist",
      },
      environment: {
        VITE_APP_STAGE: $app.stage,
        VITE_API_URL: api.url,
        VITE_USER_POOL_ID: userPool.id,
        VITE_USER_POOL_CLIENT_ID: userPoolClient.id,
      },
    });

    return {
      url: site.url,
      api: api.url,
    };
  },
});
