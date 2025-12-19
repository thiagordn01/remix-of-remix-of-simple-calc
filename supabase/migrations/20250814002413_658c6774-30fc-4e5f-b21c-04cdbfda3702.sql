-- Create user_sessions table
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  os_name TEXT,
  browser_name TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_activities table
CREATE TABLE public.user_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.user_sessions(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('page_view', 'audio_generated', 'login', 'logout')),
  page_path TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - Only master can access analytics data
CREATE POLICY "Master can view all sessions" 
ON public.user_sessions 
FOR SELECT 
USING (is_master());

CREATE POLICY "Master can insert sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (true); -- Anyone can insert their own session

CREATE POLICY "Master can update sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (is_master());

CREATE POLICY "Master can delete sessions" 
ON public.user_sessions 
FOR DELETE 
USING (is_master());

CREATE POLICY "Master can view all activities" 
ON public.user_activities 
FOR SELECT 
USING (is_master());

CREATE POLICY "Master can insert activities" 
ON public.user_activities 
FOR INSERT 
WITH CHECK (true); -- Anyone can insert their own activities

CREATE POLICY "Master can update activities" 
ON public.user_activities 
FOR UPDATE 
USING (is_master());

CREATE POLICY "Master can delete activities" 
ON public.user_activities 
FOR DELETE 
USING (is_master());

-- Create indexes for better performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_started_at ON public.user_sessions(started_at);
CREATE INDEX idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX idx_user_activities_session_id ON public.user_activities(session_id);
CREATE INDEX idx_user_activities_timestamp ON public.user_activities(timestamp);
CREATE INDEX idx_user_activities_activity_type ON public.user_activities(activity_type);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_sessions_updated_at
BEFORE UPDATE ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();