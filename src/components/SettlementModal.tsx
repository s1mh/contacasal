import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Profile, Settlement } from '@/hooks/useCouple';
import { Avatar } from '@/components/Avatar';
import { ArrowRight, Check, PartyPopper } from 'lucide-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useI18n } from '@/contexts/I18nContext';

interface SettlementModalProps {
  open: boolean;
  onClose: () => void;
  balance: number;
  profiles: Profile[];
  onSettle: (settlement: Omit<Settlement, 'id' | 'settled_at'>) => Promise<void>;
  coupleId: string;
}

export function SettlementModal({ open, onClose, balance, profiles, onSettle, coupleId }: SettlementModalProps) {
  const { t } = usePreferences();
  const { formatCurrency } = useI18n();
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const person1 = profiles.find(p => p.position === 1);
  const person2 = profiles.find(p => p.position === 2);

  // Quem deve pagar
  const debtor = balance > 0 ? person1 : person2;
  const creditor = balance > 0 ? person2 : person1;
  const amount = Math.abs(balance);

  const handleSettle = async () => {
    if (amount === 0) return;
    
    setIsLoading(true);
    try {
      await onSettle({
        couple_id: coupleId,
        amount,
        paid_by: debtor?.position || 1,
        note: note.trim() || null,
      });
      setIsComplete(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsComplete(false);
    setNote('');
    onClose();
  };

  if (amount === 0) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <PartyPopper className="w-16 h-16 text-primary mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('Tudo equilibrado!')}</h2>
            <p className="text-muted-foreground">
              {t('Vocês estão quites. Não há saldo a acertar.')}
            </p>
            <Button onClick={handleClose} className="mt-6">
              {t('Fechar')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isComplete) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t('Acerto registrado!')}</h2>
            <p className="text-muted-foreground">
              {t('O saldo foi zerado. Comecem um novo período!')}
            </p>
            <Button onClick={handleClose} className="mt-6">
              {t('Continuar')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Acertar as Contas')}</DialogTitle>
          <DialogDescription>
            {t('Registre o pagamento para zerar o saldo atual')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Transfer visualization */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex flex-col items-center">
              <Avatar
                avatarIndex={debtor?.avatar_index || 1}
                size="md"
                ringColor={debtor?.color}
                ringWidth={4}
                animated
                animateOnHover={false}
                className="w-14 h-14"
              />
              <span className="text-sm font-medium mt-2">{debtor?.name}</span>
            </div>

            <div className="flex flex-col items-center">
              <ArrowRight className="w-6 h-6 text-primary" />
              <span className="text-lg font-bold text-primary mt-1">
                {formatCurrency(amount)}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <Avatar
                avatarIndex={creditor?.avatar_index || 1}
                size="md"
                ringColor={creditor?.color}
                ringWidth={4}
                animated
                animateOnHover={false}
                className="w-14 h-14"
              />
              <span className="text-sm font-medium mt-2">{creditor?.name}</span>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t('Observação (opcional)')}</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('Ex: Pix enviado, dinheiro vivo...')}
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            {t('Cancelar')}
          </Button>
          <Button onClick={handleSettle} disabled={isLoading} className="flex-1">
            {isLoading ? t('Registrando...') : t('Confirmar Acerto')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
