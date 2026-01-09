import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card as CardUI, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Plus, Trash2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, Profile } from '@/hooks/useCouple';

interface CardManagerProps {
  profile: Profile;
  cards: Card[];
  onAddCard: (card: Omit<Card, 'id' | 'created_at'>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
}

const CARD_COLORS = [
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Laranja', value: '#F59E0B' },
  { name: 'Cinza', value: '#6B7280' },
];

export function CardManager({ profile, cards, onAddCard, onDeleteCard }: CardManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [color, setColor] = useState(CARD_COLORS[0].value);
  const [isLoading, setIsLoading] = useState(false);

  const profileCards = cards.filter(c => c.profile_id === profile.id);

  const handleAddCard = async () => {
    if (!name.trim()) return;
    
    setIsLoading(true);
    try {
      await onAddCard({
        profile_id: profile.id,
        couple_id: profile.couple_id,
        name: name.trim(),
        type,
        closing_day: type === 'credit' && closingDay ? parseInt(closingDay) : null,
        due_day: type === 'credit' && dueDay ? parseInt(dueDay) : null,
        color,
      });
      setIsOpen(false);
      resetForm();
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setType('credit');
    setClosingDay('');
    setDueDay('');
    setColor(CARD_COLORS[0].value);
  };

  return (
    <div className="space-y-1.5 sm:space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1">
          <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Cartões
        </h4>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-6 sm:h-7 text-[10px] sm:text-xs px-2">
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Cartão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do cartão</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Nubank, Itaú..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as 'credit' | 'debit')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Crédito</SelectItem>
                    <SelectItem value="debit">Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === 'credit' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Dia do fechamento
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={closingDay}
                        onChange={(e) => setClosingDay(e.target.value)}
                        placeholder="Ex: 3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Dia do vencimento
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                        placeholder="Ex: 10"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  {CARD_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all",
                        color === c.value ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                      )}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <Button onClick={handleAddCard} disabled={!name.trim() || isLoading} className="w-full">
                {isLoading ? 'Adicionando...' : 'Adicionar Cartão'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {profileCards.length === 0 ? (
        <p className="text-[10px] sm:text-xs text-muted-foreground text-center py-1">
          Nenhum cartão cadastrado
        </p>
      ) : (
        <div className="space-y-1 sm:space-y-1.5">
          {profileCards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-muted/50 border border-border"
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div 
                  className="w-5 h-3 sm:w-6 sm:h-4 rounded-sm"
                  style={{ backgroundColor: card.color }}
                />
                <div>
                  <p className="font-medium text-[10px] sm:text-xs">{card.name}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                    {card.type === 'credit' ? (
                      <>Crédito • Fecha {card.closing_day} • Vence {card.due_day}</>
                    ) : (
                      'Débito'
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-destructive"
                onClick={() => onDeleteCard(card.id)}
              >
                <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
