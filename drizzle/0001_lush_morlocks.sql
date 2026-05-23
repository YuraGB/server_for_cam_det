PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_shadow_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_user_id` text NOT NULL,
	`email` text,
	`role` text,
	`roles_json` text DEFAULT '[]',
	`permissions_json` text DEFAULT '[]' NOT NULL,
	`auth_issuer` text NOT NULL,
	`last_login_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_shadow_users`("id", "external_user_id", "email", "role", "roles_json", "permissions_json", "auth_issuer", "last_login_at", "created_at", "updated_at") SELECT "id", "external_user_id", "email", "role", "roles_json", "permissions_json", "auth_issuer", "last_login_at", "created_at", "updated_at" FROM `shadow_users`;--> statement-breakpoint
DROP TABLE `shadow_users`;--> statement-breakpoint
ALTER TABLE `__new_shadow_users` RENAME TO `shadow_users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `shadow_users_external_user_id_unique` ON `shadow_users` (`external_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `shadow_users_email_unique` ON `shadow_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_idx` ON `shadow_users` (`email`);