import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";

// Read database config from SST resource binding
const raw = process.env.SST_RESOURCE_ClemsonDB;
if (!raw) {
  console.error("Run this with: npx sst shell npx tsx scripts/push-schema.ts");
  process.exit(1);
}

const config = JSON.parse(raw);
const rds = new RDSDataClient({});

async function exec(sql: string) {
  const cmd = new ExecuteStatementCommand({
    resourceArn: config.clusterArn,
    secretArn: config.secretArn,
    database: config.database,
    sql,
  });
  return rds.send(cmd);
}

const statements = [
  // Alter existing enum columns to text (safe if already text)
  `ALTER TABLE rides ALTER COLUMN status TYPE TEXT`,
  `ALTER TABLE ride_requests ALTER COLUMN status TYPE TEXT`,

  // Drop old enum types
  `DROP TYPE IF EXISTS ride_status`,
  `DROP TYPE IF EXISTS request_status`,

  // Re-set defaults (ALTER TYPE drops them)
  `ALTER TABLE rides ALTER COLUMN status SET DEFAULT 'open'`,
  `ALTER TABLE ride_requests ALTER COLUMN status SET DEFAULT 'pending'`,
];

async function main() {
  for (const sql of statements) {
    const label = sql.slice(0, 60).replace(/\n/g, " ").trim();
    try {
      await exec(sql);
      console.log(`✓ ${label}...`);
    } catch (err: any) {
      console.error(`✗ ${label}...`);
      console.error(`  ${err.message}`);
    }
  }
  console.log("\nDone!");
}

main();
