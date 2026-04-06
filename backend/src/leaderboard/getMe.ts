import { Resource } from "sst";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { docClient } from "../lib/dynamo.js";
import { getUserFromEvent } from "../lib/auth.js";
import { json } from "../lib/response.js";

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const { userId } = getUserFromEvent(event);

  const result = await docClient.send(new QueryCommand({
    TableName: Resource.Leaderboard.name,
    IndexName: "byUser",
    KeyConditionExpression: "userId = :uid",
    ExpressionAttributeValues: { ":uid": userId },
    ScanIndexForward: false,
  }));

  const entries = result.Items ?? [];
  const totalScore = entries.reduce((sum, e) => sum + (e.score as number), 0);

  return json({ entries, totalScore });
}
