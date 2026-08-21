import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { toast } from 'ngx-sonner';
import { isSessionExpired } from '../http/session-expired';

export interface NotificationOptions {
  description?: string;
  duration?: number;
  /** Reaproveitar o mesmo id substitui o toast anterior em vez de empilhar. */
  id?: number | string;
}

export interface ApiErrorOptions extends NotificationOptions {
  /** Mensagem usada quando não há nada melhor para mostrar. */
  fallback?: string;
  /** Mensagens escritas para status específicos desta chamada. */
  byStatus?: Record<number, string>;
}

export interface ConfirmOptions extends NotificationOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
}

const STATUS_MESSAGES: Record<number, string> = {
  0: 'Servidor fora do ar. Verifique se a API está rodando.',
  400: 'Dados inválidos. Revise os campos e tente novamente.',
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Não encontramos o que você procurou.',
  409: 'Esse registro já existe.',
  422: 'Dados inválidos. Revise os campos e tente novamente.',
  500: 'Erro interno no servidor. Tente novamente em instantes.',
  502: 'Servidor indisponível. Tente novamente em instantes.',
  503: 'Servidor indisponível. Tente novamente em instantes.',
};

const DEFAULT_FALLBACK = 'Não foi possível concluir a operação.';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  success(message: string, options: NotificationOptions = {}) {
    return toast.success(message, this.payload(options));
  }

  error(message: string, options: NotificationOptions = {}) {
    return toast.error(message, this.payload(options));
  }

  warning(message: string, options: NotificationOptions = {}) {
    return toast.warning(message, this.payload(options));
  }

  info(message: string, options: NotificationOptions = {}) {
    return toast.info(message, this.payload(options));
  }

  loading(message: string, options: NotificationOptions = {}) {
    return toast.loading(message, this.payload(options));
  }

  dismiss(id?: number | string) {
    return toast.dismiss(id);
  }

  /** Aviso com botão de ação, para confirmar algo destrutivo sem sair da tela. */
  confirm(message: string, onConfirm: () => void, options: ConfirmOptions = {}) {
    const { confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onCancel, ...rest } = options;

    return toast.warning(message, {
      ...rest,
      duration: rest.duration ?? 10000,
      action: { label: confirmLabel, onClick: () => onConfirm() },
      cancel: { label: cancelLabel, onClick: () => onCancel?.() },
    });
  }

  /**
   * Traduz uma falha de requisição em um toast legível.
   * Prioridade: `byStatus` > mensagem da API > texto padrão do status > `fallback`.
   */
  apiError(error: unknown, options: ApiErrorOptions = {}) {
    const { fallback = DEFAULT_FALLBACK, byStatus = {}, ...rest } = options;

    // O interceptor já avisou que a sessão caiu; um segundo toast só poluiria a tela.
    if (isSessionExpired(error)) {
      return null;
    }

    return toast.error(this.resolveMessage(error, byStatus, fallback), this.payload(rest));
  }

  /**
   * Um toast que reusa o mesmo `id` herda tudo que não for sobrescrito, então as
   * chaves opcionais vão sempre explícitas para não arrastar o conteúdo anterior.
   */
  private payload(options: NotificationOptions) {
    return {
      ...options,
      description: options.description,
      action: undefined,
      cancel: undefined,
    };
  }

  /** A mensagem que a API mandou nesta falha, ou o texto de reserva. */
  messageFrom(error: unknown, fallback: string): string {
    const fromBody = error instanceof HttpErrorResponse ? this.readBodyMessage(error.error) : null;
    return fromBody ?? fallback;
  }

  private resolveMessage(error: unknown, byStatus: Record<number, string>, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      console.error('Falha inesperada:', error);
      return fallback;
    }

    const explicit = byStatus[error.status];
    if (explicit) {
      return explicit;
    }

    const fromBody = this.readBodyMessage(error.error);
    if (fromBody) {
      return fromBody;
    }

    return STATUS_MESSAGES[error.status] ?? fallback;
  }

  /** A API responde em formatos diferentes: string, { message }, { error } ou lista de erros. */
  private readBodyMessage(body: unknown): string | null {
    if (typeof body === 'string') {
      const text = body.trim();
      return text && !text.startsWith('<') ? text : null;
    }

    if (!body || typeof body !== 'object') {
      return null;
    }

    const record = body as Record<string, unknown>;

    for (const key of ['message', 'error', 'msg', 'detail'] as const) {
      const value = record[key];

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }

      if (Array.isArray(value)) {
        const joined = value.filter((item): item is string => typeof item === 'string').join(' ');
        if (joined.trim()) {
          return joined.trim();
        }
      }
    }

    return null;
  }
}
