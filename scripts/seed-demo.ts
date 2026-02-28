import { RDSDataClient, ExecuteStatementCommand, type SqlParameter } from "@aws-sdk/client-rds-data";

// Read database config from SST resource binding
const raw = process.env.SST_RESOURCE_ClemsonDB;
if (!raw) {
  console.error("Run this with: bunx sst shell npx tsx scripts/seed-demo.ts");
  process.exit(1);
}

const config = JSON.parse(raw);
const rds = new RDSDataClient({});

function str(name: string, value: string): SqlParameter {
  return { name, value: { stringValue: value } };
}
function num(name: string, value: number): SqlParameter {
  return { name, value: { longValue: value } };
}
function dbl(name: string, value: number): SqlParameter {
  return { name, value: { doubleValue: value } };
}
function bool(name: string, value: boolean): SqlParameter {
  return { name, value: { booleanValue: value } };
}

async function exec(sql: string, parameters: SqlParameter[] = []) {
  const cmd = new ExecuteStatementCommand({
    resourceArn: config.clusterArn,
    secretArn: config.secretArn,
    database: config.database,
    sql,
    parameters,
  });
  return rds.send(cmd);
}

// Deterministic UUIDs for idempotency
const DRIVER_ID = "00000000-0000-4000-a000-000000000001";
const RIDER_ID = "00000000-0000-4000-a000-000000000002";

const RIDE_IDS = [
  "10000000-0000-4000-a000-000000000001",
  "10000000-0000-4000-a000-000000000002",
  "10000000-0000-4000-a000-000000000003",
  "10000000-0000-4000-a000-000000000004",
];

const REQUEST_IDS = [
  "20000000-0000-4000-a000-000000000001",
  "20000000-0000-4000-a000-000000000002",
];

const NOTIF_IDS = [
  "30000000-0000-4000-a000-000000000001",
  "30000000-0000-4000-a000-000000000002",
  "30000000-0000-4000-a000-000000000003",
];

function tomorrow(hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function dayAfterTomorrow(hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function hoursFromNow(hours: number): string {
  const d = new Date(Date.now() + hours * 60 * 60 * 1000);
  return d.toISOString();
}

async function main() {
  console.log("Seeding demo data...\n");

  // ── Users ──
  console.log("Seeding users...");
  await exec(
    `INSERT INTO users (id, cognito_id, email, name)
     VALUES (:id::uuid, :cognitoId, :email, :name)
     ON CONFLICT (id) DO NOTHING`,
    [str("id", DRIVER_ID), str("cognitoId", "demo-driver-cognito"), str("email", "driver@clemson.edu"), str("name", "Tiger Driver")]
  );
  console.log("  + Tiger Driver (driver@clemson.edu)");

  await exec(
    `INSERT INTO users (id, cognito_id, email, name)
     VALUES (:id::uuid, :cognitoId, :email, :name)
     ON CONFLICT (id) DO NOTHING`,
    [str("id", RIDER_ID), str("cognitoId", "demo-rider-cognito"), str("email", "rider@clemson.edu"), str("name", "Cub Rider")]
  );
  console.log("  + Cub Rider (rider@clemson.edu)");

  // ── Rides ──
  console.log("\nSeeding rides...");

  const rides = [
    {
      id: RIDE_IDS[0],
      driverId: DRIVER_ID,
      originName: "Clemson, SC",
      originLat: 34.6834,
      originLng: -82.8374,
      destName: "Atlanta, GA",
      destLat: 33.749,
      destLng: -84.388,
      departureTime: tomorrow(10),
      totalSeats: 3,
      availableSeats: 3,
      pricePerSeat: 1500,
      description: "No smoking, one bag max",
      status: "open",
    },
    {
      id: RIDE_IDS[1],
      driverId: DRIVER_ID,
      originName: "Clemson, SC",
      originLat: 34.6834,
      originLng: -82.8374,
      destName: "Charlotte, NC",
      destLat: 35.2271,
      destLng: -80.8431,
      departureTime: dayAfterTomorrow(14),
      totalSeats: 2,
      availableSeats: 2,
      pricePerSeat: 1200,
      description: null,
      status: "open",
    },
    {
      id: RIDE_IDS[2],
      driverId: DRIVER_ID,
      originName: "Clemson, SC",
      originLat: 34.6834,
      originLng: -82.8374,
      destName: "Greenville, SC",
      destLat: 34.8526,
      destLng: -82.394,
      departureTime: hoursFromNow(4),
      totalSeats: 4,
      availableSeats: 2,
      pricePerSeat: 800,
      description: "Meeting at Cooper Library lot",
      status: "open",
    },
    {
      id: RIDE_IDS[3],
      driverId: RIDER_ID,
      originName: "Columbia, SC",
      originLat: 34.0007,
      originLng: -81.0348,
      destName: "Clemson, SC",
      destLat: 34.6834,
      destLng: -82.8374,
      departureTime: tomorrow(18),
      totalSeats: 4,
      availableSeats: 4,
      pricePerSeat: 1000,
      description: null,
      status: "open",
    },
  ];

  for (const r of rides) {
    await exec(
      `INSERT INTO rides (id, driver_id, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, departure_time, total_seats, available_seats, price_per_seat, description, status)
       VALUES (:id::uuid, :driverId::uuid, :originName, :originLat, :originLng, :destName, :destLat, :destLng, :departureTime::timestamptz, :totalSeats, :availableSeats, :pricePerSeat, :description, :status)
       ON CONFLICT (id) DO NOTHING`,
      [
        str("id", r.id), str("driverId", r.driverId),
        str("originName", r.originName), dbl("originLat", r.originLat), dbl("originLng", r.originLng),
        str("destName", r.destName), dbl("destLat", r.destLat), dbl("destLng", r.destLng),
        str("departureTime", r.departureTime),
        num("totalSeats", r.totalSeats), num("availableSeats", r.availableSeats),
        num("pricePerSeat", r.pricePerSeat),
        str("description", r.description ?? ""),
        str("status", r.status),
      ]
    );
    console.log(`  + ${r.originName} → ${r.destName} ($${r.pricePerSeat / 100})`);
  }

  // ── Ride Requests on ride #3 (Clemson → Greenville) ──
  console.log("\nSeeding ride requests...");

  // Pending request with pickup + note
  await exec(
    `INSERT INTO ride_requests (id, ride_id, rider_id, status, pickup_name, pickup_lat, pickup_lng, amount_cents, note)
     VALUES (:id::uuid, :rideId::uuid, :riderId::uuid, :status, :pickupName, :pickupLat, :pickupLng, :amountCents, :note)
     ON CONFLICT (id) DO NOTHING`,
    [
      str("id", REQUEST_IDS[0]), str("rideId", RIDE_IDS[2]), str("riderId", RIDER_ID),
      str("status", "pending"), str("pickupName", "Cooper Library, Clemson"),
      dbl("pickupLat", 34.6761), dbl("pickupLng", -82.8366),
      num("amountCents", 800), str("note", "I'll be at the front entrance"),
    ]
  );
  console.log("  + Pending request (Cub Rider → Greenville ride) with pickup note");

  // Accepted request (no pickup/note)
  await exec(
    `INSERT INTO ride_requests (id, ride_id, rider_id, status, amount_cents)
     VALUES (:id::uuid, :rideId::uuid, :riderId::uuid, :status, :amountCents)
     ON CONFLICT (id) DO NOTHING`,
    [
      str("id", REQUEST_IDS[1]), str("rideId", RIDE_IDS[2]), str("riderId", DRIVER_ID),
      str("status", "accepted"), num("amountCents", 800),
    ]
  );
  console.log("  + Accepted request (Tiger Driver → Greenville ride)");

  // ── Notifications ──
  console.log("\nSeeding notifications...");

  await exec(
    `INSERT INTO notifications (id, user_id, ride_id, type, message, read)
     VALUES (:id::uuid, :userId::uuid, :rideId::uuid, :type, :message, :read)
     ON CONFLICT (id) DO NOTHING`,
    [
      str("id", NOTIF_IDS[0]), str("userId", DRIVER_ID), str("rideId", RIDE_IDS[2]),
      str("type", "ride_request"), str("message", "A new rider has requested to join your ride!"),
      bool("read", false),
    ]
  );
  console.log("  + ride_request notification for driver");

  await exec(
    `INSERT INTO notifications (id, user_id, ride_id, type, message, read)
     VALUES (:id::uuid, :userId::uuid, :rideId::uuid, :type, :message, :read)
     ON CONFLICT (id) DO NOTHING`,
    [
      str("id", NOTIF_IDS[1]), str("userId", RIDER_ID), str("rideId", RIDE_IDS[2]),
      str("type", "request_accepted"), str("message", "Your ride request has been accepted!"),
      bool("read", true),
    ]
  );
  console.log("  + request_accepted notification for rider (read)");

  await exec(
    `INSERT INTO notifications (id, user_id, ride_id, type, message, read)
     VALUES (:id::uuid, :userId::uuid, :rideId::uuid, :type, :message, :read)
     ON CONFLICT (id) DO NOTHING`,
    [
      str("id", NOTIF_IDS[2]), str("userId", DRIVER_ID), str("rideId", RIDE_IDS[0]),
      str("type", "reminder_24h"), str("message", "Reminder: Your ride is tomorrow! Make sure you're ready."),
      bool("read", false),
    ]
  );
  console.log("  + reminder_24h notification for driver");

  console.log("\nDone! Demo data seeded successfully.");
  console.log("Run with: bunx sst shell npx tsx scripts/seed-demo.ts");
}

main();
