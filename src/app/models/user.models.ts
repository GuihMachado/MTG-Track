/** Perfil do usuário logado. `avatar` é uma data URL, ou null quando não há ícone. */
export interface UserProfile {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
}

/** Só o que o próprio usuário pode alterar. */
export interface ProfileUpdatePayload {
  name?: string;
  email?: string;
  avatar?: string | null;
}

/** Jogador na lista de escolha da mesa — sem email, que a mesa não usa. */
export interface PlayerOption {
  id: number;
  name: string;
  avatar: string | null;
}
