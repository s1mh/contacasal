import { useState, useMemo } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Calculator, CreditCard, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Avatar } from '@/components/Avatar';
import { TagPill } from '@/components/TagPill';
import { Couple, useCoupleContext } from '@/contexts/CoupleContext';
import { formatCurrency, SPLIT_TYPES } from '@/lib/constants';
import { cn, isConfiguredProfile } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { DatePickerField } from '@/components/DatePickerField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addMonths, startOfMonth } from 'date-fns';
import { getCurrencySymbol, getDateFnsLocale } from '@/lib/preferences';
import { usePreferences } from '@/contexts/PreferencesContext';

type SplitType = 'equal' | 'percentage' | 'fixed' | 'full';
type PaymentType = 'debit' | 'credit';

export default function NewExpense() {
  const { couple } = useOutletContext<{ couple: Couple }>();
  const { addExpenses } = useCoupleContext();
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { locale: prefLocale, currency, t: prefT } = usePreferences();
  const dateLocale = getDateFnsLocale(prefLocale);
  const currencySymbol = getCurrencySymbol(prefLocale, currency);

  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splitValue, setSplitValue] = useState({ person1: 50, person2: 50 });
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // New fields
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [paymentType, setPaymentType] = useState<PaymentType>('debit');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [installments, setInstallments] = useState(1);

  const person1 = couple.profiles.find(p => p.position === 1);
  const person2 = couple.profiles.find(p => p.position === 2);

  const configuredProfiles = couple.profiles.filter(isConfiguredProfile);

  const [paidBy, setPaidBy] = useState(() => {
    const configured = couple.profiles.filter(isConfiguredProfile);
    return configured.length > 0 ? configured[0].position : 1;
  });
  
  const payerProfile = couple.profiles.find(p => p.position === paidBy);

  // Get cards for the person who paid
  const payerCards = couple.cards.filter(c => c.profile_id === payerProfile?.id);
  const creditCards = payerCards.filter(c => c.type === 'credit');
  const selectedCard = couple.cards.find(c => c.id === selectedCardId);

  const numericAmount = amount;

  // Calculate billing month based on card closing day
  // Rule: if expense day >= closing day, expense goes to NEXT month's bill (paid in month after)
  // Example: closing day 1, expense on day 1 of January → bill for February (paid in March)
  const billingMonth = useMemo(() => {
    if (paymentType !== 'credit' || !selectedCard?.closing_day) return null;
    
    const day = expenseDate.getDate();
    const closingDay = selectedCard.closing_day;
    
    // If the purchase is ON or AFTER the closing day, it goes to next month's bill
    if (day >= closingDay) {
      return addMonths(startOfMonth(expenseDate), 2); // +2 because: next bill (month+1) is paid in (month+2)
    }
    // If purchase is before closing day, it goes to current month's bill
    return addMonths(startOfMonth(expenseDate), 1); // Current bill is paid next month
  }, [expenseDate, paymentType, selectedCard]);

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
      const installmentAmount = numericAmount / installments;
      
      // Build array of all installments
      const expensesToAdd = [];
      for (let i = 0; i < installments; i++) {
        let expenseBillingMonth = billingMonth;
        if (billingMonth && i > 0) {
          expenseBillingMonth = addMonths(billingMonth, i);
        }

        expensesToAdd.push({
          description: installments > 1 
            ? `${description || 'Compra'} (${i + 1}/${installments})`
            : description || null,
          total_amount: installmentAmount,
          paid_by: paidBy,
          split_type: splitType,
          split_value: splitType === 'fixed' 
            ? { person1: splitPreview.person1 / installments, person2: splitPreview.person2 / installments }
            : splitValue,
          tag_id: selectedTagId,
          expense_date: expenseDate.toISOString().split('T')[0], // Always original date
          payment_type: paymentType,
          card_id: paymentType === 'credit' ? selectedCardId : null,
          billing_month: expenseBillingMonth?.toISOString().split('T')[0] || null,
          installments: installments,
          installment_number: i + 1,
        });
      }
      
      // Add all at once - single notification
      await addExpenses(expensesToAdd);
      navigate(`/c/${shareCode}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePercentageChange = (value: number[]) => {
    setSplitValue({ person1: value[0], person2: 100 - value[0] });
  };

  // Reset card when changing payer
  const handlePayerChange = (position: number) => {
    setPaidBy(position);
    setSelectedCardId(null);
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
        <h1 className="text-xl font-semibold">{prefT('Novo gasto')}</h1>
      </div>

      {/* Amount Input */}
      <div className="bg-card rounded-3xl p-6 shadow-lg border border-border/50 mb-4">
        <label className="text-sm text-muted-foreground mb-2 block">{prefT('Valor total')}</label>
        <div className="flex items-center gap-2">
          <span className="text-2xl text-muted-foreground">{currencySymbol}</span>
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            showPrefix={false}
            className="text-4xl font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
          />
        </div>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={prefT('Descrição (opcional)')}
          className="mt-4 rounded-xl bg-muted border-0"
          spellCheck
          autoCorrect="on"
        />
      </div>

      {/* Date Picker */}
      <div className="bg-card rounded-3xl p-4 shadow-lg border border-border/50 mb-4">
        <DatePickerField
          value={expenseDate}
          onChange={setExpenseDate}
          label={prefT('Data da compra')}
        />
      </div>

      {/* Payment Type */}
      <div className="bg-card rounded-3xl p-4 shadow-lg border border-border/50 mb-4">
        <label className="text-sm text-muted-foreground mb-3 block">{prefT('Forma de pagamento')}</label>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setPaymentType('debit');
              setSelectedCardId(null);
              setInstallments(1);
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all',
              paymentType === 'debit'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            )}
          >
            <CreditCard className="w-4 h-4" />
            <span className="font-medium">{prefT('Débito')}</span>
          </button>
          <button
            onClick={() => setPaymentType('credit')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all',
              paymentType === 'credit'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            )}
          >
            <CreditCard className="w-4 h-4" />
            <span className="font-medium">{prefT('Crédito')}</span>
          </button>
        </div>

        {paymentType === 'credit' && (
          <div className="space-y-4 animate-fade-in">
            {creditCards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                {prefT('Nenhum cartão de crédito cadastrado para {name}.', { name: payerProfile?.name || '' })}
                <br />
                <span className="text-xs">{prefT('Cadastre em Ajustes → Cartões')}</span>
              </p>
            ) : (
              <>
                <Select value={selectedCardId || ''} onValueChange={setSelectedCardId}>
                  <SelectTrigger>
                    <SelectValue placeholder={prefT('Selecione...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {creditCards.map(card => (
                      <SelectItem key={card.id} value={card.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-3 rounded"
                            style={{ backgroundColor: card.color }}
                          />
                          {card.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Installments */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">{prefT('Parcelas')}</label>
                  <Select 
                    value={installments.toString()} 
                    onValueChange={(v) => setInstallments(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}x {numericAmount > 0 ? `de ${formatCurrency(numericAmount / n)}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Billing month preview */}
                {selectedCard && billingMonth && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 text-sm">
                    <Info className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {prefT('Entrará na fatura de {month}', { month: format(billingMonth, 'MMMM', { locale: dateLocale }) })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {prefT('Fechamento dia {day}', { day: selectedCard.closing_day ?? '' })} • {prefT('Vencimento dia {day}', { day: selectedCard.due_day ?? '' })}
                      </p>
                      {installments > 1 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {prefT('Última parcela: {month}', {
                            month: format(addMonths(billingMonth, installments - 1), 'MMMM yyyy', { locale: dateLocale }),
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Who Paid */}
      <div className="bg-card rounded-3xl p-4 shadow-lg border border-border/50 mb-4">
        <label className="text-sm text-muted-foreground mb-3 block">{prefT('Quem pagou')}</label>
        {configuredProfiles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            {prefT('Configure seu perfil em Ajustes primeiro')}
          </p>
        ) : configuredProfiles.length === 1 ? (
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl border-2 border-primary bg-primary/5">
              <Avatar avatarIndex={configuredProfiles[0].avatar_index} size="md" ringColor={configuredProfiles[0].color} animated animation="purring" />
              <span className="font-medium">{configuredProfiles[0].name}</span>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            {configuredProfiles.map((person) => (
              <button
                key={person.position}
                onClick={() => handlePayerChange(person.position)}
                className={cn(
                  'flex-1 flex items-center gap-3 p-3 rounded-2xl border-2 transition-all',
                  paidBy === person.position
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <Avatar
                  avatarIndex={person.avatar_index}
                  size="md"
                  ringColor={person.color}
                  selected={paidBy === person.position}
                  animateOnHover={paidBy !== person.position}
                  animation="playing"
                />
                <span className="font-medium">{person.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Split Type */}
      <div className="bg-card rounded-3xl p-4 shadow-lg border border-border/50 mb-4">
        <label className="text-sm text-muted-foreground mb-3 block">{prefT('Divisão')}</label>
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
              <CurrencyInput
                value={splitValue.person1}
                onChange={(value) => setSplitValue({ person1: Math.min(value, numericAmount), person2: numericAmount - Math.min(value, numericAmount) })}
                className="w-28 rounded-xl"
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
      <div className="bg-card rounded-3xl p-4 shadow-lg border border-border/50 mb-4">
        <label className="text-sm text-muted-foreground mb-3 block">{prefT('Categoria')}</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTagId(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              !selectedTagId
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            Sem categoria
          </button>
          {couple.tags.map((tag) => (
            <TagPill
              key={tag.id}
              name={tag.name}
              icon={tag.icon}
              color={tag.color}
              selected={selectedTagId === tag.id}
              onClick={() => setSelectedTagId(tag.id)}
            />
          ))}
        </div>
      </div>

      {/* Split Preview */}
      {numericAmount > 0 && (
        <div className="bg-muted/50 rounded-2xl p-4 mb-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{prefT('Resumo da divisão')}</span>
          </div>
          <div className="space-y-2">
            {[person1, person2].map((person) => person && (
              <div key={person.position} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Avatar avatarIndex={person.avatar_index} size="sm" animateOnHover animation="idle" />
                  <span className="text-sm">{person.name}</span>
                </div>
                <span className="font-medium" style={{ color: person.color }}>
                  {formatCurrency(person.position === 1 ? splitPreview.person1 : splitPreview.person2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!numericAmount || loading || (paymentType === 'credit' && !selectedCardId && creditCards.length > 0)}
        className="w-full py-6 rounded-2xl text-lg"
      >
        {loading ? (
          <>{prefT('Salvando...')}</>
        ) : (
          <>
            <Check className="w-5 h-5 mr-2" />
            {prefT('Salvar')}
          </>
        )}
      </Button>
    </div>
  );
}
