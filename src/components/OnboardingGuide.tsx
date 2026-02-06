import { useState, useEffect } from 'react';
import { Plus, Clock, BarChart3, Settings, Eye, EyeOff, Share2, ArrowRight, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';

interface OnboardingGuideProps {
  shareCode: string;
  userName: string;
  onComplete: () => void;
}

interface GuideStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'center' | 'bottom';
}

export function OnboardingGuide({ shareCode, userName, onComplete }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const { t: prefT } = usePreferences();

  const steps: GuideStep[] = [
    {
      title: prefT('Tudo pronto, {name}!', { name: userName }),
      description: prefT('Vamos fazer um tour rápido pelo app para você aproveitar ao máximo.'),
      icon: <Sparkles className="w-8 h-8 text-primary" />,
      position: 'center',
    },
    {
      title: prefT('Adicionar gastos'),
      description: prefT('Toque no botão + para registrar um novo gasto. Você pode dividir igualmente, por porcentagem ou valor fixo.'),
      icon: <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center"><Plus className="w-7 h-7 text-primary-foreground" /></div>,
      position: 'bottom',
    },
    {
      title: prefT('Resumo'),
      description: prefT('Na aba Resumo, você vê o saldo do mês, quem deve para quem, e os últimos gastos.'),
      icon: <Share2 className="w-8 h-8 text-primary" />,
      position: 'center',
    },
    {
      title: prefT('Histórico'),
      description: prefT('No Histórico, veja todos os gastos organizados por mês. Filtre por categoria e edite se precisar.'),
      icon: <Clock className="w-8 h-8 text-primary" />,
      position: 'center',
    },
    {
      title: prefT('Ocultar valores'),
      description: prefT('Toque no ícone do olho ao lado dos valores para ocultar ou mostrar os números. Útil em público!'),
      icon: <div className="flex gap-2"><Eye className="w-8 h-8 text-primary" /><EyeOff className="w-8 h-8 text-muted-foreground" /></div>,
      position: 'center',
    },
    {
      title: prefT('Convide alguém'),
      description: prefT('Use o botão Compartilhar no Resumo ou o código nos Ajustes para convidar seu parceiro(a).'),
      icon: <Share2 className="w-8 h-8 text-primary" />,
      position: 'center',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setVisible(false);
    localStorage.setItem(`onboarding_complete_${shareCode}`, 'true');
    onComplete();
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-scale-in">
        {/* Close button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={handleFinish}
            className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          {step.icon}
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentStep
                  ? "bg-primary w-4"
                  : index < currentStep
                  ? "bg-primary/50"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleFinish}
            className="flex-1 text-muted-foreground"
          >
            {prefT('Pular')}
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1"
          >
            {isLast ? prefT('Começar!') : prefT('Próximo')}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
