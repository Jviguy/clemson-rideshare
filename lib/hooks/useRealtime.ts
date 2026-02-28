"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mqtt from "mqtt";

const ENDPOINT = process.env.NEXT_PUBLIC_REALTIME_ENDPOINT || "";
const AUTHORIZER = process.env.NEXT_PUBLIC_REALTIME_AUTHORIZER || "";
const APP_NAME = process.env.NEXT_PUBLIC_SST_APP_NAME || "clemson-rideshare";
const STAGE = process.env.NEXT_PUBLIC_SST_STAGE || "dev";

const PREFIX = `${APP_NAME}/${STAGE}`;

interface RealtimeState {
  userId: string | null;
  connected: boolean;
}

/**
 * Hook that connects to AWS IoT Core via MQTT over WebSocket.
 * Subscribes to topics and calls handlers when messages arrive.
 *
 * @param onNotification - called when a notification signal arrives
 * @param messageTopics - array of rideIds to subscribe to for chat messages
 * @param onMessage - called when a message signal arrives (rideId passed as arg)
 */
export function useRealtime(
  onNotification?: () => void,
  messageTopics?: string[],
  onMessage?: (rideId: string) => void
) {
  const [state, setState] = useState<RealtimeState>({
    userId: null,
    connected: false,
  });
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const onNotificationRef = useRef(onNotification);
  const onMessageRef = useRef(onMessage);
  const messageTopicsRef = useRef(messageTopics);

  // Keep refs up to date
  onNotificationRef.current = onNotification;
  onMessageRef.current = onMessage;
  messageTopicsRef.current = messageTopics;

  useEffect(() => {
    if (!ENDPOINT || !AUTHORIZER) return;

    let cancelled = false;
    let mqttClient: mqtt.MqttClient | null = null;

    async function connect() {
      try {
        // Fetch token and userId from our API
        const res = await fetch("/api/auth/realtime");
        if (!res.ok) return; // Not logged in

        const { token, userId } = await res.json();
        if (cancelled) return;

        setState((s) => ({ ...s, userId }));

        // Connect to IoT Core via MQTT over WebSocket
        mqttClient = mqtt.connect(`wss://${ENDPOINT}/mqtt`, {
          username: `?x-amz-customauthorizer-name=${AUTHORIZER}`,
          password: token,
          protocolVersion: 5,
          reconnectPeriod: 5000,
          connectTimeout: 10000,
        });

        clientRef.current = mqttClient;

        mqttClient.on("connect", () => {
          if (cancelled) return;
          setState((s) => ({ ...s, connected: true }));

          // Subscribe to notification topic
          mqttClient!.subscribe(`${PREFIX}/notifications/${userId}`);

          // Subscribe to message topics
          if (messageTopicsRef.current) {
            for (const rideId of messageTopicsRef.current) {
              mqttClient!.subscribe(`${PREFIX}/messages/${rideId}`);
            }
          }
        });

        mqttClient.on("message", (topic: string) => {
          if (topic.startsWith(`${PREFIX}/notifications/`)) {
            onNotificationRef.current?.();
          } else if (topic.startsWith(`${PREFIX}/messages/`)) {
            const rideId = topic.replace(`${PREFIX}/messages/`, "");
            onMessageRef.current?.(rideId);
          }
        });

        mqttClient.on("disconnect", () => {
          setState((s) => ({ ...s, connected: false }));
        });

        mqttClient.on("error", (err: Error) => {
          console.error("MQTT error:", err);
        });
      } catch (err) {
        console.error("Realtime connect error:", err);
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (mqttClient) {
        mqttClient.end(true);
        clientRef.current = null;
      }
      setState({ userId: null, connected: false });
    };
  }, []);

  // Handle dynamic message topic subscriptions
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !state.connected) return;

    if (messageTopics) {
      for (const rideId of messageTopics) {
        client.subscribe(`${PREFIX}/messages/${rideId}`);
      }
    }
  }, [messageTopics, state.connected]);

  return state;
}
