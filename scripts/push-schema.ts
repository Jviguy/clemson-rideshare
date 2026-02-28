import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";

// Read database config from SST resource binding
const raw = process.env.SST_RESOURCE_ClemsonDB;
if (!raw) {
  console.error("Run this with: bunx sst shell npx tsx scripts/push-schema.ts");
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
  // ── Users: add Stripe Connect account ID ──
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255)`,

  // ── Rides: add description ──
  `ALTER TABLE rides ADD COLUMN IF NOT EXISTS description TEXT`,

  // ── Ride Requests: add pickup location ──
  `ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS pickup_name VARCHAR(500)`,
  `ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION`,
  `ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION`,

  // ── Ride Requests: add note ──
  `ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS note TEXT`,

  // ── Ride Messages ──
  `CREATE TABLE IF NOT EXISTS ride_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES rides(id),
    user_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
];

async function main() {
  for (const sql of statements) {
    const label = sql.slice(0, 80).replace(/\n/g, " ").trim();
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
