import { useState, useMemo } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/Avatar';
import { TagPill } from '@/components/TagPill';
import { Couple, useCouple } from '@/hooks/useCouple';
import { formatCurrency, SPLIT_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

type SplitType = 'equal' | 'percentage' | 'fixed' | 'full';

export default function NewExpense() {
  const { couple } = useOutletContext<{ couple: Couple }>();
  const { addExpense } = useCouple();
  const { shareCode } = useParams();
  const navigate = useNavigate();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState(1);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splitValue, setSplitValue] = useState({ person1: 50, person2: 50 });
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const person1 = couple.profiles.find(p => p.position === 1);
  const person2 = couple.profiles.find(p => p.position === 2);

  const numericAmount = parseFloat(amount.replace(',', '.')) || 0;

  const splitPreview = useMemo(() => {
    if (!numericAmount) return { person1: 0, person2: 0 };

    switch (splitType) {
      case 'equal':
        return { person1: numericAmount / 2, person2: numericAmount / 2 };
      case 'percentage':
        return {
          person1: (numericAmount * splitValue.person1) / 100,
          person2: (numericAmount * splitValue.person2) / 100,
        };
      case 'fixed':
        return {
          person1: splitValue.person1,
          person2: numericAmount - splitValue.person1,
        };
      case 'full':
        return splitValue.person1 === 100
          ? { person1: numericAmount, person2: 0 }
          : { person1: 0, person2: numericAmount };
      default:
        return { person1: 0, person2: 0 };
    }
  }, [numericAmount, splitType, splitValue]);

  const handleSubmit = async () => {
    if (!numericAmount) return;

    setLoading(true);
    try {
      await addExpense({
        description: description || null,
        total_amount: numericAmount,
        paid_by: paidBy,
        split_type: splitType,
        split_value: splitType === 'fixed' 
          ? { person1: splitPreview.person1, person2: splitPreview.person2 }
          : splitValue,
        tag_id: selectedTagId,
        expense_date: new Date().toISOString().split('T')[0],
        payment_type: 'debit',
        card_id: null,
        billing_month: null,
        installments: 1,
        installment_number: 1,
      });
      navigate(`/c/${shareCode}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePercentageChange = (value: number[]) => {
    setSplitValue({ person1: value[0], person2: 100 - value[0] });
  };

  const handleFixedChange = (value: string) => {
    const fixedAmount = parseFloat(value.replace(',', '.')) || 0;
    setSplitValue({ person1: Math.min(fixedAmount, numericAmount), person2: numericAmount - fixedAmount });
  };

  return (
    <div className="p-4 safe-top">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/c/${shareCode}`)}
          className="p-2 -ml-2 hover:bg-muted rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">Novo gasto</h1>
      </div>

      {/* Amount Input */}
      <div className="bg-card rounded-3xl p-6 shadow-glass mb-4">
        <label className="text-sm text-muted-foreground mb-2 block">Valor total</label>
        <div className="flex items-center gap-2">
          <span className="text-2xl text-muted-foreground">R$</span>
          <Input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9,\.]/g, ''))}
            placeholder="0,00"
            className="text-4xl font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
          />
        </div>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          className="mt-4 rounded-xl bg-muted border-0"
        />
      </div>

      {/* Who Paid */}
      <div className="bg-card rounded-3xl p-4 shadow-glass mb-4">
        <label className="text-sm text-muted-foreground mb-3 block">Quem pagou?</label>
        <div className="flex gap-3">
          {[person1, person2].map((person) => person && (
            <button
              key={person.position}
              onClick={() => setPaidBy(person.position)}
              className={cn(
                'flex-1 flex items-center gap-3 p-3 rounded-2xl border-2 transition-all',
                paidBy === person.position
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30'
              )}
            >
              <Avatar avatarIndex={person.avatar_index} size="md" ringColor={person.color} />
              <span className="font-medium">{person.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Split Type */}
      <div className="bg-card rounded-3xl p-4 shadow-glass mb-4">
        <label className="text-sm text-muted-foreground mb-3 block">Divisão</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(Object.entries(SPLIT_TYPES) as [SplitType, typeof SPLIT_TYPES.equal][]).map(([type, info]) => (
            <button
              key={type}
              onClick={() => {
                setSplitType(type);
                if (type === 'equal') {
                  setSplitValue({ person1: 50, person2: 50 });
                } else if (type === 'full') {
                  setSplitValue({ person1: 100, person2: 0 });
                }
              }}
              className={cn(
                'split-option text-left',
                splitType === type && 'active'
              )}
            >
              <p className="font-medium text-sm">{info.label}</p>
              <p className="text-xs text-muted-foreground">{info.description}</p>
            </button>
          ))}
        </div>

        {/* Split Controls */}
        {splitType === 'percentage' && (
          <div className="space-y-3 pt-2">
            <Slider
              value={[splitValue.person1]}
              onValueChange={handlePercentageChange}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-sm">
              <span style={{ color: person1?.color }}>{person1?.name}: {splitValue.person1}%</span>
              <span style={{ color: person2?.color }}>{person2?.name}: {splitValue.person2}%</span>
            </div>
          </div>
        )}

        {splitType === 'fixed' && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: person1?.color }}>{person1?.name}:</span>
              <Input
                type="text"
                inputMode="decimal"
                value={splitValue.person1.toString()}
                onChange={(e) => handleFixedChange(e.target.value)}
                className="w-24 rounded-xl"
                placeholder="0,00"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              <span style={{ color: person2?.color }}>{person2?.name}</span> paga o resto: {formatCurrency(splitPreview.person2)}
            </p>
          </div>
        )}

        {splitType === 'full' && (
          <div className="flex gap-2 pt-2">
            {[person1, person2].map((person) => person && (
              <button
                key={person.position}
                onClick={() => setSplitValue(
                  person.position === 1 
                    ? { person1: 100, person2: 0 }
                    : { person1: 0, person2: 100 }
                )}
                className={cn(
                  'flex-1 p-3 rounded-xl border-2 transition-all',
                  (person.position === 1 ? splitValue.person1 : splitValue.person2) === 100
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <span className="text-sm font-medium">{person.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="bg-card rounded-3xl p-4 shadow-glass mb-4">
        <label className="text-sm text-muted-foreground mb-3 block">Categoria</label>
        <div className="flex flex-wrap gap-2">
          {couple.tags.map((tag) => (
            <TagPill
              key={tag.id}
              name={tag.name}
              icon={tag.icon}
              color={tag.color}
              selected={selectedTagId === tag.id}
              onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      {numericAmount > 0 && (
        <div className="bg-muted rounded-2xl p-4 mb-4 animate-fade-in">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Calculator className="w-4 h-4" />
            Prévia da divisão
          </div>
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              {person1 && <Avatar avatarIndex={person1.avatar_index} size="sm" />}
              <span className="font-medium">{formatCurrency(splitPreview.person1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{formatCurrency(splitPreview.person2)}</span>
              {person2 && <Avatar avatarIndex={person2.avatar_index} size="sm" />}
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!numericAmount || loading}
        className="w-full h-14 rounded-2xl text-lg bg-primary hover:bg-primary/90"
      >
        {loading ? 'Salvando...' : 'Registrar gasto'}
        <Check className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
}
