-- Prevent future expense dates (purchase date must be today or earlier)
-- Safe/idempotent: add NOT VALID constraint to avoid failing on existing data

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_expense_date_not_future;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_expense_date_not_future
  CHECK (expense_date <= CURRENT_DATE) NOT VALID;

