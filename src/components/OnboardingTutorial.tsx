import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { usePreferences } from '@/contexts/PreferencesContext';
import {
  Heart,
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Share2,
  Plus,
  BarChart3,
  Scale,
  Home,
  Settings,
  Clock,
  ChevronRight,
  Wallet,
  PieChart,
  Lightbulb,
  CreditCard,
  Split,
} from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  illustration?: 'cats' | 'share' | 'expense' | 'balance' | 'stats' | 'tabs' | 'split' | 'history';
  highlight?: string;
}

interface OnboardingTutorialProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  context: 'welcome' | 'after-profile' | 'after-join' | 'full-tour';
}

const TUTORIAL_STORAGE_KEY = 'contacasal_tutorial_completed';
const FULL_TOUR_STORAGE_KEY = 'contacasal_full_tour_completed';

export function OnboardingTutorial({ open, onClose, onComplete, context }: OnboardingTutorialProps) {
  const { t } = usePreferences();
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Reset step when opening
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setIsExiting(false);
    }
  }, [open]);

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
          description: t('Seu gatinho está pronto! Agora vou te mostrar como usar o app.'),
          icon: <Check className="w-8 h-8 text-emerald-500" />,
          illustration: 'cats',
        },
        {
          id: 'home-tab',
          title: t('Tela inicial'),
          description: t('Aqui você vê o resumo: quem deve quanto a quem, gastos recentes e dicas da IA sobre suas finanças.'),
          icon: <Home className="w-8 h-8 text-blue-500" />,
          illustration: 'balance',
        },
        {
          id: 'add-expense',
          title: t('Adicionar gasto'),
          description: t('Toque no botão + para registrar uma despesa. Escolha quem pagou, o valor, e como dividir!'),
          icon: <Plus className="w-8 h-8 text-primary" />,
          illustration: 'expense',
        },
        {
          id: 'split-options',
          title: t('Opções de divisão'),
          description: t('Divida 50/50, por porcentagem, valor fixo, ou 100% para um. Você decide como funciona!'),
          icon: <Split className="w-8 h-8 text-purple-500" />,
          illustration: 'split',
        },
        {
          id: 'history-tab',
          title: t('Histórico'),
          description: t('Veja todos os gastos registrados, filtre por mês ou categoria, e edite se precisar.'),
          icon: <Clock className="w-8 h-8 text-orange-500" />,
          illustration: 'history',
        },
        {
          id: 'stats-tab',
          title: t('Estatísticas'),
          description: t('Acompanhe para onde vai seu dinheiro com gráficos bonitos e insights úteis.'),
          icon: <PieChart className="w-8 h-8 text-cyan-500" />,
          illustration: 'stats',
        },
        {
          id: 'settings-tab',
          title: t('Ajustes'),
          description: t('Personalize seu perfil, gerencie cartões, categorias e acordos recorrentes.'),
          icon: <Settings className="w-8 h-8 text-gray-500" />,
          illustration: 'tabs',
        },
        {
          id: 'share-invite',
          title: t('Convide alguém!'),
          description: t('Use o botão "Compartilhar" no topo para enviar o link. A pessoa cria o perfil dela e vocês já podem começar!'),
          icon: <Share2 className="w-8 h-8 text-pink-500" />,
          illustration: 'share',
        },
        {
          id: 'ready',
          title: t('Tudo pronto!'),
          description: t('Agora é só registrar os gastos e deixar o app fazer a mágica. Bora dividir!'),
          icon: <Sparkles className="w-8 h-8 text-amber-500" />,
          illustration: 'cats',
        },
      ];
    }

    if (context === 'after-join') {
      return [
        {
          id: 'joined',
          title: t('Você entrou no espaço!'),
          description: t('Agora você faz parte deste espaço compartilhado. Deixa eu te mostrar como funciona!'),
          icon: <Check className="w-8 h-8 text-emerald-500" />,
          illustration: 'cats',
        },
        {
          id: 'home-explained',
          title: t('Tela de resumo'),
          description: t('Aqui você vê o equilíbrio entre todos. Quem deve quanto a quem aparece automaticamente!'),
          icon: <Home className="w-8 h-8 text-blue-500" />,
          illustration: 'balance',
        },
        {
          id: 'add-expense',
          title: t('Registre gastos'),
          description: t('Toque no + para adicionar. Escolha quem pagou e como dividir - o resto é automático!'),
          icon: <Plus className="w-8 h-8 text-primary" />,
          illustration: 'expense',
        },
        {
          id: 'split-explained',
          title: t('Divisão inteligente'),
          description: t('Cada gasto pode ser dividido diferente: 50/50, porcentagem, ou um paga tudo. Você escolhe!'),
          icon: <Split className="w-8 h-8 text-purple-500" />,
          illustration: 'split',
        },
        {
          id: 'navigation',
          title: t('Navegação'),
          description: t('Use as abas: Resumo (casa), Histórico (relógio), Estatísticas (gráfico) e Ajustes (engrenagem).'),
          icon: <BarChart3 className="w-8 h-8 text-cyan-500" />,
          illustration: 'tabs',
        },
        {
          id: 'ready',
          title: t('Bora começar!'),
          description: t('Registre seu primeiro gasto e veja a mágica acontecer!'),
          icon: <Sparkles className="w-8 h-8 text-amber-500" />,
          illustration: 'cats',
        },
      ];
    }

    // full-tour - complete walkthrough
    return [
      {
        id: 'tour-start',
        title: t('Tour completo do app'),
        description: t('Vou te mostrar todas as funcionalidades do Conta de Casal!'),
        icon: <Lightbulb className="w-8 h-8 text-amber-500" />,
        illustration: 'cats',
      },
      {
        id: 'balance-concept',
        title: t('Como funciona o equilíbrio'),
        description: t('Quando você paga algo dividido, a outra pessoa fica te devendo. O app calcula tudo automaticamente!'),
        icon: <Scale className="w-8 h-8 text-emerald-500" />,
        illustration: 'balance',
        highlight: t('Ex: Você paga R$100 dividido 50/50 = a pessoa te deve R$50'),
      },
      {
        id: 'add-expense-detail',
        title: t('Adicionar um gasto'),
        description: t('Toque em + > Digite o valor > Escolha quem pagou > Selecione a divisão > Adicione categoria > Pronto!'),
        icon: <Plus className="w-8 h-8 text-primary" />,
        illustration: 'expense',
      },
      {
        id: 'split-types',
        title: t('Tipos de divisão'),
        description: t('50/50: divide igual | Porcentagem: você define % de cada | Fixo: valores específicos | 100%: sem divisão'),
        icon: <Split className="w-8 h-8 text-purple-500" />,
        illustration: 'split',
      },
      {
        id: 'cards-feature',
        title: t('Cartões de crédito'),
        description: t('Cadastre seus cartões! O app calcula a fatura considerando a data de fechamento.'),
        icon: <CreditCard className="w-8 h-8 text-blue-500" />,
        illustration: 'expense',
      },
      {
        id: 'history-feature',
        title: t('Histórico de gastos'),
        description: t('Veja tudo que foi registrado, edite ou exclua. Filtre por mês, categoria ou pessoa.'),
        icon: <Clock className="w-8 h-8 text-orange-500" />,
        illustration: 'history',
      },
      {
        id: 'stats-feature',
        title: t('Estatísticas'),
        description: t('Gráficos mostram para onde vai seu dinheiro. Descubra em que categoria vocês mais gastam!'),
        icon: <PieChart className="w-8 h-8 text-cyan-500" />,
        illustration: 'stats',
      },
      {
        id: 'ai-feature',
        title: t('Assistente IA'),
        description: t('O app aprende seus padrões e dá dicas personalizadas sobre economia e tendências de gastos.'),
        icon: <Sparkles className="w-8 h-8 text-pink-500" />,
        illustration: 'cats',
      },
      {
        id: 'settlement',
        title: t('Acertar as contas'),
        description: t('Quando quiser zerar o saldo, vá em Ajustes > Acertar contas. Registre o pagamento e pronto!'),
        icon: <Wallet className="w-8 h-8 text-emerald-500" />,
        illustration: 'balance',
      },
      {
        id: 'tour-end',
        title: t('Você é um expert!'),
        description: t('Agora você sabe tudo! Qualquer dúvida, explore o app - é intuitivo e feito com carinho.'),
        icon: <Heart className="w-8 h-8 text-pink-500" />,
        illustration: 'cats',
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
      if (context === 'full-tour') {
        localStorage.setItem(FULL_TOUR_STORAGE_KEY, 'true');
      }
      onClose();
    }, 200);
  };

  const handleComplete = () => {
    setIsExiting(true);
    setTimeout(() => {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      if (context === 'full-tour') {
        localStorage.setItem(FULL_TOUR_STORAGE_KEY, 'true');
      }
      onComplete();
    }, 200);
  };

  const renderIllustration = (type?: string) => {
    switch (type) {
      case 'cats':
        return (
          <div className="flex justify-center items-center gap-4 py-6">
            <Avatar
              avatarIndex={1}
              size="xl"
              className="w-20 h-20 shadow-lg animate-bounce-gentle ring-4 ring-pink-200"
              animateOnHover={false}
              showBackground={false}
            />
            <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center animate-pulse">
              <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
            </div>
            <Avatar
              avatarIndex={2}
              size="xl"
              className="w-20 h-20 shadow-lg animate-bounce-gentle ring-4 ring-blue-200"
              animateOnHover={false}
              showBackground={false}
            />
          </div>
        );

      case 'share':
        return (
          <div className="flex justify-center py-6">
            <div className="relative">
              <div className="flex -space-x-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Avatar
                    key={i}
                    avatarIndex={i + 1}
                    size="xl"
                    className={cn(
                      "w-14 h-14 shadow-lg ring-2 ring-white",
                      i > 2 && "opacity-50"
                    )}
                    animateOnHover={false}
                    showBackground={false}
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
              <Avatar
                avatarIndex={3}
                size="xl"
                className="w-14 h-14 shadow-lg ring-2 ring-amber-200"
                animateOnHover={false}
                showBackground={false}
              />
              <span className="text-xs mt-1 font-medium">Ana</span>
            </div>
            <div className="flex flex-col items-center px-4">
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm font-bold mt-1">R$ 75</span>
            </div>
            <div className="flex flex-col items-center">
              <Avatar
                avatarIndex={4}
                size="xl"
                className="w-14 h-14 shadow-lg ring-2 ring-emerald-200"
                animateOnHover={false}
                showBackground={false}
              />
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

      case 'tabs':
        return (
          <div className="flex justify-center py-6">
            <div className="bg-card border rounded-2xl p-4 shadow-lg">
              <div className="flex gap-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Resumo</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Histórico</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Stats</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ajustes</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'split':
        return (
          <div className="flex justify-center py-6">
            <div className="grid grid-cols-2 gap-3 w-64">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <span className="text-lg font-bold text-emerald-600">50/50</span>
                <p className="text-[10px] text-emerald-600/70 mt-1">Divide igual</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <span className="text-lg font-bold text-blue-600">70/30</span>
                <p className="text-[10px] text-blue-600/70 mt-1">Porcentagem</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                <span className="text-lg font-bold text-purple-600">R$ 80</span>
                <p className="text-[10px] text-purple-600/70 mt-1">Valor fixo</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <span className="text-lg font-bold text-amber-600">100%</span>
                <p className="text-[10px] text-amber-600/70 mt-1">Sem divisão</p>
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="flex justify-center py-6">
            <div className="bg-card border rounded-2xl p-3 shadow-lg w-64 space-y-2">
              {[
                { name: 'Mercado', value: 'R$ 150', color: 'bg-orange-100' },
                { name: 'Restaurante', value: 'R$ 80', color: 'bg-pink-100' },
                { name: 'Luz', value: 'R$ 120', color: 'bg-yellow-100' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-full", item.color)} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
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
          <div className="flex justify-center gap-1.5 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === currentStep
                    ? "w-6 bg-primary"
                    : index < currentStep
                    ? "w-3 bg-primary/50"
                    : "w-3 bg-muted"
                )}
              />
            ))}
          </div>

          {/* Step counter */}
          <p className="text-center text-xs text-muted-foreground mb-4">
            {currentStep + 1} / {steps.length}
          </p>

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
  const [hasSeenFullTour, setHasSeenFullTour] = useState(true);

  useEffect(() => {
    const seenTutorial = localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
    const seenFullTour = localStorage.getItem(FULL_TOUR_STORAGE_KEY) === 'true';
    setHasSeenTutorial(seenTutorial);
    setHasSeenFullTour(seenFullTour);
  }, []);

  const markAsSeen = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setHasSeenTutorial(true);
  };

  const markFullTourAsSeen = () => {
    localStorage.setItem(FULL_TOUR_STORAGE_KEY, 'true');
    setHasSeenFullTour(true);
  };

  const reset = () => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    localStorage.removeItem(FULL_TOUR_STORAGE_KEY);
    setHasSeenTutorial(false);
    setHasSeenFullTour(false);
  };

  return { hasSeenTutorial, hasSeenFullTour, markAsSeen, markFullTourAsSeen, reset };
}
