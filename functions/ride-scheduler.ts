import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";

const rdsClient = new RDSDataClient({});
const DATABASE_ARN = process.env.DATABASE_ARN || "";
const DATABASE_SECRET_ARN = process.env.DATABASE_SECRET_ARN || "";
const DATABASE_NAME = process.env.DATABASE_NAME || "clemson_rideshare";

async function executeSQL(
  sql: string,
  parameters: {
    name: string;
    value: { stringValue?: string; longValue?: number; booleanValue?: boolean };
  }[] = []
) {
  const command = new ExecuteStatementCommand({
    resourceArn: DATABASE_ARN,
    secretArn: DATABASE_SECRET_ARN,
    database: DATABASE_NAME,
    sql,
    parameters: parameters.map((p) => ({
      name: p.name,
      value: p.value,
    })),
  });
  return rdsClient.send(command);
}

type SchedulerEvent = {
  type: "24h_reminder" | "2h_reminder" | "departure";
  rideId: string;
};

export const handler = async (event: SchedulerEvent) => {
  console.log("Ride scheduler event:", JSON.stringify(event));

  const { type, rideId } = event;

  // Check that the ride is still active
  const rideResult = await executeSQL(
    "SELECT id, status, driver_id FROM rides WHERE id = :rideId",
    [{ name: "rideId", value: { stringValue: rideId } }]
  );

  if (
    !rideResult.records ||
    rideResult.records.length === 0 ||
    rideResult.records[0][1]?.stringValue === "cancelled" ||
    rideResult.records[0][1]?.stringValue === "completed"
  ) {
    console.log(`Ride ${rideId} is no longer active, skipping reminder.`);
    return { skipped: true };
  }

  const driverId = rideResult.records[0][2]?.stringValue;

  // Get all accepted riders for this ride
  const ridersResult = await executeSQL(
    "SELECT rider_id FROM ride_requests WHERE ride_id = :rideId AND status = 'accepted'",
    [{ name: "rideId", value: { stringValue: rideId } }]
  );

  const riderIds =
    ridersResult.records?.map((r) => r[0]?.stringValue).filter(Boolean) || [];

  let message: string;
  let notificationType: string;

  switch (type) {
    case "24h_reminder":
      message = "Reminder: Your ride is tomorrow! Make sure you're ready.";
      notificationType = "reminder_24h";
      break;
    case "2h_reminder":
      message =
        "Your ride is in 2 hours! Don't forget to meet at the pickup point.";
      notificationType = "reminder_2h";
      break;
    case "departure":
      message = "It's departure time! Your ride should be starting now.";
      notificationType = "departure";
      break;
    default:
      throw new Error(`Unknown reminder type: ${type}`);
  }

  // Notify the driver
  if (driverId) {
    await executeSQL(
      "INSERT INTO notifications (id, user_id, ride_id, type, message, read) VALUES (gen_random_uuid(), :userId, :rideId, :type, :message, false)",
      [
        { name: "userId", value: { stringValue: driverId } },
        { name: "rideId", value: { stringValue: rideId } },
        { name: "type", value: { stringValue: notificationType } },
        { name: "message", value: { stringValue: message } },
      ]
    );
  }

  // Notify all accepted riders
  for (const riderId of riderIds) {
    if (riderId) {
      await executeSQL(
        "INSERT INTO notifications (id, user_id, ride_id, type, message, read) VALUES (gen_random_uuid(), :userId, :rideId, :type, :message, false)",
        [
          { name: "userId", value: { stringValue: riderId } },
          { name: "rideId", value: { stringValue: rideId } },
          { name: "type", value: { stringValue: notificationType } },
          { name: "message", value: { stringValue: message } },
        ]
      );
    }
  }

  return {
    type,
    rideId,
    notified: [driverId, ...riderIds].filter(Boolean).length,
  };
};
