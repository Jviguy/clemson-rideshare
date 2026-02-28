import { drizzle } from "drizzle-orm/aws-data-api/pg";
import { RDSDataClient } from "@aws-sdk/client-rds-data";
import * as schema from "./schema";

const rdsClient = new RDSDataClient({});

export const db = drizzle(rdsClient, {
  schema,
  database: process.env.DATABASE_NAME || "clemson_rideshare",
  secretArn: process.env.DATABASE_SECRET_ARN || "",
  resourceArn: process.env.DATABASE_ARN || "",
});

export type Database = typeof db;
