import { useState } from 'react';
import { Copy, Share2, Heart, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/Avatar';
import { Profile } from '@/contexts/CoupleContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useToast } from '@/hooks/use-toast';

interface WaitingForPartnerProps {
  shareCode: string;
  myProfile?: Profile;
}

export function WaitingForPartner({ shareCode, myProfile }: WaitingForPartnerProps) {
  const { t: prefT } = usePreferences();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(shareCode);
    setCopied(true);
    toast({
      title: prefT('Copiado!'),
      description: prefT('Compartilhe o código com seu parceiro(a)')
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = window.location.origin + `/c/${shareCode}`;
    const inviterName = myProfile?.name;
    const shareUrl = inviterName ? `${url}?from=${encodeURIComponent(inviterName)}` : url;

    if (navigator.share) {
      try {
        await navigator.share({
          title: prefT('Conta de Casal'),
          text: prefT('Entre no nosso espaço compartilhado!'),
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: prefT('Link copiado!'),
        description: prefT('Compartilhe com seu parceiro(a).'),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center animate-fade-in">
        {/* Profile avatar */}
        {myProfile && (
          <div className="flex justify-center mb-4">
            <Avatar
              avatarIndex={myProfile.avatar_index}
              size="lg"
              ringColor={myProfile.color}
            />
          </div>
        )}

        <h1 className="text-xl font-semibold mb-2">
          {prefT('Falta pouco, {name}!', { name: myProfile?.name || '' })}
        </h1>

        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
          <Users className="w-4 h-4" />
          <p className="text-sm">
            {prefT('Convide alguém para começar a dividir gastos juntos.')}
          </p>
        </div>

        {/* Share code card */}
        <div className="bg-card rounded-3xl p-6 shadow-glass mb-4">
          <p className="text-xs text-muted-foreground mb-2">{prefT('Código do espaço')}</p>
          <p className="font-mono text-3xl font-bold tracking-wider mb-4">{shareCode}</p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopyCode}
              className="flex-1"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? prefT('Copiado!') : prefT('Copiar código')}
            </Button>
            <Button
              onClick={handleShare}
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {prefT('Compartilhar')}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {prefT('Quando a outra pessoa entrar, o app será liberado automaticamente.')}
        </p>

        {/* Animated waiting indicator */}
        <div className="flex justify-center gap-3 mt-6">
          <Heart className="w-5 h-5 text-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <Heart className="w-5 h-5 text-primary/60 animate-bounce" style={{ animationDelay: '200ms' }} />
          <Heart className="w-5 h-5 text-primary/30 animate-bounce" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  );
}
