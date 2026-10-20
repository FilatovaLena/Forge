CREATE TABLE `interests` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`project` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interest_user_project` ON `interests` (`user`,`project`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`interest` text NOT NULL,
	`sender` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`interest`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`location` text NOT NULL,
	`stage` text NOT NULL,
	`arrangement` text NOT NULL,
	`description` text NOT NULL,
	`needs` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `saved` (
	`user` text NOT NULL,
	`project` text NOT NULL,
	PRIMARY KEY(`user`, `project`),
	FOREIGN KEY (`user`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`brings` text DEFAULT '' NOT NULL,
	`looking` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'Entrepreneur' NOT NULL
);
