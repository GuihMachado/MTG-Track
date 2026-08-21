import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Conta as navegações feitas dentro do app para saber se `history.back()` volta
 * para uma tela nossa ou joga o usuário fora da aplicação.
 * Precisa ser instanciado no boot (ver `App`) para não perder as primeiras rotas.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private visited = 0;

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.visited++);
  }

  get canGoBack(): boolean {
    return this.visited > 1;
  }
}
