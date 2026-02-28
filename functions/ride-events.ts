import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import {
  SchedulerClient,
  CreateScheduleCommand,
} from "@aws-sdk/client-scheduler";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { EventBridgeEvent } from "aws-lambda";

const rdsClient = new RDSDataClient({});
const schedulerClient = new SchedulerClient({});
const sesClient = new SESClient({});

const DATABASE_ARN = process.env.DATABASE_ARN || "";
const DATABASE_SECRET_ARN = process.env.DATABASE_SECRET_ARN || "";
const DATABASE_NAME = process.env.DATABASE_NAME || "clemson_rideshare";
const SCHEDULER_TARGET_ARN = process.env.RIDE_SCHEDULER_ARN || "";
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN || "";
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

async function getUserEmail(userId: string): Promise<string | undefined> {
  const result = await executeSQL(
    "SELECT email, name FROM users WHERE id = :userId",
    [{ name: "userId", value: { stringValue: userId } }]
  );
  return result.records?.[0]?.[0]?.stringValue;
}

async function getUserName(userId: string): Promise<string> {
  const result = await executeSQL(
    "SELECT name FROM users WHERE id = :userId",
    [{ name: "userId", value: { stringValue: userId } }]
  );
  return result.records?.[0]?.[0]?.stringValue || "A rider";
}

type RideEvent = {
  source: string;
  type: string;
  rideId: string;
  driverId?: string;
  riderId?: string;
  departureTime?: string;
};

export const handler = async (
  event: EventBridgeEvent<string, RideEvent>
) => {
  console.log("Ride event received:", JSON.stringify(event));

  const detail = event.detail;

  switch (detail.type) {
    case "ride.created": {
      // Schedule reminders for the ride
      if (detail.departureTime && detail.rideId) {
        const departure = new Date(detail.departureTime);

        // Schedule 24h reminder
        const reminder24h = new Date(departure.getTime() - 24 * 60 * 60 * 1000);
        if (reminder24h > new Date()) {
          await createSchedule(
            `ride-${detail.rideId}-24h`,
            reminder24h,
            { type: "24h_reminder" as const, rideId: detail.rideId }
          );
        }

        // Schedule 2h reminder
        const reminder2h = new Date(departure.getTime() - 2 * 60 * 60 * 1000);
        if (reminder2h > new Date()) {
          await createSchedule(
            `ride-${detail.rideId}-2h`,
            reminder2h,
            { type: "2h_reminder" as const, rideId: detail.rideId }
          );
        }

        // Schedule departure notification
        if (departure > new Date()) {
          await createSchedule(
            `ride-${detail.rideId}-departure`,
            departure,
            { type: "departure" as const, rideId: detail.rideId }
          );
        }
      }
      break;
    }

    case "ride.request.submitted": {
      // DB notification is created directly in the server action for instant delivery.
      // Lambda only handles async email notification.
      if (detail.driverId && detail.rideId) {
        const driverEmail = await getUserEmail(detail.driverId);
        const riderName = detail.riderId ? await getUserName(detail.riderId) : "A rider";
        if (driverEmail) {
          await sendEmail(
            driverEmail,
            "New ride request on TigerRide",
            `<h2>New Ride Request</h2>
            <p><strong>${riderName}</strong> has requested to join your ride!</p>
            <p><a href="${SITE_URL}/my-rides">View your rides</a> to accept or decline.</p>
            <p style="color:#999;font-size:12px">TigerRide — Clemson University Rideshare</p>`
          );
        }
      }
      break;
    }

    case "ride.request.accepted": {
      // Notify the rider that their request was accepted
      if (detail.riderId && detail.rideId) {
        await executeSQL(
          "INSERT INTO notifications (id, user_id, ride_id, type, message, read) VALUES (gen_random_uuid(), :userId, :rideId, 'request_accepted', 'Your ride request has been accepted! Your payment hold will be captured when the ride is completed.', false)",
          [
            { name: "userId", value: { stringValue: detail.riderId } },
            { name: "rideId", value: { stringValue: detail.rideId } },
          ]
        );

        // Email the rider
        const riderEmail = await getUserEmail(detail.riderId);
        if (riderEmail) {
          await sendEmail(
            riderEmail,
            "Your ride request was accepted!",
            `<h2>Request Accepted</h2>
            <p>Your ride request has been accepted! Your payment hold will be captured when the ride is completed.</p>
            <p><a href="${SITE_URL}/rides/${detail.rideId}">View ride details</a></p>
            <p style="color:#999;font-size:12px">TigerRide — Clemson University Rideshare</p>`
          );
        }
      }
      break;
    }

    case "ride.completed": {
      // Notify all riders that the ride is complete
      if (detail.rideId) {
        const ridersResult = await executeSQL(
          "SELECT rr.rider_id, u.email FROM ride_requests rr JOIN users u ON u.id = rr.rider_id WHERE rr.ride_id = :rideId AND rr.status = 'accepted'",
          [{ name: "rideId", value: { stringValue: detail.rideId } }]
        );

        for (const record of ridersResult.records || []) {
          const riderId = record[0]?.stringValue;
          const riderEmail = record[1]?.stringValue;
          if (riderId) {
            await executeSQL(
              "INSERT INTO notifications (id, user_id, ride_id, type, message, read) VALUES (gen_random_uuid(), :userId, :rideId, 'ride_completed', 'Your ride has been completed! Payment has been processed.', false)",
              [
                { name: "userId", value: { stringValue: riderId } },
                { name: "rideId", value: { stringValue: detail.rideId } },
              ]
            );

            if (riderEmail) {
              await sendEmail(
                riderEmail,
                "Ride completed — payment processed",
                `<h2>Ride Completed</h2>
                <p>Your ride has been completed and your payment has been processed.</p>
                <p><a href="${SITE_URL}/my-rides">View your rides</a></p>
                <p style="color:#999;font-size:12px">TigerRide — Clemson University Rideshare</p>`
              );
            }
          }
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${detail.type}`);
  }

  return { processed: true };
};

async function createSchedule(
  name: string,
  scheduleTime: Date,
  payload: { type: "24h_reminder" | "2h_reminder" | "departure"; rideId: string }
) {
  try {
    const command = new CreateScheduleCommand({
      Name: name,
      ScheduleExpression: `at(${scheduleTime.toISOString().replace(/\.\d{3}Z$/, "")})`,
      ScheduleExpressionTimezone: "America/New_York",
      FlexibleTimeWindow: { Mode: "OFF" },
      Target: {
        Arn: SCHEDULER_TARGET_ARN,
        RoleArn: SCHEDULER_ROLE_ARN,
        Input: JSON.stringify(payload),
      },
      ActionAfterCompletion: "DELETE",
    });

    await schedulerClient.send(command);
    console.log(`Scheduled ${name} for ${scheduleTime.toISOString()}`);
  } catch (err) {
    console.error(`Failed to schedule ${name}:`, err);
  }
}
