import { Resource } from "sst";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { docClient } from "../lib/dynamo.js";
import { getUserFromEvent } from "../lib/auth.js";
import { json, error } from "../lib/response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const { userId, username } = getUserFromEvent(event);

  if (!event.body) return error("Missing request body");

  const body = JSON.parse(event.body);
  const score = Number(body.score);

  if (!Number.isFinite(score) || score < 0) {
    return error("Invalid score");
  }

  const item = {
    id: uuid(),
    userId,
    username,
    score,
    date: new Date().toISOString(),
    type: "SCORE",
  };

  await docClient.send(new PutCommand({
    TableName: Resource.Leaderboard.name,
    Item: item,
  }));

  return json(item, 201);
}
