
-- Create brand_settings table
CREATE TABLE public.brand_settings (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'TrackSteel',
  logo_url TEXT,
  font_family TEXT NOT NULL DEFAULT 'Arial',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for brand assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true);

-- Create storage policy for brand assets
CREATE POLICY "Allow public access to brand assets" ON storage.objects
FOR ALL USING (bucket_id = 'brand-assets');

-- Enable Row Level Security
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for brand_settings (public read, admin write)
CREATE POLICY "Anyone can view brand settings" ON public.brand_settings
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can modify brand settings" ON public.brand_settings
FOR ALL USING (auth.role() = 'authenticated');
