import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Expense, Profile, Tag, Card } from '@/contexts/CoupleContext';
import { DatePickerField } from '@/components/DatePickerField';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Slider } from '@/components/ui/slider';
import { parseISO } from 'date-fns';
import { useI18n } from '@/contexts/I18nContext';

interface EditExpenseDialogProps {
  expense: Expense;
  profiles: Profile[];
  tags: Tag[];
  cards?: Card[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Expense>) => Promise<void>;
}

export function EditExpenseDialog({
  expense,
  profiles,
  tags,
  cards = [],
  open,
  onOpenChange,
  onSave,
}: EditExpenseDialogProps) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(expense.total_amount);
  const [description, setDescription] = useState(expense.description || '');
  const [expenseDate, setExpenseDate] = useState<Date>(parseISO(expense.expense_date));
  const [paidBy, setPaidBy] = useState(expense.paid_by);
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'fixed' | 'full'>(expense.split_type);
  const [splitPerson1, setSplitPerson1] = useState(
    typeof expense.split_value === 'object' && 'person1' in expense.split_value 
      ? expense.split_value.person1 
      : 50
  );
  const [tagId, setTagId] = useState(expense.tag_id || '');
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when expense changes
  useEffect(() => {
    setAmount(expense.total_amount);
    setDescription(expense.description || '');
    setExpenseDate(parseISO(expense.expense_date));
    setPaidBy(expense.paid_by);
    setSplitType(expense.split_type);
    setSplitPerson1(
      typeof expense.split_value === 'object' && 'person1' in expense.split_value 
        ? expense.split_value.person1 
        : 50
    );
    setTagId(expense.tag_id || '');
  }, [expense]);

  const numericAmount = amount;
  
  const person1 = profiles.find(p => p.position === 1);
  const person2 = profiles.find(p => p.position === 2);

  const getSplitValue = () => {
    switch (splitType) {
      case 'equal':
        return { person1: 50, person2: 50 };
      case 'percentage':
        return { person1: splitPerson1, person2: 100 - splitPerson1 };
      case 'full':
        return splitPerson1 === 100 ? { person1: 100, person2: 0 } : { person1: 0, person2: 100 };
      case 'fixed':
        const p1Amount = (splitPerson1 / 100) * numericAmount;
        return { person1: p1Amount, person2: numericAmount - p1Amount };
      default:
        return { person1: 50, person2: 50 };
    }
  };

  const handleSave = async () => {
    if (!numericAmount) return;
    
    setIsLoading(true);
    try {
      await onSave({
        total_amount: numericAmount,
        description: description || null,
        expense_date: expenseDate.toISOString().split('T')[0],
        paid_by: paidBy,
        split_type: splitType,
        split_value: getSplitValue(),
        tag_id: tagId || null,
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.editExpense.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label>{t.editExpense.amount}</Label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{t.editExpense.description}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.editExpense.descriptionPlaceholder}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>{t.editExpense.date}</Label>
            <DatePickerField
              value={expenseDate}
              onChange={(date) => date && setExpenseDate(date)}
            />
          </div>

          {/* Paid by */}
          <div className="space-y-2">
            <Label>{t.editExpense.whoPaid}</Label>
            <Select value={paidBy.toString()} onValueChange={(v) => setPaidBy(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.position.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>{t.editExpense.category}</Label>
            <Select value={tagId} onValueChange={setTagId}>
              <SelectTrigger>
                <SelectValue placeholder={t.editExpense.selectCategory} />
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Split Type */}
          <div className="space-y-2">
            <Label>{t.editExpense.split}</Label>
            <Select value={splitType} onValueChange={(v) => setSplitType(v as typeof splitType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">{t.expenses.splitEqual}</SelectItem>
                <SelectItem value="percentage">{t.editExpense.percentage}</SelectItem>
                <SelectItem value="full">{t.editExpense.oneHundredPercent}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Split Slider */}
          {(splitType === 'percentage' || splitType === 'full') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: person1?.color }}>
                  {person1?.name}: {splitType === 'full' ? (splitPerson1 === 100 ? '100%' : '0%') : `${splitPerson1}%`}
                </span>
                <span style={{ color: person2?.color }}>
                  {person2?.name}: {splitType === 'full' ? (splitPerson1 === 100 ? '0%' : '100%') : `${100 - splitPerson1}%`}
                </span>
              </div>
              <Slider
                value={[splitPerson1]}
                onValueChange={([v]) => setSplitPerson1(splitType === 'full' ? (v >= 50 ? 100 : 0) : v)}
                max={100}
                step={splitType === 'full' ? 100 : 5}
                className="w-full"
              />
            </div>
          )}

          <Button 
            onClick={handleSave} 
            disabled={!numericAmount || isLoading} 
            className="w-full"
          >
            {isLoading ? t.editExpense.saving : t.editExpense.saveChanges}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
