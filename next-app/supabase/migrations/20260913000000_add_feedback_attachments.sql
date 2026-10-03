-- Custom app JWTs are checked by server actions. Only service_role can access
-- private attachment metadata or execute the review transaction.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('feedback', 'feedback', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false,
  file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE public.feedback_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.users(id),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL CHECK (length(file_name) BETWEEN 1 AND 255),
  file_size integer NOT NULL CHECK (file_size BETWEEN 1 AND 5242880),
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  published_at timestamptz
);
CREATE INDEX feedback_attachments_submission_idx ON public.feedback_attachments(submission_id);
CREATE INDEX feedback_attachments_pending_idx ON public.feedback_attachments(created_at) WHERE published_at IS NULL;
ALTER TABLE public.feedback_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feedback_attachments FROM anon, authenticated;
GRANT ALL ON public.feedback_attachments TO service_role;

-- A durable queue also handles cascading submission/assignment deletion.
CREATE TABLE public.feedback_storage_cleanup (
  storage_path text PRIMARY KEY,
  delete_after timestamptz NOT NULL
);
ALTER TABLE public.feedback_storage_cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feedback_storage_cleanup FROM anon, authenticated;
GRANT ALL ON public.feedback_storage_cleanup TO service_role;

CREATE FUNCTION public.queue_feedback_file_cleanup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Wait until outstanding signed upload tokens have expired before final deletion.
  INSERT INTO public.feedback_storage_cleanup(storage_path, delete_after)
  VALUES (OLD.storage_path, greatest(now(), OLD.created_at + interval '125 minutes'))
  ON CONFLICT (storage_path) DO NOTHING;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_feedback_file_cleanup() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER feedback_attachment_deleted AFTER DELETE ON public.feedback_attachments
FOR EACH ROW EXECUTE FUNCTION public.queue_feedback_file_cleanup();

CREATE FUNCTION public.save_submission_review(
  p_submission_id uuid, p_teacher_id uuid, p_grade text,
  p_feedback text, p_attachment_ids uuid[]
) RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_submission public.submissions;
  v_count integer;
BEGIN
  SELECT s.* INTO v_submission FROM public.submissions s
  JOIN public.assignments a ON a.id = s.assignment_id
  JOIN public.users u ON u.id = p_teacher_id
  WHERE s.id = p_submission_id AND a.created_by = p_teacher_id AND u.role = 'teacher'
  FOR UPDATE OF s;
  IF NOT FOUND THEN RAISE EXCEPTION 'Review not found or access denied'; END IF;

  IF p_attachment_ids IS NULL OR cardinality(p_attachment_ids) > 3 THEN
    RAISE EXCEPTION 'A review may contain up to 3 PDFs';
  END IF;
  IF p_grade IS NULL THEN
    IF p_feedback IS NOT NULL OR cardinality(p_attachment_ids) <> 0 THEN
      RAISE EXCEPTION 'A grade is required to save feedback';
    END IF;
  ELSIF p_grade !~ '^[0-9]{1,3}$' OR p_grade::numeric > 100 THEN
    RAISE EXCEPTION 'Grade must be a whole number from 0 to 100';
  END IF;

  -- Lock attachments before checking them so cleanup cannot race publication.
  PERFORM 1 FROM public.feedback_attachments
    WHERE id = ANY(p_attachment_ids) FOR UPDATE;
  SELECT count(*) INTO v_count FROM public.feedback_attachments
  WHERE id = ANY(p_attachment_ids) AND submission_id = p_submission_id
    AND verified_at IS NOT NULL
    AND (published_at IS NOT NULL OR (uploaded_by = p_teacher_id AND created_at > now() - interval '24 hours'));
  IF v_count <> cardinality(p_attachment_ids) THEN
    RAISE EXCEPTION 'An attachment is invalid, expired, or belongs to another submission';
  END IF;

  UPDATE public.submissions SET grade = p_grade, numeric_grade = p_grade::numeric,
    feedback = p_feedback WHERE id = p_submission_id RETURNING * INTO v_submission;
  DELETE FROM public.feedback_attachments
    WHERE submission_id = p_submission_id AND published_at IS NOT NULL AND NOT (id = ANY(p_attachment_ids));
  UPDATE public.feedback_attachments SET published_at = coalesce(published_at, now())
    WHERE id = ANY(p_attachment_ids);

  RETURN to_jsonb(v_submission) || jsonb_build_object(
    'assignments', (SELECT jsonb_build_object('title', title) FROM public.assignments WHERE id = v_submission.assignment_id),
    'feedback_attachments', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'file_name', file_name, 'file_size', file_size) ORDER BY created_at), '[]'::jsonb)
      FROM public.feedback_attachments WHERE submission_id = p_submission_id AND published_at IS NOT NULL)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.save_submission_review(uuid, uuid, text, text, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_submission_review(uuid, uuid, text, text, uuid[]) TO service_role;
