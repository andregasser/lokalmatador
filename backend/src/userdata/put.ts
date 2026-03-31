import { Resource } from "sst";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { docClient } from "../lib/dynamo.js";
import { getUserFromEvent } from "../lib/auth.js";
import { json, error } from "../lib/response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const { userId } = getUserFromEvent(event);

  if (!event.body) return error("Missing request body");

  const body = JSON.parse(event.body);

  if (!Array.isArray(body.achievements) || !Array.isArray(body.knownStreets)) {
    return error("achievements and knownStreets must be arrays");
  }

  await docClient.send(new PutCommand({
    TableName: Resource.UserData.name,
    Item: {
      userId,
      achievements: body.achievements,
      knownStreets: body.knownStreets,
    },
  }));

  return json({ success: true });
}
