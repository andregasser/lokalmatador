import { Resource } from "sst";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { docClient } from "../lib/dynamo.js";
import { getUserFromEvent } from "../lib/auth.js";
import { json } from "../lib/response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const { userId } = getUserFromEvent(event);

  const result = await docClient.send(new GetCommand({
    TableName: Resource.UserData.name,
    Key: { userId },
  }));

  const item = result.Item ?? { userId, achievements: [], knownStreets: [] };

  return json({
    achievements: item.achievements ?? [],
    knownStreets: item.knownStreets ?? [],
  });
}
