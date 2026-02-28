import { defineConfig } from "drizzle-kit";

// SST shell injects linked resources as SST_RESOURCE_<Name> JSON blobs
let resourceArn = process.env.DATABASE_ARN;
let secretArn = process.env.DATABASE_SECRET_ARN;
const dbName = process.env.DATABASE_NAME || "clemson_rideshare";

if (!resourceArn) {
  try {
    const raw = process.env.SST_RESOURCE_ClemsonDB;
    if (raw) {
      const parsed = JSON.parse(raw);
      resourceArn = parsed.clusterArn;
      secretArn = parsed.secretArn;
    }
  } catch {}
}

if (!resourceArn || !secretArn) {
  console.error(
    "Missing database ARNs. Run with: npx sst shell drizzle-kit push\n" +
    "Or set DATABASE_ARN and DATABASE_SECRET_ARN manually."
  );
  process.exit(1);
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  driver: "aws-data-api",
  dbCredentials: {
    resourceArn,
    secretArn,
    database: dbName,
  },
});
