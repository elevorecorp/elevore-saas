import { pgTable, uuid, text, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessName: text("business_name").notNull().unique(),
  ownerId: uuid("owner_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionStatus: text("stripe_subscription_status").default("trialing"),
});

export const tenantSettings = pgTable("tenant_settings", {
  tenantId: uuid("tenant_id").primaryKey().references(() => tenants.id, { onDelete: "cascade" }),
  zellePhone: text("zelle_phone").default("(407) 952-4228"),
  businessFullName: text("business_full_name").default("Elevore Premium Services"),
  staffPayPct: numeric("staff_pay_pct", { precision: 4, scale: 2 }).default("0.40"),
  googleReviewLink: text("google_review_link").default("https://g.page/r/review"),
  currency: text("currency").default("USD"),
  monthlyGoal: numeric("monthly_goal", { precision: 10, scale: 2 }).default("15000.00"),
  adminPin: text("admin_pin").default("2026"),
  addons: jsonb("addons").default([
    { id: "oven", en: "Inside Oven", p: 35 },
    { id: "fridge", en: "Inside Fridge", p: 30 },
    { id: "windows", en: "Windows", p: 50 },
    { id: "pethair", en: "Pet Hair", p: 25 },
    { id: "garage", en: "Garage", p: 40 }
  ]),
  quickJobs: jsonb("quick_jobs").default([
    { id: "tv", en: "Mount TV", p: 150 },
    { id: "door", en: "Install Door", p: 200 },
    { id: "patch", en: "Drywall Patch", p: 180 },
    { id: "shelves", en: "Shelving", p: 100 },
    { id: "lock", en: "Lock Change", p: 85 },
    { id: "paint", en: "Paint Touch-up", p: 120 },
    { id: "faucet", en: "Faucet Install", p: 130 },
    { id: "caulk", en: "Caulking", p: 75 }
  ]),
  membershipPlans: jsonb("membership_plans").default([
    { id: "none", name: "None", price: 0, color: "#6b7280" },
    { id: "basic", name: "Basic", price: 199, color: "#6b7280", perks: ["2 Cleans/mo", "5% off", "Priority"] },
    { id: "premium", name: "Premium", price: 349, color: "#3b82f6", perks: ["4 Cleans/mo", "10% off", "Free oven"] },
    { id: "vip", name: "VIP", price: 549, color: "#fbbf24", perks: ["6 Cleans/mo", "15% off", "All add-ons", "Dedicated team"] }
  ]),
});

export const staffProfiles = pgTable("staff_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id"),
  name: text("name").notNull(),
  role: text("role").default("staff"),
  passcode: text("passcode").notNull().default("staff123"),
  walletBalance: numeric("wallet_balance", { precision: 10, scale: 2 }).default("0.00"),
  totalEarned: numeric("total_earned", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const elevoreMissions = pgTable("elevore_missions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  clientName: text("client_name"),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  address: text("address"),
  serviceType: text("service_type"),
  status: text("status"),
  scheduledDate: text("scheduled_date"),
  totalPrice: numeric("total_price"),
  clientRating: numeric("client_rating"),
  specs: jsonb("specs"),
  teamAssigned: text("team_assigned"),
  checkInTime: text("check_in_time"),
  checkOutTime: text("check_out_time"),
  finalSignature: text("final_signature"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
