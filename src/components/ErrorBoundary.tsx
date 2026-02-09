import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  debugUnlocked: boolean;
  lastCopiedAt?: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    debugUnlocked: false,
  };

  private tapCount = 0;
  private lastTapAt = 0;

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, debugUnlocked: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleTitleTap = () => {
    const now = Date.now();
    const withinWindow = now - this.lastTapAt <= 1200;
    this.lastTapAt = now;

    this.tapCount = withinWindow ? this.tapCount + 1 : 1;
    if (this.tapCount >= 7 && !this.state.debugUnlocked) {
      this.setState({ debugUnlocked: true });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private getDiagnosticText = () => {
    const err = this.state.error;
    const parts: string[] = [];
    parts.push('Conta de Casal — Diagnóstico');
    parts.push(`Data: ${new Date().toISOString()}`);
    parts.push(`URL: ${window.location.href}`);
    parts.push(`User-Agent: ${navigator.userAgent}`);
    parts.push(`Modo: ${import.meta.env.MODE}`);
    parts.push('');
    if (err) {
      parts.push(`Erro: ${err.name}: ${err.message}`);
      if (err.stack) {
        parts.push('');
        parts.push('Stack:');
        parts.push(err.stack);
      }
    } else {
      parts.push('Erro: (não disponível)');
    }
    return parts.join('\n');
  };

  private handleCopyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(this.getDiagnosticText());
      this.setState({ lastCopiedAt: Date.now() });
    } catch {
      // ignore (clipboard can be blocked by browser permissions)
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const showCopied = this.state.lastCopiedAt && Date.now() - this.state.lastCopiedAt < 2500;
      const errorMessage = this.state.error?.message;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-sm animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1
              className="text-xl font-semibold text-foreground mb-2 select-none"
              onClick={this.handleTitleTap}
              role="button"
              aria-label="Título (toque 7x para diagnóstico)"
              tabIndex={0}
            >
              Algo deu errado
            </h1>
            <p className="text-muted-foreground mb-6">
              Ocorreu um erro inesperado. Por favor, tente novamente.
            </p>

            {this.state.debugUnlocked && (
              <div className="mb-4 text-left rounded-lg border bg-muted/30 p-3">
                <div className="text-xs font-medium text-foreground mb-1">Diagnóstico</div>
                <div className="text-xs text-muted-foreground break-words">
                  {errorMessage ? errorMessage : 'Sem mensagem de erro disponível.'}
                </div>
                <div className="mt-2 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={this.handleCopyDiagnostics}>
                    <Copy className="w-4 h-4 mr-2" />
                    {showCopied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Dica: toque 7x no título para ativar isso. Você pode me enviar o texto copiado.
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={this.handleReload} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Recarregar página
              </Button>
              <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                Voltar ao início
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
