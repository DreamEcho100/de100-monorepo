CREATE TYPE "public"."course_enrollment_status" AS ENUM('active', 'completed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."course_lesson_visibility" AS ENUM('preview', 'enrolled', 'private');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."file_artifact_group_kind" AS ENUM('hls', 'hls-encrypted', 'drm', 'image-responsive', 'audio-preview', 'document-preview', 'custom');--> statement-breakpoint
CREATE TYPE "public"."file_artifact_kind" AS ENUM('hls-master-manifest', 'hls-rendition-manifest', 'hls-segment', 'hls-key', 'poster', 'caption', 'metadata', 'thumbnail', 'responsive-image', 'waveform', 'audio-preview', 'document-preview', 'drm-manifest', 'drm-license-hint', 'custom');--> statement-breakpoint
CREATE TYPE "public"."file_caption_track_kind" AS ENUM('captions', 'subtitles');--> statement-breakpoint
CREATE TYPE "public"."file_hls_protection_mode" AS ENUM('signed-session', 'app-proxy', 'public-gated', 'per-object-signed-url', 'signed-cookie', 'aes-128', 'drm');--> statement-breakpoint
CREATE TYPE "public"."file_kind" AS ENUM('image', 'video', 'audio', 'document', 'file');--> statement-breakpoint
CREATE TYPE "public"."file_playback_event_kind" AS ENUM('play', 'pause', 'progress', 'seek', 'rendition-change', 'buffering', 'stalled', 'error', 'complete');--> statement-breakpoint
CREATE TYPE "public"."file_playback_session_status" AS ENUM('active', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."file_processing_job_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('draft', 'uploading', 'stored', 'processing', 'ready', 'failed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."file_upload_protocol" AS ENUM('xhr', 'tus', 's3-put', 's3-multipart', 'custom');--> statement-breakpoint
CREATE TYPE "public"."file_upload_session_status" AS ENUM('active', 'paused', 'completing', 'completed', 'aborted', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."file_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "course_enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "course_enrollment_status" DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"visibility" "course_lesson_visibility" DEFAULT 'enrolled' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "course_video_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"file_id" text NOT NULL,
	"artifact_group_id" text,
	"status" "file_status" DEFAULT 'draft' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "course_status" DEFAULT 'draft' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "file_artifact_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"kind" "file_artifact_group_kind" NOT NULL,
	"storage_prefix" text NOT NULL,
	"bucket_name" text,
	"visibility" "file_visibility" NOT NULL,
	"status" "file_status" DEFAULT 'draft' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "file_artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"file_id" text NOT NULL,
	"kind" "file_artifact_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"bucket_name" text,
	"content_type" text NOT NULL,
	"size" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"rendition_label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"status" "file_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "file_artifacts_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "file_caption_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"artifact_group_id" text,
	"kind" "file_caption_track_kind" DEFAULT 'captions' NOT NULL,
	"language" text NOT NULL,
	"label" text NOT NULL,
	"storage_key" text NOT NULL,
	"bucket_name" text,
	"content_type" text DEFAULT 'text/vtt' NOT NULL,
	"metadata" jsonb,
	"status" "file_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "file_caption_tracks_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "file_playback_events" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"artifact_group_id" text,
	"playback_session_id" text,
	"subject_user_id" text,
	"event_kind" "file_playback_event_kind" NOT NULL,
	"position_seconds" double precision,
	"duration_seconds" double precision,
	"buffered_seconds" double precision,
	"rendition_label" text,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_playback_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"artifact_group_id" text NOT NULL,
	"subject_user_id" text,
	"token" text NOT NULL,
	"protection_mode" "file_hls_protection_mode" NOT NULL,
	"status" "file_playback_session_status" DEFAULT 'active' NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_playback_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "file_processing_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" "file_processing_job_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error" jsonb,
	"run_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_upload_parts" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"file_id" text NOT NULL,
	"part_number" integer NOT NULL,
	"size" bigint NOT NULL,
	"etag" text,
	"checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_upload_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"user_id" text,
	"protocol" "file_upload_protocol" NOT NULL,
	"status" "file_upload_session_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"kind" text NOT NULL,
	"storage_key" text NOT NULL,
	"bucket_name" text,
	"content_type" text NOT NULL,
	"size" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"metadata" jsonb,
	"status" "file_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "file_variants_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"file_name" text NOT NULL,
	"storage_key" text NOT NULL,
	"bucket_name" text,
	"content_type" text NOT NULL,
	"kind" "file_kind" NOT NULL,
	"size" bigint NOT NULL,
	"visibility" "file_visibility" NOT NULL,
	"status" "file_status" DEFAULT 'draft' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "todo" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_chapters" ADD CONSTRAINT "course_chapters_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_chapter_id_course_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."course_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_video_assets" ADD CONSTRAINT "course_video_assets_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_video_assets" ADD CONSTRAINT "course_video_assets_lesson_id_course_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_video_assets" ADD CONSTRAINT "course_video_assets_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_video_assets" ADD CONSTRAINT "course_video_assets_artifact_group_id_file_artifact_groups_id_fk" FOREIGN KEY ("artifact_group_id") REFERENCES "public"."file_artifact_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_artifact_groups" ADD CONSTRAINT "file_artifact_groups_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_artifacts" ADD CONSTRAINT "file_artifacts_group_id_file_artifact_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."file_artifact_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_artifacts" ADD CONSTRAINT "file_artifacts_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_caption_tracks" ADD CONSTRAINT "file_caption_tracks_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_caption_tracks" ADD CONSTRAINT "file_caption_tracks_artifact_group_id_file_artifact_groups_id_fk" FOREIGN KEY ("artifact_group_id") REFERENCES "public"."file_artifact_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_playback_events" ADD CONSTRAINT "file_playback_events_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_playback_events" ADD CONSTRAINT "file_playback_events_artifact_group_id_file_artifact_groups_id_fk" FOREIGN KEY ("artifact_group_id") REFERENCES "public"."file_artifact_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_playback_events" ADD CONSTRAINT "file_playback_events_playback_session_id_file_playback_sessions_id_fk" FOREIGN KEY ("playback_session_id") REFERENCES "public"."file_playback_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_playback_events" ADD CONSTRAINT "file_playback_events_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_playback_sessions" ADD CONSTRAINT "file_playback_sessions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_playback_sessions" ADD CONSTRAINT "file_playback_sessions_artifact_group_id_file_artifact_groups_id_fk" FOREIGN KEY ("artifact_group_id") REFERENCES "public"."file_artifact_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_playback_sessions" ADD CONSTRAINT "file_playback_sessions_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_processing_jobs" ADD CONSTRAINT "file_processing_jobs_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_upload_parts" ADD CONSTRAINT "file_upload_parts_session_id_file_upload_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."file_upload_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_upload_parts" ADD CONSTRAINT "file_upload_parts_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_upload_sessions" ADD CONSTRAINT "file_upload_sessions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_upload_sessions" ADD CONSTRAINT "file_upload_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_variants" ADD CONSTRAINT "file_variants_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo" ADD CONSTRAINT "todo_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "course_chapters_course_id_idx" ON "course_chapters" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_chapters_course_slug_idx" ON "course_chapters" USING btree ("course_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "course_chapters_course_position_idx" ON "course_chapters" USING btree ("course_id","position");--> statement-breakpoint
CREATE INDEX "course_enrollments_course_id_idx" ON "course_enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_enrollments_user_id_idx" ON "course_enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "course_enrollments_status_idx" ON "course_enrollments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "course_enrollments_course_user_idx" ON "course_enrollments" USING btree ("course_id","user_id");--> statement-breakpoint
CREATE INDEX "course_lessons_course_id_idx" ON "course_lessons" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_lessons_chapter_id_idx" ON "course_lessons" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "course_lessons_visibility_idx" ON "course_lessons" USING btree ("visibility");--> statement-breakpoint
CREATE UNIQUE INDEX "course_lessons_chapter_slug_idx" ON "course_lessons" USING btree ("chapter_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "course_lessons_chapter_position_idx" ON "course_lessons" USING btree ("chapter_id","position");--> statement-breakpoint
CREATE INDEX "course_video_assets_course_id_idx" ON "course_video_assets" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_video_assets_file_id_idx" ON "course_video_assets" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "course_video_assets_artifact_group_id_idx" ON "course_video_assets" USING btree ("artifact_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_video_assets_lesson_id_idx" ON "course_video_assets" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "courses_owner_user_id_idx" ON "courses" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "file_artifact_groups_file_id_idx" ON "file_artifact_groups" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_artifact_groups_kind_idx" ON "file_artifact_groups" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "file_artifact_groups_status_idx" ON "file_artifact_groups" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "file_artifact_groups_file_kind_revision_idx" ON "file_artifact_groups" USING btree ("file_id","kind","revision");--> statement-breakpoint
CREATE INDEX "file_artifacts_group_id_idx" ON "file_artifacts" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "file_artifacts_file_id_idx" ON "file_artifacts" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_artifacts_kind_idx" ON "file_artifacts" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "file_artifacts_status_idx" ON "file_artifacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "file_caption_tracks_file_id_idx" ON "file_caption_tracks" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_caption_tracks_artifact_group_id_idx" ON "file_caption_tracks" USING btree ("artifact_group_id");--> statement-breakpoint
CREATE INDEX "file_caption_tracks_language_idx" ON "file_caption_tracks" USING btree ("language");--> statement-breakpoint
CREATE INDEX "file_caption_tracks_status_idx" ON "file_caption_tracks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "file_playback_events_file_id_idx" ON "file_playback_events" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_playback_events_artifact_group_id_idx" ON "file_playback_events" USING btree ("artifact_group_id");--> statement-breakpoint
CREATE INDEX "file_playback_events_playback_session_id_idx" ON "file_playback_events" USING btree ("playback_session_id");--> statement-breakpoint
CREATE INDEX "file_playback_events_subject_user_id_idx" ON "file_playback_events" USING btree ("subject_user_id");--> statement-breakpoint
CREATE INDEX "file_playback_events_event_kind_idx" ON "file_playback_events" USING btree ("event_kind");--> statement-breakpoint
CREATE INDEX "file_playback_events_occurred_at_idx" ON "file_playback_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "file_playback_sessions_file_id_idx" ON "file_playback_sessions" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_playback_sessions_artifact_group_id_idx" ON "file_playback_sessions" USING btree ("artifact_group_id");--> statement-breakpoint
CREATE INDEX "file_playback_sessions_subject_user_id_idx" ON "file_playback_sessions" USING btree ("subject_user_id");--> statement-breakpoint
CREATE INDEX "file_playback_sessions_status_idx" ON "file_playback_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "file_playback_sessions_expires_at_idx" ON "file_playback_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "file_processing_jobs_file_id_idx" ON "file_processing_jobs" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_processing_jobs_status_idx" ON "file_processing_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "file_processing_jobs_run_after_idx" ON "file_processing_jobs" USING btree ("run_after");--> statement-breakpoint
CREATE INDEX "file_upload_parts_file_id_idx" ON "file_upload_parts" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "file_upload_parts_session_part_idx" ON "file_upload_parts" USING btree ("session_id","part_number");--> statement-breakpoint
CREATE INDEX "file_upload_sessions_file_id_idx" ON "file_upload_sessions" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_upload_sessions_user_id_idx" ON "file_upload_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "file_upload_sessions_status_idx" ON "file_upload_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "file_variants_file_id_idx" ON "file_variants" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_variants_status_idx" ON "file_variants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "files_user_id_idx" ON "files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "files_visibility_idx" ON "files" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "files_kind_idx" ON "files" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "todo_user_id_idx" ON "todo" USING btree ("user_id");