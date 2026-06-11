CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"action" text NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"name" text,
	"phone" text,
	"email" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"birthday" date,
	"embedding" vector(768)
);
--> statement-breakpoint
CREATE TABLE "crew_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(9, 6) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crew_locations_staff_id_unique" UNIQUE("staff_id")
);
--> statement-breakpoint
CREATE TABLE "elevore_missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"client_name" text,
	"client_phone" text,
	"client_email" text,
	"address" text,
	"service_type" text,
	"status" text,
	"scheduled_date" text,
	"total_price" numeric,
	"client_rating" numeric,
	"specs" jsonb,
	"team_assigned" text,
	"check_in_time" text,
	"check_out_time" text,
	"final_signature" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"embedding" vector(768)
);
--> statement-breakpoint
CREATE TABLE "staff_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"worker_name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" text DEFAULT 'Zelle' NOT NULL,
	"reference_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"role" text DEFAULT 'staff',
	"passcode" text DEFAULT 'staff123' NOT NULL,
	"wallet_balance" numeric(10, 2) DEFAULT '0.00',
	"total_earned" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"staff_email" text,
	"phone" text,
	"payout_pct" numeric DEFAULT '40'
);
--> statement-breakpoint
CREATE TABLE "tenant_settings" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"zelle_phone" text DEFAULT '(407) 952-4228',
	"business_full_name" text DEFAULT 'Elevore Premium Services',
	"staff_pay_pct" numeric(4, 2) DEFAULT '0.40',
	"google_review_link" text DEFAULT 'https://g.page/r/review',
	"currency" text DEFAULT 'USD',
	"monthly_goal" numeric(10, 2) DEFAULT '15000.00',
	"admin_pin" text DEFAULT '2026',
	"addons" jsonb DEFAULT '[{"id":"oven","en":"Inside Oven","p":35},{"id":"fridge","en":"Inside Fridge","p":30},{"id":"windows","en":"Windows","p":50},{"id":"pethair","en":"Pet Hair","p":25},{"id":"garage","en":"Garage","p":40}]'::jsonb,
	"quick_jobs" jsonb DEFAULT '[{"id":"tv","en":"Mount TV","p":150},{"id":"door","en":"Install Door","p":200},{"id":"patch","en":"Drywall Patch","p":180},{"id":"shelves","en":"Shelving","p":100},{"id":"lock","en":"Lock Change","p":85},{"id":"paint","en":"Paint Touch-up","p":120},{"id":"faucet","en":"Faucet Install","p":130},{"id":"caulk","en":"Caulking","p":75}]'::jsonb,
	"membership_plans" jsonb DEFAULT '[{"id":"none","name":"None","price":0,"color":"#6b7280"},{"id":"basic","name":"Basic","price":199,"color":"#6b7280","perks":["2 Cleans/mo","5% off","Priority"]},{"id":"premium","name":"Premium","price":349,"color":"#3b82f6","perks":["4 Cleans/mo","10% off","Free oven"]},{"id":"vip","name":"VIP","price":549,"color":"#fbbf24","perks":["6 Cleans/mo","15% off","All add-ons","Dedicated team"]}]'::jsonb,
	"custom_resend_key" text,
	"n8n_webhook_url" text,
	"booking_base_price" numeric(10, 2) DEFAULT '100.00',
	"booking_price_per_sqft" numeric(10, 4) DEFAULT '0.0800',
	"booking_multiplier_deep" numeric(4, 2) DEFAULT '1.45',
	"booking_multiplier_moveout" numeric(4, 2) DEFAULT '1.60',
	"wa_template_booking" text,
	"wa_template_route" text,
	"wa_template_review" text,
	"timezone" text DEFAULT 'America/New_York',
	"owner_phone" text
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_status" text DEFAULT 'trialing',
	"slug" text,
	"trial_ends_at" timestamp with time zone,
	CONSTRAINT "tenants_business_name_unique" UNIQUE("business_name"),
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "weekly_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"week_number" integer NOT NULL,
	"year" integer NOT NULL,
	"total_revenue" numeric DEFAULT '0.00',
	"jobs_completed" integer DEFAULT 0,
	"miles_saved" numeric DEFAULT '0.00',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_locations" ADD CONSTRAINT "crew_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_locations" ADD CONSTRAINT "crew_locations_staff_id_staff_profiles_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevore_missions" ADD CONSTRAINT "elevore_missions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_payouts" ADD CONSTRAINT "staff_payouts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_payouts" ADD CONSTRAINT "staff_payouts_staff_id_staff_profiles_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_audits" ADD CONSTRAINT "weekly_audits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;