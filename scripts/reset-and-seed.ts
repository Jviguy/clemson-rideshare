import { RDSDataClient, ExecuteStatementCommand, type SqlParameter } from "@aws-sdk/client-rds-data";

/**
 * Reset & Seed Script
 * Wipes ALL data and seeds clean demo state for judging.
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
  return rds.send(
    new ExecuteStatementCommand({
      resourceArn: config.clusterArn,
      secretArn: config.secretArn,
      database: config.database,
      sql,
      parameters,
    })
  );
}

// ── Time helpers ──

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

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

function daysFromNow(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// ── Deterministic UUIDs ──

const USERS = {
  driver1: "00000000-0000-4000-a000-000000000001",
  rider1: "00000000-0000-4000-a000-000000000002",
  driver2: "00000000-0000-4000-a000-000000000003",
  rider2: "00000000-0000-4000-a000-000000000004",
};

const RIDES = {
  clemsonToAtlanta: "10000000-0000-4000-a000-000000000001",
  clemsonToCharlotte: "10000000-0000-4000-a000-000000000002",
  clemsonToGreenville: "10000000-0000-4000-a000-000000000003",
  columbaToClemson: "10000000-0000-4000-a000-000000000004",
  clemsonToColumbia: "10000000-0000-4000-a000-000000000005",
  clemsonToAsheville: "10000000-0000-4000-a000-000000000006",
};

const REQUESTS = {
  r1: "20000000-0000-4000-a000-000000000001",
  r2: "20000000-0000-4000-a000-000000000002",
  r3: "20000000-0000-4000-a000-000000000003",
  r4: "20000000-0000-4000-a000-000000000004",
};

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   TigerRide - Reset & Seed Script    ║");
  console.log("╚══════════════════════════════════════╝\n");

  // ── 1. RESET — truncate all tables (FK-safe order) ──
  console.log("🗑  Wiping all data...");
  // Delete in dependency order (children first)
  await exec("DELETE FROM ride_messages");
  await exec("DELETE FROM notifications");
  await exec("DELETE FROM ride_requests");
  await exec("DELETE FROM rides");
  // Keep real users — only delete seeded demo users
  // (Real users have real cognito_ids from actual signups)
  await exec("DELETE FROM users WHERE cognito_id LIKE 'demo-%'");
  console.log("   Done — all ride data cleared.\n");

  // ── 2. SEED USERS ──
  // We DON'T seed fake users. Real users come from Cognito sign-ups.
  // The rides below will be owned by whichever real user runs the app.
  // But we need placeholder users for demo rides, so seed them.
  console.log("👤 Seeding demo users...");

  const demoUsers = [
    { id: USERS.driver1, cognitoId: "demo-driver-1", email: "jviguytwo2@clemson.edu", name: "Jviguy" },
    { id: USERS.rider1, cognitoId: "demo-rider-1", email: "sarah.tiger@clemson.edu", name: "Sarah Johnson" },
    { id: USERS.driver2, cognitoId: "demo-driver-2", email: "mike.clemson@clemson.edu", name: "Mike Williams" },
    { id: USERS.rider2, cognitoId: "demo-rider-2", email: "emma.paw@clemson.edu", name: "Emma Davis" },
  ];

  for (const u of demoUsers) {
    await exec(
      `INSERT INTO users (id, cognito_id, email, name)
       VALUES (:id::uuid, :cognitoId, :email, :name)
       ON CONFLICT (id) DO UPDATE SET name = :name, email = :email`,
      [str("id", u.id), str("cognitoId", u.cognitoId), str("email", u.email), str("name", u.name)]
    );
    console.log(`   + ${u.name} (${u.email})`);
  }

  // ── 3. SEED RIDES ──
  console.log("\n🚗 Seeding rides...");

  const rides = [
    {
      id: RIDES.clemsonToAtlanta,
      driverId: USERS.driver1,
      originName: "Clemson, SC",
      originLat: 34.6834, originLng: -82.8374,
      destName: "Atlanta, GA",
      destLat: 33.749, destLng: -84.388,
      departureTime: tomorrow(10),
      totalSeats: 3, availableSeats: 2,
      pricePerSeat: 2000,
      description: "No smoking please. One bag max. Meeting at Hendrix Center parking lot.",
      status: "open",
    },
    {
      id: RIDES.clemsonToCharlotte,
      driverId: USERS.driver2,
      originName: "Clemson, SC",
      originLat: 34.6834, originLng: -82.8374,
      destName: "Charlotte, NC",
      destLat: 35.2271, destLng: -80.8431,
      departureTime: dayAfterTomorrow(14),
      totalSeats: 3, availableSeats: 3,
      pricePerSeat: 1500,
      description: "Happy to make stops along the way. Trunk has plenty of space.",
      status: "open",
    },
    {
      id: RIDES.clemsonToGreenville,
      driverId: USERS.driver1,
      originName: "Clemson, SC",
      originLat: 34.6834, originLng: -82.8374,
      destName: "Greenville, SC",
      destLat: 34.8526, destLng: -82.394,
      departureTime: hoursFromNow(5),
      totalSeats: 4, availableSeats: 2,
      pricePerSeat: 800,
      description: "Quick trip to Greenville. Meeting at Cooper Library lot B.",
      status: "open",
    },
    {
      id: RIDES.columbaToClemson,
      driverId: USERS.rider1,
      originName: "Columbia, SC",
      originLat: 34.0007, originLng: -81.0348,
      destName: "Clemson, SC",
      destLat: 34.6834, destLng: -82.8374,
      departureTime: tomorrow(18),
      totalSeats: 4, availableSeats: 4,
      pricePerSeat: 1200,
      description: "Driving back from Columbia after the weekend. AC works great!",
      status: "open",
    },
    {
      id: RIDES.clemsonToColumbia,
      driverId: USERS.driver2,
      originName: "Clemson, SC",
      originLat: 34.6834, originLng: -82.8374,
      destName: "Columbia, SC",
      destLat: 34.0007, destLng: -81.0348,
      departureTime: daysFromNow(3, 9),
      totalSeats: 2, availableSeats: 2,
      pricePerSeat: 1000,
      description: null,
      status: "open",
    },
    {
      id: RIDES.clemsonToAsheville,
      driverId: USERS.rider2,
      originName: "Clemson, SC",
      originLat: 34.6834, originLng: -82.8374,
      destName: "Asheville, NC",
      destLat: 35.5951, destLng: -82.5515,
      departureTime: daysFromNow(4, 11),
      totalSeats: 3, availableSeats: 3,
      pricePerSeat: 1800,
      description: "Weekend trip to Asheville! Good vibes only 🎶",
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
    console.log(`   + ${r.originName} → ${r.destName}  ($${(r.pricePerSeat / 100).toFixed(2)}, ${r.availableSeats}/${r.totalSeats} seats)`);
  }

  // ── 4. SEED RIDE REQUESTS ──
  console.log("\n📋 Seeding ride requests...");

  // Pending request on Clemson → Atlanta
  await exec(
    `INSERT INTO ride_requests (id, ride_id, rider_id, status, pickup_name, pickup_lat, pickup_lng, amount_cents, note)
     VALUES (:id::uuid, :rideId::uuid, :riderId::uuid, :status, :pickupName, :pickupLat, :pickupLng, :amountCents, :note)
     ON CONFLICT (id) DO NOTHING`,
    [
      str("id", REQUESTS.r1), str("rideId", RIDES.clemsonToAtlanta), str("riderId", USERS.rider1),
      str("status", "pending"), str("pickupName", "Hendrix Student Center"),
      dbl("pickupLat", 34.6767), dbl("pickupLng", -82.8363),
      num("amountCents", 2000), str("note", "I'll be at the main entrance. Have one backpack."),
    ]
  );
  console.log("   + Pending: Sarah → Atlanta ride (with pickup note)");

  // Accepted request on Clemson → Atlanta
  await exec(
    `INSERT INTO ride_requests (id, ride_id, rider_id, status, pickup_name, pickup_lat, pickup_lng, amount_cents, note)
     VALUES (:id::uuid, :rideId::uuid, :riderId::uuid, :status, :pickupName, :pickupLat, :pickupLng, :amountCents, :note)
     ON CONFLICT (id) DO NOTHING`,
    [
      str("id", REQUESTS.r2), str("rideId", RIDES.clemsonToAtlanta), str("riderId", USERS.rider2),
      str("status", "accepted"), str("pickupName", "Douthit Hills"),
      dbl("pickupLat", 34.6823), dbl("pickupLng", -82.8451),
      num("amountCents", 2000), str("note", ""),
    ]
  );
  console.log("   + Accepted: Emma → Atlanta ride");

  // Accepted request on Clemson → Greenville
  await exec(
    `INSERT INTO ride_requests (id, ride_id, rider_id, status, pickup_name, pickup_lat, pickup_lng, amount_cents, note)
     VALUES (:id::uuid, :rideId::uuid, :riderId::uuid, :status, :pickupName, :pickupLat, :pickupLng, :amountCents, :note)
     ON CONFLICT (id) DO NOTHING`,
    [
      str("id", REQUESTS.r3), str("rideId", RIDES.clemsonToGreenville), str("riderId", USERS.rider1),
      str("status", "accepted"), str("pickupName", "Cooper Library"),
      dbl("pickupLat", 34.6761), dbl("pickupLng", -82.8366),
      num("amountCents", 800), str("note", "I'll be at the front entrance"),
    ]
  );
  console.log("   + Accepted: Sarah → Greenville ride");

  // Pending request on Clemson → Greenville
  await exec(
    `INSERT INTO ride_requests (id, ride_id, rider_id, status, pickup_name, pickup_lat, pickup_lng, amount_cents, note)
     VALUES (:id::uuid, :rideId::uuid, :riderId::uuid, :status, :pickupName, :pickupLat, :pickupLng, :amountCents, :note)
     ON CONFLICT (id) DO NOTHING`,
    [
      str("id", REQUESTS.r4), str("rideId", RIDES.clemsonToGreenville), str("riderId", USERS.rider2),
      str("status", "pending"), str("pickupName", "Tillman Hall"),
      dbl("pickupLat", 34.6795), dbl("pickupLng", -82.8369),
      num("amountCents", 800), str("note", "Is there room for a small suitcase?"),
    ]
  );
  console.log("   + Pending: Emma → Greenville ride");

  // ── 5. SEED MESSAGES ──
  console.log("\n💬 Seeding ride messages...");

  const msgId = (n: number) => `40000000-0000-4000-a000-00000000000${n}`;
  const msgs = [
    { id: msgId(1), rideId: RIDES.clemsonToAtlanta, userId: USERS.rider2, message: "Hey! What time exactly are we meeting?", ago: 120 },
    { id: msgId(2), rideId: RIDES.clemsonToAtlanta, userId: USERS.driver1, message: "10am sharp at Hendrix parking lot. I drive a white Honda Civic.", ago: 90 },
    { id: msgId(3), rideId: RIDES.clemsonToAtlanta, userId: USERS.rider2, message: "Perfect, I'll be there! Do you have an aux cord?", ago: 60 },
    { id: msgId(4), rideId: RIDES.clemsonToGreenville, userId: USERS.rider1, message: "Are we still on for today?", ago: 45 },
    { id: msgId(5), rideId: RIDES.clemsonToGreenville, userId: USERS.driver1, message: "Yep! See you at Cooper Library in a few hours.", ago: 30 },
  ];

  for (const m of msgs) {
    const ts = new Date(Date.now() - m.ago * 60_000).toISOString();
    await exec(
      `INSERT INTO ride_messages (id, ride_id, user_id, message, created_at)
       VALUES (:id::uuid, :rideId::uuid, :userId::uuid, :message, :ts::timestamptz)
       ON CONFLICT (id) DO NOTHING`,
      [str("id", m.id), str("rideId", m.rideId), str("userId", m.userId), str("message", m.message), str("ts", ts)]
    );
  }
  console.log(`   + ${msgs.length} messages across 2 rides`);

  // ── 6. SEED NOTIFICATIONS ──
  console.log("\n🔔 Seeding notifications...");

  const notifId = (n: number) => `30000000-0000-4000-a000-00000000000${n}`;
  const notifs = [
    { id: notifId(1), userId: USERS.driver1, rideId: RIDES.clemsonToAtlanta, type: "ride_request", message: "Sarah Johnson requested to join your ride to Atlanta.", read: false },
    { id: notifId(2), userId: USERS.rider2, rideId: RIDES.clemsonToAtlanta, type: "request_accepted", message: "Your request for Clemson → Atlanta was accepted! Go to My Rides to confirm & pay.", read: false },
    { id: notifId(3), userId: USERS.driver1, rideId: RIDES.clemsonToGreenville, type: "ride_request", message: "Emma Davis requested to join your ride to Greenville.", read: false },
    { id: notifId(4), userId: USERS.rider1, rideId: RIDES.clemsonToGreenville, type: "request_accepted", message: "Your request for Clemson → Greenville was accepted!", read: true },
    { id: notifId(5), userId: USERS.driver1, rideId: RIDES.clemsonToAtlanta, type: "ride_message", message: "Emma Davis: Perfect, I'll be there! Do you have an aux cord?", read: false },
  ];

  for (const n of notifs) {
    await exec(
      `INSERT INTO notifications (id, user_id, ride_id, type, message, read)
       VALUES (:id::uuid, :userId::uuid, :rideId::uuid, :type, :message, :read)
       ON CONFLICT (id) DO NOTHING`,
      [str("id", n.id), str("userId", n.userId), str("rideId", n.rideId), str("type", n.type), str("message", n.message), bool("read", n.read)]
    );
  }
  console.log(`   + ${notifs.length} notifications`);

  // ── Done ──
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║          Seed complete! 🐅           ║");
  console.log("╠══════════════════════════════════════╣");
  console.log("║  6 rides, 4 requests, 5 messages     ║");
  console.log("║  5 notifications, 4 demo users       ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("\nReal user accounts (from Cognito sign-ups) are preserved.");
  console.log("Log in normally and browse /rides to see seeded data.\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
