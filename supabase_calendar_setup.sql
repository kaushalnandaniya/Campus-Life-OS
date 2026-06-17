-- Add Google Calendar Event ID column to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS gcal_event_id TEXT;
