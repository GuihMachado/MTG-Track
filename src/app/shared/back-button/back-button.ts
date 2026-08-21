import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { NavigationHistoryService } from '../navigation/navigation-history.service';

@Component({
  selector: 'app-back-button',
  imports: [HlmButtonImports, NgIcon, HlmIcon],
  providers: [provideIcons({ lucideChevronLeft })],
  templateUrl: './back-button.html',
})
export class BackButton {
  /** Rota usada quando o usuário abriu a página direto, sem histórico no app. */
  readonly fallbackRoute = input<string>('/dashboard');
  readonly label = input<string>('Voltar');

  private router = inject(Router);
  private history = inject(NavigationHistoryService);

  protected goBack() {
    if (this.history.canGoBack) {
      window.history.back();
      return;
    }

    this.router.navigateByUrl(this.fallbackRoute());
  }
}
