import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Users ──
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  cognitoId: varchar("cognito_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  stripeConnectAccountId: varchar("stripe_connect_account_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Rides ──
export const rides = pgTable("rides", {
  id: uuid("id").defaultRandom().primaryKey(),
  driverId: uuid("driver_id")
    .references(() => users.id)
    .notNull(),
  originName: varchar("origin_name", { length: 500 }).notNull(),
  originLat: doublePrecision("origin_lat").notNull(),
  originLng: doublePrecision("origin_lng").notNull(),
  destName: varchar("dest_name", { length: 500 }).notNull(),
  destLat: doublePrecision("dest_lat").notNull(),
  destLng: doublePrecision("dest_lng").notNull(),
  departureTime: timestamp("departure_time").notNull(),
  totalSeats: integer("total_seats").notNull(),
  availableSeats: integer("available_seats").notNull(),
  pricePerSeat: integer("price_per_seat").notNull(), // cents
  description: text("description"),
  status: text("status").default("open").notNull().$type<"open" | "full" | "in_progress" | "completed" | "cancelled">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Ride Requests ──
export const rideRequests = pgTable("ride_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  rideId: uuid("ride_id")
    .references(() => rides.id)
    .notNull(),
  riderId: uuid("rider_id")
    .references(() => users.id)
    .notNull(),
  status: text("status").default("pending").notNull().$type<"pending" | "accepted" | "rejected" | "cancelled">(),
  pickupName: varchar("pickup_name", { length: 500 }),
  pickupLat: doublePrecision("pickup_lat"),
  pickupLng: doublePrecision("pickup_lng"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  amountCents: integer("amount_cents").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Notifications ──
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  rideId: uuid("ride_id").references(() => rides.id),
  type: varchar("type", { length: 50 }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Ride Messages ──
export const rideMessages = pgTable("ride_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  rideId: uuid("ride_id")
    .references(() => rides.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Relations ──
export const usersRelations = relations(users, ({ many }) => ({
  rides: many(rides),
  rideRequests: many(rideRequests),
  notifications: many(notifications),
  rideMessages: many(rideMessages),
}));

export const ridesRelations = relations(rides, ({ one, many }) => ({
  driver: one(users, {
    fields: [rides.driverId],
    references: [users.id],
  }),
  requests: many(rideRequests),
  notifications: many(notifications),
  messages: many(rideMessages),
}));

export const rideRequestsRelations = relations(rideRequests, ({ one }) => ({
  ride: one(rides, {
    fields: [rideRequests.rideId],
    references: [rides.id],
  }),
  rider: one(users, {
    fields: [rideRequests.riderId],
    references: [users.id],
  }),
}));

export const rideMessagesRelations = relations(rideMessages, ({ one }) => ({
  ride: one(rides, {
    fields: [rideMessages.rideId],
    references: [rides.id],
  }),
  user: one(users, {
    fields: [rideMessages.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  ride: one(rides, {
    fields: [notifications.rideId],
    references: [rides.id],
  }),
}));
