import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { FileText, Plus, Trash2, Pause, Play } from 'lucide-react';
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
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<number>(1);
  const [tagId, setTagId] = useState<string>('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [splitPerson1, setSplitPerson1] = useState(50);
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !amount) return;
    
    setIsLoading(true);
    try {
      await onAddAgreement({
        couple_id: coupleId,
        name: name.trim(),
        amount: parseFloat(amount),
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

  const resetForm = () => {
    setName('');
    setAmount('');
    setPaidBy(1);
    setTagId('');
    setDayOfMonth('1');
    setSplitPerson1(50);
  };

  const person1 = profiles.find(p => p.position === 1);
  const person2 = profiles.find(p => p.position === 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Acordos Recorrentes
        </h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Novo Acordo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Acordo Recorrente</DialogTitle>
            </DialogHeader>
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
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia do mês</Label>
                  <Input
                    type="number"
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

              <Button onClick={handleAdd} disabled={!name.trim() || !amount || isLoading} className="w-full">
                {isLoading ? 'Criando...' : 'Criar Acordo'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {agreements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum acordo cadastrado. Acordos são regras automáticas que facilitam gastos recorrentes.
        </p>
      ) : (
        <div className="space-y-3">
          {agreements.map((agreement) => {
            const payer = profiles.find(p => p.position === agreement.paid_by);
            const tag = tags.find(t => t.id === agreement.tag_id);
            
            return (
              <div
                key={agreement.id}
                className={`p-4 rounded-2xl border ${agreement.is_active ? 'bg-card' : 'bg-muted/30 opacity-60'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{agreement.name}</h4>
                      {tag && (
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(agreement.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Todo dia {agreement.day_of_month} • Pago por {payer?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Divisão: {agreement.split_value.person1}% / {agreement.split_value.person2}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onUpdateAgreement(agreement.id, { is_active: !agreement.is_active })}
                    >
                      {agreement.is_active ? (
                        <Pause className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Play className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => onDeleteAgreement(agreement.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
