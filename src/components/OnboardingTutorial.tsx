import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CAT_AVATARS } from '@/lib/constants';
import { usePreferences } from '@/contexts/PreferencesContext';
import {
  Heart,
  Users,
  PiggyBank,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Share2,
  Plus,
  BarChart3,
  Scale,
  Wallet,
  ChevronRight,
} from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  illustration?: 'cats' | 'share' | 'expense' | 'balance' | 'stats';
  highlight?: string;
}

interface OnboardingTutorialProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  context: 'welcome' | 'after-profile' | 'after-join';
}

const TUTORIAL_STORAGE_KEY = 'contacasal_tutorial_completed';

export function OnboardingTutorial({ open, onClose, onComplete, context }: OnboardingTutorialProps) {
  const { t } = usePreferences();
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Define steps based on context
  const getSteps = (): TutorialStep[] => {
    if (context === 'welcome') {
      return [
        {
          id: 'welcome',
          title: t('Bem-vindo ao Conta de Casal!'),
          description: t('Um app simples e bonito para dividir despesas com quem você mora. Vamos te mostrar como funciona!'),
          icon: <Heart className="w-8 h-8 text-pink-500" />,
          illustration: 'cats',
        },
        {
          id: 'concept',
          title: t('Divisão justa e automática'),
          description: t('Registre as despesas e o app calcula automaticamente quanto cada pessoa deve. Sem planilhas, sem confusão!'),
          icon: <Scale className="w-8 h-8 text-emerald-500" />,
          illustration: 'balance',
        },
        {
          id: 'share',
          title: t('Compartilhe com até 5 pessoas'),
          description: t('Crie seu espaço e convide sua galera pelo link. Cada pessoa tem seu perfil personalizado com gatinho!'),
          icon: <Users className="w-8 h-8 text-blue-500" />,
          illustration: 'share',
          highlight: t('Funciona para casais, amigos ou família'),
        },
        {
          id: 'start',
          title: t('Pronto para começar?'),
          description: t('Crie seu espaço agora e comece a dividir despesas de forma inteligente!'),
          icon: <Sparkles className="w-8 h-8 text-amber-500" />,
          illustration: 'cats',
        },
      ];
    }

    if (context === 'after-profile') {
      return [
        {
          id: 'profile-done',
          title: t('Perfil criado com sucesso!'),
          description: t('Agora você pode compartilhar o link com as pessoas que vão dividir despesas com você.'),
          icon: <Check className="w-8 h-8 text-emerald-500" />,
          illustration: 'cats',
        },
        {
          id: 'how-share',
          title: t('Como compartilhar'),
          description: t('Use o botão "Compartilhar" no topo da tela para enviar o link. Quem receber pode criar o próprio perfil!'),
          icon: <Share2 className="w-8 h-8 text-blue-500" />,
          illustration: 'share',
        },
        {
          id: 'add-expense',
          title: t('Adicione seu primeiro gasto'),
          description: t('Toque no botão + para registrar uma despesa. Você pode dividir 50/50 ou personalizar a divisão!'),
          icon: <Plus className="w-8 h-8 text-primary" />,
          illustration: 'expense',
        },
      ];
    }

    // after-join
    return [
      {
        id: 'joined',
        title: t('Você entrou no espaço!'),
        description: t('Agora você faz parte deste espaço compartilhado. Vamos ver como funciona!'),
        icon: <Check className="w-8 h-8 text-emerald-500" />,
        illustration: 'cats',
      },
      {
        id: 'balance-explained',
        title: t('O equilíbrio é automático'),
        description: t('O app calcula quem deve quanto a quem. Basta registrar os gastos e a mágica acontece!'),
        icon: <Scale className="w-8 h-8 text-emerald-500" />,
        illustration: 'balance',
      },
      {
        id: 'stats',
        title: t('Acompanhe seus gastos'),
        description: t('Veja relatórios, gráficos e insights sobre como vocês estão gastando juntos.'),
        icon: <BarChart3 className="w-8 h-8 text-purple-500" />,
        illustration: 'stats',
      },
    ];
  };

  const steps = getSteps();
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      onClose();
    }, 200);
  };

  const handleComplete = () => {
    setIsExiting(true);
    setTimeout(() => {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      onComplete();
    }, 200);
  };

  const renderIllustration = (type?: string) => {
    switch (type) {
      case 'cats':
        return (
          <div className="flex justify-center items-center gap-4 py-6">
            <img
              src={CAT_AVATARS[0]}
              alt=""
              className="w-20 h-20 rounded-full shadow-lg animate-bounce-gentle ring-4 ring-pink-200"
            />
            <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center animate-pulse">
              <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
            </div>
            <img
              src={CAT_AVATARS[1]}
              alt=""
              className="w-20 h-20 rounded-full shadow-lg animate-bounce-gentle ring-4 ring-blue-200"
              style={{ animationDelay: '150ms' }}
            />
          </div>
        );

      case 'share':
        return (
          <div className="flex justify-center py-6">
            <div className="relative">
              <div className="flex -space-x-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <img
                    key={i}
                    src={CAT_AVATARS[i]}
                    alt=""
                    className={cn(
                      "w-14 h-14 rounded-full shadow-lg ring-2 ring-white",
                      i > 2 && "opacity-50"
                    )}
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                <Share2 className="w-4 h-4" />
              </div>
            </div>
          </div>
        );

      case 'expense':
        return (
          <div className="flex justify-center py-6">
            <div className="bg-card border rounded-2xl p-4 shadow-lg w-64">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Mercado</p>
                  <p className="text-xs text-muted-foreground">Hoje</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">R$ 150,00</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                  50/50
                </span>
              </div>
            </div>
          </div>
        );

      case 'balance':
        return (
          <div className="flex justify-center items-center gap-4 py-6">
            <div className="flex flex-col items-center">
              <img src={CAT_AVATARS[2]} alt="" className="w-14 h-14 rounded-full shadow-lg ring-2 ring-amber-200" />
              <span className="text-xs mt-1 font-medium">Ana</span>
            </div>
            <div className="flex flex-col items-center px-4">
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm font-bold mt-1">R$ 75</span>
            </div>
            <div className="flex flex-col items-center">
              <img src={CAT_AVATARS[3]} alt="" className="w-14 h-14 rounded-full shadow-lg ring-2 ring-emerald-200" />
              <span className="text-xs mt-1 font-medium">João</span>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className="flex justify-center py-6">
            <div className="bg-card border rounded-2xl p-4 shadow-lg w-64">
              <div className="flex items-end justify-between h-24 px-2">
                {[40, 60, 80, 50, 70, 90, 65].map((h, i) => (
                  <div
                    key={i}
                    className="w-6 bg-gradient-to-t from-primary/80 to-primary rounded-t-md transition-all duration-500"
                    style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Últimos 7 dias
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent
        className={cn(
          "sm:max-w-md p-0 overflow-hidden border-0 bg-gradient-to-b from-card to-background",
          isExiting && "animate-fade-out"
        )}
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-muted/80 transition-colors"
          aria-label={t('Pular tutorial')}
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="px-6 pt-8 pb-6">
          {/* Progress indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === currentStep
                    ? "w-8 bg-primary"
                    : index < currentStep
                    ? "w-4 bg-primary/50"
                    : "w-4 bg-muted"
                )}
              />
            ))}
          </div>

          {/* Step content with animation */}
          <div
            key={currentStep}
            className="animate-fade-slide-up text-center"
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-inner">
                {currentStepData.icon}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-foreground mb-2">
              {currentStepData.title}
            </h2>

            {/* Description */}
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              {currentStepData.description}
            </p>

            {/* Highlight */}
            {currentStepData.highlight && (
              <div className="inline-block bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-4">
                {currentStepData.highlight}
              </div>
            )}

            {/* Illustration */}
            {renderIllustration(currentStepData.illustration)}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {!isFirstStep && (
              <Button
                variant="ghost"
                onClick={handlePrev}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('Voltar')}
              </Button>
            )}
            <Button
              onClick={handleNext}
              className={cn(
                "flex-1 transition-all duration-300",
                isFirstStep && "w-full"
              )}
            >
              {isLastStep ? (
                <>
                  {t('Começar!')}
                  <Sparkles className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  {t('Continuar')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Skip link */}
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('Pular tutorial')}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if tutorial should be shown
export function useTutorialState() {
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);

  useEffect(() => {
    const seen = localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
    setHasSeenTutorial(seen);
  }, []);

  const markAsSeen = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setHasSeenTutorial(true);
  };

  const reset = () => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    setHasSeenTutorial(false);
  };

  return { hasSeenTutorial, markAsSeen, reset };
}
