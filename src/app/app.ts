import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { HeaderComponent } from './shared/header.component/header.component';
import { ThemeService } from './shared/theme/theme.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HlmButtonImports,
    HlmToasterImports,
    HeaderComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('MTG-ui');

  private router = inject(Router);

  // O toast usa a paleta clara ou escura junto com o resto do app.
  protected theme = inject(ThemeService);
  
  // Telas que desenham o próprio cabeçalho: login, cadastro, mesa e o fluxo de
  // nova partida (botão voltar, título e contador de lugares na própria tela).
  private hiddenRoutes = ['/', '/register', '/match', '/play'];

  showHeader = signal(true);
  /** Só na home o header fica sobre a arte do commander, sem barra. */
  overArt = signal(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const currentUrl = event.urlAfterRedirects;

      const shouldHide = this.hiddenRoutes.some(route => {
        if (route === '/') {
          return currentUrl === '/';
        }
        return currentUrl === route || currentUrl.startsWith(route + '/');
      });

      this.showHeader.set(!shouldHide);
      this.overArt.set(currentUrl.startsWith('/dashboard'));
    });
  } 
}
