CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: create_default_profiles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_profiles() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO public.profiles (couple_id, name, color, avatar_index, position)
  VALUES 
    (NEW.id, 'Pessoa 1', '#F5A9B8', 1, 1),
    (NEW.id, 'Pessoa 2', '#A8D5BA', 2, 2);
  RETURN NEW;
END;
$$;


--
-- Name: create_default_tags(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_tags() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO public.tags (couple_id, name, icon, color)
  VALUES 
    (NEW.id, 'Comida', 'utensils', '#F59E0B'),
    (NEW.id, 'Casa', 'home', '#3B82F6'),
    (NEW.id, 'Contas', 'receipt', '#EF4444'),
    (NEW.id, 'Lazer', 'gamepad-2', '#8B5CF6'),
    (NEW.id, 'Transporte', 'car', '#06B6D4'),
    (NEW.id, 'Outros', 'tag', '#6B7280');
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: couples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.couples (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    share_code text DEFAULT encode(extensions.gen_random_bytes(8), 'hex'::text) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    couple_id uuid NOT NULL,
    description text,
    total_amount numeric(10,2) NOT NULL,
    paid_by integer NOT NULL,
    split_type text NOT NULL,
    split_value jsonb DEFAULT '{"person1": 50, "person2": 50}'::jsonb NOT NULL,
    tag_id uuid,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expenses_paid_by_check CHECK ((paid_by = ANY (ARRAY[1, 2]))),
    CONSTRAINT expenses_split_type_check CHECK ((split_type = ANY (ARRAY['equal'::text, 'percentage'::text, 'fixed'::text, 'full'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    couple_id uuid NOT NULL,
    name text DEFAULT 'Pessoa'::text NOT NULL,
    color text DEFAULT '#F5A9B8'::text NOT NULL,
    avatar_index integer DEFAULT 1 NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_position_check CHECK (("position" = ANY (ARRAY[1, 2])))
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    couple_id uuid NOT NULL,
    name text NOT NULL,
    icon text DEFAULT 'tag'::text NOT NULL,
    color text DEFAULT '#94A3B8'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: couples couples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couples
    ADD CONSTRAINT couples_pkey PRIMARY KEY (id);


--
-- Name: couples couples_share_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couples
    ADD CONSTRAINT couples_share_code_key UNIQUE (share_code);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_couple_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_couple_id_position_key UNIQUE (couple_id, "position");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: couples create_profiles_on_couple_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_profiles_on_couple_insert AFTER INSERT ON public.couples FOR EACH ROW EXECUTE FUNCTION public.create_default_profiles();


--
-- Name: couples create_tags_on_couple_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_tags_on_couple_insert AFTER INSERT ON public.couples FOR EACH ROW EXECUTE FUNCTION public.create_default_tags();


--
-- Name: couples update_couples_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_couples_updated_at BEFORE UPDATE ON public.couples FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses expenses_couple_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_couple_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE;


--
-- Name: tags tags_couple_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE;


--
-- Name: couples Anyone can create couples; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create couples" ON public.couples FOR INSERT WITH CHECK (true);


--
-- Name: expenses Anyone can delete expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete expenses" ON public.expenses FOR DELETE USING (true);


--
-- Name: tags Anyone can delete tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete tags" ON public.tags FOR DELETE USING (true);


--
-- Name: expenses Anyone can insert expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert expenses" ON public.expenses FOR INSERT WITH CHECK (true);


--
-- Name: profiles Anyone can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);


--
-- Name: tags Anyone can insert tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert tags" ON public.tags FOR INSERT WITH CHECK (true);


--
-- Name: couples Anyone can read couples by share_code; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read couples by share_code" ON public.couples FOR SELECT USING (true);


--
-- Name: expenses Anyone can read expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read expenses" ON public.expenses FOR SELECT USING (true);


--
-- Name: profiles Anyone can read profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: tags Anyone can read tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read tags" ON public.tags FOR SELECT USING (true);


--
-- Name: couples Anyone can update couples; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update couples" ON public.couples FOR UPDATE USING (true);


--
-- Name: expenses Anyone can update expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update expenses" ON public.expenses FOR UPDATE USING (true);


--
-- Name: profiles Anyone can update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update profiles" ON public.profiles FOR UPDATE USING (true);


--
-- Name: tags Anyone can update tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update tags" ON public.tags FOR UPDATE USING (true);


--
-- Name: couples; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;