import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const rdsClient = new RDSDataClient({});
const sesClient = new SESClient({});
const DATABASE_ARN = process.env.DATABASE_ARN || "";
const DATABASE_SECRET_ARN = process.env.DATABASE_SECRET_ARN || "";
const DATABASE_NAME = process.env.DATABASE_NAME || "clemson_rideshare";
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || "";
const SITE_URL = process.env.SITE_URL || "";

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

async function sendEmail(to: string, subject: string, htmlBody: string) {
  if (!SES_FROM_EMAIL || !to) return;
  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: SES_FROM_EMAIL,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Html: { Data: htmlBody } },
        },
      })
    );
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
  }
}

type SchedulerEvent = {
  type: "24h_reminder" | "2h_reminder" | "departure";
  rideId: string;
};

export const handler = async (event: SchedulerEvent) => {
  console.log("Ride scheduler event:", JSON.stringify(event));

  const { type, rideId } = event;

  // Check that the ride is still active (include driver email)
  const rideResult = await executeSQL(
    "SELECT r.id, r.status, r.driver_id, u.email FROM rides r JOIN users u ON u.id = r.driver_id WHERE r.id = :rideId",
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
  const driverEmail = rideResult.records[0][3]?.stringValue;

  // Get all accepted riders for this ride (include email)
  const ridersResult = await executeSQL(
    "SELECT rr.rider_id, u.email FROM ride_requests rr JOIN users u ON u.id = rr.rider_id WHERE rr.ride_id = :rideId AND rr.status = 'accepted'",
    [{ name: "rideId", value: { stringValue: rideId } }]
  );

  const riders =
    ridersResult.records?.map((r) => ({
      id: r[0]?.stringValue,
      email: r[1]?.stringValue,
    })).filter((r) => r.id) || [];
  const riderIds = riders.map((r) => r.id);

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
  for (const rider of riders) {
    if (rider.id) {
      await executeSQL(
        "INSERT INTO notifications (id, user_id, ride_id, type, message, read) VALUES (gen_random_uuid(), :userId, :rideId, :type, :message, false)",
        [
          { name: "userId", value: { stringValue: rider.id } },
          { name: "rideId", value: { stringValue: rideId } },
          { name: "type", value: { stringValue: notificationType } },
          { name: "message", value: { stringValue: message } },
        ]
      );
    }
  }

  // Send SES emails to all participants
  const emailSubject = `TigerRide: ${message}`;
  const emailHtml = `<h2>${notificationType === "departure" ? "Departure Time!" : "Ride Reminder"}</h2>
    <p>${message}</p>
    <p><a href="${SITE_URL}/rides/${rideId}">View ride details</a></p>
    <p style="color:#999;font-size:12px">TigerRide — Clemson University Rideshare</p>`;

  if (driverEmail) {
    await sendEmail(driverEmail, emailSubject, emailHtml);
  }
  for (const rider of riders) {
    if (rider.email) {
      await sendEmail(rider.email, emailSubject, emailHtml);
    }
  }

  return {
    type,
    rideId,
    notified: [driverId, ...riderIds].filter(Boolean).length,
  };
};
