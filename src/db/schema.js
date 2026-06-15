import { pgTable, uuid, text, timestamp, numeric, jsonb, integer, date, customType } from "drizzle-orm/pg-core";

const pgVector = customType({
  dataType() {
    return "vector(768)";
  },
});

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessName: text("business_name").notNull().unique(),
  ownerId: uuid("owner_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionStatus: text("stripe_subscription_status").default("trialing"),
  slug: text("slug").unique(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
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
  customResendKey: text("custom_resend_key"),
  n8nWebhookUrl: text("n8n_webhook_url"),
  bookingBasePrice: numeric("booking_base_price", { precision: 10, scale: 2 }).default("100.00"),
  bookingPricePerSqft: numeric("booking_price_per_sqft", { precision: 10, scale: 4 }).default("0.0800"),
  bookingMultiplierDeep: numeric("booking_multiplier_deep", { precision: 4, scale: 2 }).default("1.45"),
  bookingMultiplierMoveout: numeric("booking_multiplier_moveout", { precision: 4, scale: 2 }).default("1.60"),
  waTemplateBooking: text("wa_template_booking"),
  waTemplateRoute: text("wa_template_route"),
  waTemplateReview: text("wa_template_review"),
  timezone: text("timezone").default("America/New_York"),
  ownerPhone: text("owner_phone"),
  aiProvider: text("ai_provider").default("ollama"),
  geminiModel: text("gemini_model").default("gemini-1.5-flash"),
  geminiKey: text("gemini_key"),
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
  staffEmail: text("staff_email"),
  phone: text("phone"),
  payoutPct: numeric("payout_pct").default("40"),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  birthday: date("birthday"),
  embedding: pgVector("embedding"),
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
  embedding: pgVector("embedding"),
});

export const weeklyAudits = pgTable("weekly_audits", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  totalRevenue: numeric("total_revenue").default("0.00"),
  jobsCompleted: integer("jobs_completed").default(0),
  milesSaved: numeric("miles_saved").default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const crewLocations = pgTable("crew_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  staffId: uuid("staff_id").references(() => staffProfiles.id, { onDelete: "cascade" }).notNull().unique(),
  lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const staffPayouts = pgTable("staff_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  staffId: uuid("staff_id").references(() => staffProfiles.id, { onDelete: "cascade" }).notNull(),
  workerName: text("worker_name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("Zelle"),
  referenceNote: text("reference_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tableName: text("table_name").notNull(),
  recordId: uuid("record_id").notNull(),
  action: text("action").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  changedBy: uuid("changed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
