import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";

const iot = new IoTDataPlaneClient({});

const prefix = `${process.env.SST_APP_NAME || "clemson-rideshare"}/${process.env.SST_STAGE || "dev"}`;

/** Push a notification update to a user's browser via IoT Core */
export async function pushNotification(userId: string, data: object) {
  try {
    await iot.send(
      new PublishCommand({
        topic: `${prefix}/notifications/${userId}`,
        payload: Buffer.from(JSON.stringify(data)),
      })
    );
  } catch (err) {
    console.error("IoT publish (notification) error:", err);
  }
}

/** Push a message update to all subscribers of a ride's chat */
export async function pushMessage(rideId: string, data: object) {
  try {
    await iot.send(
      new PublishCommand({
        topic: `${prefix}/messages/${rideId}`,
        payload: Buffer.from(JSON.stringify(data)),
      })
    );
  } catch (err) {
    console.error("IoT publish (message) error:", err);
  }
}
