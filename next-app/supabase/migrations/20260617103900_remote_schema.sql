drop extension if exists "pg_net";

revoke references on table "public"."assignments" from "anon";

revoke trigger on table "public"."assignments" from "anon";

revoke truncate on table "public"."assignments" from "anon";

revoke references on table "public"."assignments" from "authenticated";

revoke trigger on table "public"."assignments" from "authenticated";

revoke truncate on table "public"."assignments" from "authenticated";

revoke references on table "public"."assignments" from "service_role";

revoke trigger on table "public"."assignments" from "service_role";

revoke truncate on table "public"."assignments" from "service_role";

revoke references on table "public"."submissions" from "anon";

revoke trigger on table "public"."submissions" from "anon";

revoke truncate on table "public"."submissions" from "anon";

revoke references on table "public"."submissions" from "authenticated";

revoke trigger on table "public"."submissions" from "authenticated";

revoke truncate on table "public"."submissions" from "authenticated";

revoke references on table "public"."submissions" from "service_role";

revoke trigger on table "public"."submissions" from "service_role";

revoke truncate on table "public"."submissions" from "service_role";

revoke references on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke references on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

alter table "public"."assignments" drop constraint "assignments_created_by_fkey";

alter table "public"."assignments" alter column "title" set data type character varying(255) using "title"::character varying(255);

alter table "public"."submissions" alter column "student_name" set data type character varying(100) using "student_name"::character varying(100);

alter table "public"."users" alter column "full_name" set data type character varying(100) using "full_name"::character varying(100);

alter table "public"."users" alter column "role" set data type character varying(20) using "role"::character varying(20);

alter table "public"."users" alter column "username" set data type character varying(50) using "username"::character varying(50);

CREATE INDEX idx_assignments_created_by ON public.assignments USING btree (created_by);

CREATE INDEX idx_submissions_assignment_id ON public.submissions USING btree (assignment_id);

CREATE INDEX idx_users_role ON public.users USING btree (role);

alter table "public"."assignments" add constraint "assignments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."assignments" validate constraint "assignments_created_by_fkey";

grant delete on table "public"."assignments" to "anon";

grant insert on table "public"."assignments" to "anon";

grant select on table "public"."assignments" to "anon";

grant update on table "public"."assignments" to "anon";

grant delete on table "public"."assignments" to "authenticated";

grant insert on table "public"."assignments" to "authenticated";

grant select on table "public"."assignments" to "authenticated";

grant update on table "public"."assignments" to "authenticated";

grant delete on table "public"."submissions" to "anon";

grant insert on table "public"."submissions" to "anon";

grant select on table "public"."submissions" to "anon";

grant update on table "public"."submissions" to "anon";

grant delete on table "public"."submissions" to "authenticated";

grant insert on table "public"."submissions" to "authenticated";

grant select on table "public"."submissions" to "authenticated";

grant update on table "public"."submissions" to "authenticated";

grant select on table "public"."users" to "anon";

grant select on table "public"."users" to "authenticated";


