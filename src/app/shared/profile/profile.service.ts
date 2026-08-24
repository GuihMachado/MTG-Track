import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserService } from '../../services/user-service';
import { ProfileUpdatePayload, UserProfile } from '../../models/user.models';
import { Observable, tap } from 'rxjs';

const NAME_KEY = 'user-name';
const ID_KEY = 'user-id';
const AVATAR_KEY = 'user-avatar';

/**
 * Perfil do usuário logado, em signal — o header, o formulário de nova partida
 * e a tela de perfil leem daqui, então trocar o ícone atualiza os três de uma
 * vez (zoneless: precisa ser signal, ver o padrão do resto do app).
 *
 * O nome e o ícone ficam espelhados no localStorage para o header já nascer
 * pintado, antes de a chamada de perfil voltar.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private platformId = inject(PLATFORM_ID);
  private userService = inject(UserService);

  readonly profile = signal<UserProfile | null>(null);

  /** Iniciais para quando não há ícone: uma letra basta no avatar de 38px. */
  readonly initial = computed(() => {
    const name = this.profile()?.name?.trim();
    return name ? name.charAt(0).toUpperCase() : '';
  });

  readonly avatar = computed(() => this.profile()?.avatar ?? null);

  constructor() {
    this.hydrateFromStorage();
  }

  /** Chamado quando o app abre logado, e depois de salvar o perfil. */
  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const id = Number(localStorage.getItem(ID_KEY));
    if (!id || !localStorage.getItem('auth-token')) return;

    this.userService.getUser(id).subscribe({
      next: profile => this.apply(profile),
      // Falha silenciosa de propósito: o header segue com o que veio do
      // localStorage, e o erro real aparece na tela de perfil.
      error: () => undefined,
    });
  }

  save(payload: ProfileUpdatePayload): Observable<UserProfile> {
    const id = this.profile()?.id ?? Number(localStorage.getItem(ID_KEY));
    return this.userService.updateProfile(id, payload).pipe(tap(profile => this.apply(profile)));
  }

  /** Limpa o perfil no logout / sessão expirada. */
  clear(): void {
    this.profile.set(null);
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem(AVATAR_KEY);
  }

  private apply(profile: UserProfile): void {
    this.profile.set(profile);
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.setItem(NAME_KEY, profile.name);
    localStorage.setItem(ID_KEY, String(profile.id));

    if (profile.avatar) {
      localStorage.setItem(AVATAR_KEY, profile.avatar);
    } else {
      localStorage.removeItem(AVATAR_KEY);
    }
  }

  private hydrateFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const id = Number(localStorage.getItem(ID_KEY));
    if (!id) return;

    this.profile.set({
      id,
      name: localStorage.getItem(NAME_KEY) ?? 'Usuário',
      // O email não é espelhado: quem precisa dele é a tela de perfil, que
      // sempre busca o perfil do servidor.
      email: '',
      avatar: localStorage.getItem(AVATAR_KEY),
    });
  }
}
