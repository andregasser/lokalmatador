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
      profile: input?.stage === "production"
        ? "andregasser-lokalmatador-prod"
        : "andregasser-lokalmatador-dev",
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

    // ── Frontend ─────────────────────────────────────────────────
    const site = new sst.aws.StaticSite("Frontend", {
      path: "frontend",
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
