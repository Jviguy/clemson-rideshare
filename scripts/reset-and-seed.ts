import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminDeleteUserCommand,
  ListUserPoolsCommand,
} from "@aws-sdk/client-cognito-identity-provider";

/**
 * Full Reset Script — Nukes EVERYTHING: DB data + Cognito accounts.
 * Completely fresh slate for demo.
 *
 * Usage:  bunx sst shell npx tsx scripts/reset-and-seed.ts
 */

const raw = process.env.SST_RESOURCE_ClemsonDB;
if (!raw) {
  console.error("Run this with: bunx sst shell npx tsx scripts/reset-and-seed.ts");
  process.exit(1);
}

const config = JSON.parse(raw);
const rds = new RDSDataClient({});
const cognito = new CognitoIdentityProviderClient({});

async function exec(sql: string) {
  return rds.send(
    new ExecuteStatementCommand({
      resourceArn: config.clusterArn,
      secretArn: config.secretArn,
      database: config.database,
      sql,
    })
  );
}

async function findUserPoolId(): Promise<string> {
  // Check env first
  if (process.env.COGNITO_USER_POOL_ID) return process.env.COGNITO_USER_POOL_ID;

  // Auto-discover: find a pool with "Clemson" in the name
  const res = await cognito.send(new ListUserPoolsCommand({ MaxResults: 60 }));
  const pools = res.UserPools ?? [];
  console.log(`   Found ${pools.length} pool(s): ${pools.map((p) => p.Name).join(", ")}`);
  const pool = pools.find((p) => p.Name?.toLowerCase().includes("clemson"));
  if (!pool?.Id) {
    throw new Error("Could not find ClemsonUserPool. Set COGNITO_USER_POOL_ID env var.");
  }
  console.log(`   Found pool: ${pool.Name} (${pool.Id})`);
  return pool.Id;
}

async function wipeCognitoUsers(poolId: string) {
  let token: string | undefined;
  let deleted = 0;

  do {
    const res = await cognito.send(
      new ListUsersCommand({
        UserPoolId: poolId,
        Limit: 60,
        PaginationToken: token,
      })
    );

    for (const user of res.Users ?? []) {
      if (!user.Username) continue;
      await cognito.send(
        new AdminDeleteUserCommand({
          UserPoolId: poolId,
          Username: user.Username,
        })
      );
      const email = user.Attributes?.find((a) => a.Name === "email")?.Value ?? user.Username;
      console.log(`   Deleted Cognito user: ${email}`);
      deleted++;
    }

    token = res.PaginationToken;
  } while (token);

  return deleted;
}

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   TigerRide - FULL RESET for Demo    ║");
  console.log("╚══════════════════════════════════════╝\n");

  // ── Database ──
  console.log("Wiping ride messages...");
  await exec("DELETE FROM ride_messages");

  console.log("Wiping notifications...");
  await exec("DELETE FROM notifications");

  console.log("Wiping ride requests...");
  await exec("DELETE FROM ride_requests");

  console.log("Wiping rides...");
  await exec("DELETE FROM rides");

  console.log("Wiping all users from DB...");
  await exec("DELETE FROM users");

  // ── Cognito ──
  console.log("\nFinding Cognito user pool...");
  const poolId = await findUserPoolId();
  console.log("Wiping Cognito user pool accounts...");
  const count = await wipeCognitoUsers(poolId);

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║     FULL RESET complete! Nuked it.    ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`\nDB: all tables emptied`);
  console.log(`Cognito: ${count} account(s) deleted`);
  console.log("Sign up fresh with @clemson.edu emails.\n");
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
