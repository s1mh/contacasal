-- Create table for storing spending patterns
CREATE TABLE IF NOT EXISTS spending_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for AI insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  message TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  is_read BOOLEAN DEFAULT FALSE,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE spending_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for spending_patterns
CREATE POLICY "Users can view own spending patterns" 
ON spending_patterns FOR SELECT 
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Users can insert own spending patterns" 
ON spending_patterns FOR INSERT 
WITH CHECK (couple_id = public.get_current_couple_id());

CREATE POLICY "Users can update own spending patterns" 
ON spending_patterns FOR UPDATE 
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Users can delete own spending patterns" 
ON spending_patterns FOR DELETE 
USING (couple_id = public.get_current_couple_id());

-- RLS policies for ai_insights
CREATE POLICY "Users can view own insights" 
ON ai_insights FOR SELECT 
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Users can insert own insights" 
ON ai_insights FOR INSERT 
WITH CHECK (couple_id = public.get_current_couple_id());

CREATE POLICY "Users can update own insights" 
ON ai_insights FOR UPDATE 
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Users can delete own insights" 
ON ai_insights FOR DELETE 
USING (couple_id = public.get_current_couple_id());

-- Create indexes for performance
CREATE INDEX idx_spending_patterns_couple ON spending_patterns(couple_id);
CREATE INDEX idx_ai_insights_couple ON ai_insights(couple_id);
CREATE INDEX idx_ai_insights_created ON ai_insights(created_at DESC);