import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { RefreshCw, Plus, Trash2, Pause, Play, Pencil } from 'lucide-react';
import { Agreement, Profile, Tag } from '@/hooks/useCouple';
import { formatCurrency } from '@/lib/constants';

interface AgreementManagerProps {
  agreements: Agreement[];
  profiles: Profile[];
  tags: Tag[];
  onAddAgreement: (agreement: Omit<Agreement, 'id' | 'created_at'>) => Promise<void>;
  onUpdateAgreement: (id: string, updates: Partial<Agreement>) => Promise<void>;
  onDeleteAgreement: (id: string) => Promise<void>;
  coupleId: string;
}

export function AgreementManager({ 
  agreements, 
  profiles, 
  tags, 
  onAddAgreement, 
  onUpdateAgreement,
  onDeleteAgreement,
  coupleId 
}: AgreementManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [paidBy, setPaidBy] = useState<number>(1);
  const [tagId, setTagId] = useState<string>('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [splitPerson1, setSplitPerson1] = useState(50);
  const [isLoading, setIsLoading] = useState(false);

  // When editing, populate form with agreement data
  useEffect(() => {
    if (editingAgreement) {
      setName(editingAgreement.name);
      setAmount(editingAgreement.amount);
      setPaidBy(editingAgreement.paid_by);
      setTagId(editingAgreement.tag_id || '');
      setDayOfMonth(editingAgreement.day_of_month?.toString() || '1');
      setSplitPerson1(
        typeof editingAgreement.split_value === 'object' && 'person1' in editingAgreement.split_value
          ? editingAgreement.split_value.person1
          : 50
      );
    }
  }, [editingAgreement]);

  const handleAdd = async () => {
    if (!name.trim() || amount <= 0) return;
    
    setIsLoading(true);
    try {
      await onAddAgreement({
        couple_id: coupleId,
        name: name.trim(),
        amount: amount,
        split_type: 'percentage',
        split_value: { person1: splitPerson1, person2: 100 - splitPerson1 },
        paid_by: paidBy,
        tag_id: tagId || null,
        day_of_month: parseInt(dayOfMonth) || 1,
        is_active: true,
      });
      setIsOpen(false);
      resetForm();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingAgreement || !name.trim() || amount <= 0) return;
    
    setIsLoading(true);
    try {
      await onUpdateAgreement(editingAgreement.id, {
        name: name.trim(),
        amount: amount,
        split_type: 'percentage',
        split_value: { person1: splitPerson1, person2: 100 - splitPerson1 },
        paid_by: paidBy,
        tag_id: tagId || null,
        day_of_month: parseInt(dayOfMonth) || 1,
      });
      setEditingAgreement(null);
      resetForm();
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setAmount(0);
    setPaidBy(1);
    setTagId('');
    setDayOfMonth('1');
    setSplitPerson1(50);
  };

  const person1 = profiles.find(p => p.position === 1);
  const person2 = profiles.find(p => p.position === 2);

  const AgreementForm = ({ isEditing = false }: { isEditing?: boolean }) => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Nome do acordo</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Aluguel, Internet..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Valor</Label>
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            placeholder="0,00"
          />
        </div>
        <div className="space-y-2">
          <Label>Dia do mês</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Quem paga</Label>
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

      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select value={tagId} onValueChange={setTagId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
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

      <div className="space-y-3">
        <Label>Divisão</Label>
        <div className="flex items-center justify-between px-2">
          <span className="text-sm" style={{ color: person1?.color }}>
            {person1?.name}: {splitPerson1}%
          </span>
          <span className="text-sm" style={{ color: person2?.color }}>
            {person2?.name}: {100 - splitPerson1}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={splitPerson1}
          onChange={(e) => setSplitPerson1(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <Button 
        onClick={isEditing ? handleUpdate : handleAdd} 
        disabled={!name.trim() || amount <= 0 || isLoading} 
        className="w-full"
      >
        {isLoading ? (isEditing ? 'Salvando...' : 'Criando...') : (isEditing ? 'Salvar Alterações' : 'Criar Acordo')}
      </Button>
    </div>
  );

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1">
          <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Acordos Recorrentes
        </h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-6 sm:h-7 text-[10px] sm:text-xs px-2">
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
              Novo Acordo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Acordo Recorrente</DialogTitle>
            </DialogHeader>
            <AgreementForm />
          </DialogContent>
        </Dialog>
      </div>

      {agreements.length === 0 ? (
        <p className="text-[10px] sm:text-xs text-muted-foreground text-center py-2">
          Nenhum acordo cadastrado. Acordos facilitam gastos recorrentes.
        </p>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          {agreements.map((agreement) => {
            const payer = profiles.find(p => p.position === agreement.paid_by);
            const tag = tags.find(t => t.id === agreement.tag_id);
            
            return (
              <div
                key={agreement.id}
                className={`p-2 sm:p-3 rounded-xl border ${agreement.is_active ? 'bg-card' : 'bg-muted/30 opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                      <h4 className="font-semibold text-xs sm:text-sm truncate">{agreement.name}</h4>
                      {tag && (
                        <span 
                          className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-primary">
                      {formatCurrency(agreement.amount)}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                      Dia {agreement.day_of_month} • {payer?.name} • {agreement.split_value.person1}%/{agreement.split_value.person2}%
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      onClick={() => {
                        setEditingAgreement(agreement);
                      }}
                    >
                      <Pencil className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      onClick={() => onUpdateAgreement(agreement.id, { is_active: !agreement.is_active })}
                    >
                      {agreement.is_active ? (
                        <Pause className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                      ) : (
                        <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 sm:h-6 sm:w-6 hover:text-destructive"
                      onClick={() => onDeleteAgreement(agreement.id)}
                    >
                      <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingAgreement} onOpenChange={(open) => {
        if (!open) {
          setEditingAgreement(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Acordo</DialogTitle>
          </DialogHeader>
          <AgreementForm isEditing />
        </DialogContent>
      </Dialog>
    </div>
  );
}
