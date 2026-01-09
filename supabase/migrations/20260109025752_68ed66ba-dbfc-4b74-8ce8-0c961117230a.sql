-- Set REPLICA IDENTITY FULL for all tables to ensure complete row data in realtime updates
ALTER TABLE public.expenses REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.tags REPLICA IDENTITY FULL;
ALTER TABLE public.cards REPLICA IDENTITY FULL;
ALTER TABLE public.agreements REPLICA IDENTITY FULL;
ALTER TABLE public.settlements REPLICA IDENTITY FULL;