-- Add missing columns to consultation_requests table for video consultations and payments
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text';
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS video_room_id text;
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS payment_paid boolean DEFAULT false;
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS payment_amount integer DEFAULT 0;