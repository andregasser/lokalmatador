import { Resource } from "sst";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { docClient } from "../lib/dynamo.js";
import { json } from "../lib/response.js";

export async function handler(_event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const result = await docClient.send(new QueryCommand({
    TableName: Resource.Leaderboard.name,
    IndexName: "byScore",
    KeyConditionExpression: "#type = :type",
    ExpressionAttributeNames: { "#type": "type" },
    ExpressionAttributeValues: { ":type": "SCORE" },
    ScanIndexForward: false,
    Limit: 10,
  }));

  return json(result.Items ?? []);
}
