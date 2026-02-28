import { Resource } from "sst";
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";

const cognito = new CognitoIdentityProviderClient({});
const rds = new RDSDataClient({});

const db = Resource.ClemsonDB as {
  clusterArn: string;
  secretArn: string;
  database: string;
};

const prefix = `${Resource.App.name}/${Resource.App.stage}`;

export async function handler(token: string) {
  try {
    // Verify the Cognito access token
    const user = await cognito.send(
      new GetUserCommand({ AccessToken: token })
    );

    const sub =
      user.UserAttributes?.find((a) => a.Name === "sub")?.Value ?? "";

    if (!sub) {
      return { publish: [], subscribe: [] };
    }

    // Look up the internal user ID
    const result = await rds.send(
      new ExecuteStatementCommand({
        resourceArn: db.clusterArn,
        secretArn: db.secretArn,
        database: db.database,
        sql: "SELECT id FROM users WHERE cognito_id = :sub LIMIT 1",
        parameters: [{ name: "sub", value: { stringValue: sub } }],
      })
    );

    const userId = result.records?.[0]?.[0]?.stringValue;
    if (!userId) {
      return { publish: [], subscribe: [] };
    }

    // Grant access to user-specific notification topic and all message topics
    return {
      publish: [
        // Users don't publish directly — server actions do
      ],
      subscribe: [
        `${prefix}/notifications/${userId}`,
        `${prefix}/messages/#`,
      ],
    };
  } catch (err) {
    console.error("Realtime auth error:", err);
    return { publish: [], subscribe: [] };
  }
}
