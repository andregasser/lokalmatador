import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export function getUserFromEvent(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const claims = event.requestContext.authorizer.jwt.claims;
  return {
    userId: claims.sub as string,
    username: (claims.name ?? claims.email ?? "Unknown") as string,
  };
}
