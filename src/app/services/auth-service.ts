import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginPayload {
  email: string;
  pin: string;
}

/** Cadastro sem senha: o PIN do primeiro acesso chega por email. */
export interface RegisterPayload {
  name: string;
  email: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

/** Login completo: sessão de 8h. */
export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/**
 * Login com o PIN temporário do email: ainda não é sessão. O `setupToken`
 * (15 min) só serve para criar o PIN próprio.
 */
export interface PinSetupResponse {
  mustSetPin: true;
  setupToken: string;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
}

export function needsPinSetup(response: LoginResponse | PinSetupResponse): response is PinSetupResponse {
  return 'mustSetPin' in response && response.mustSetPin === true;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  login(payload: LoginPayload): Observable<LoginResponse | PinSetupResponse> {
    return this.http.post<LoginResponse | PinSetupResponse>(`${this.apiUrl}/auth/login`, payload);
  }

  register(payload: RegisterPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/auth/register`, payload);
  }

  /** A resposta é a mesma exista a conta ou não. */
  forgotPin(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/auth/forgot-pin`, { email });
  }

  /**
   * Cria o PIN próprio. O token vai no header por aqui mesmo: ele não é a
   * sessão, e o interceptor não o sobrescreve (só põe o Bearer da sessão quando
   * a requisição ainda não traz um).
   */
  setPin(pin: string, setupToken: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/auth/set-pin`,
      { pin },
      { headers: new HttpHeaders({ Authorization: `Bearer ${setupToken}` }) },
    );
  }

  /** Troca com a sessão aberta. PIN atual errado volta como 400, não 401. */
  changePin(currentPin: string, newPin: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/auth/change-pin`, { currentPin, newPin });
  }
}
