import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { HeaderComponent } from './shared/header.component/header.component';
import { ThemeService } from './shared/theme/theme.service';
import { ProfileService } from './shared/profile/profile.service';
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
  // O header e o assento da nova partida leem o perfil daqui.
  private profile = inject(ProfileService);
  
  // Telas que desenham o próprio cabeçalho: login, cadastro, mesa e nova
  // partida (botão voltar, título e contador de lugares na própria tela).
  // A coleção fica de fora de propósito: ela tem voltar e título próprios,
  // mas o menu e o avatar do header valem lá também. Os filhos dela
  // (importar, fichário) continuam em tela cheia.
  private hiddenRoutes = [
    '/',
    '/register',
    '/match',
    '/play',
    '/colecao/importar',
    '/colecao/edicao',
    '/decks',
  ];

  // Estatísticas: a lista convive com o header (menu e avatar valem lá);
  // só os detalhes (deck e confrontos) desenham o próprio cabeçalho com
  // voltar. Lista separada porque aqui o pai mostra e SÓ os filhos escondem —
  // em hiddenRoutes o pai esconderia junto.
  private hiddenChildRoutes = ['/estatisticas'];

  showHeader = signal(true);
  /** Só na home o header fica sobre a arte do commander, sem barra. */
  overArt = signal(false);

  constructor() {
    this.profile.load();
    // Semeado antes do primeiro NavigationEnd: sem isso a home nasce com o
    // respiro do header e a arte "pula" 56px quando o evento chega.
    this.overArt.set(this.router.url.startsWith('/dashboard'));

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Sem a query e sem o fragmento: /colecao?edicao=hob é a mesma tela que
      // /colecao, e ela desenha o próprio cabeçalho.
      const currentUrl = String(event.urlAfterRedirects).split(/[?#]/)[0];

      const shouldHide = this.hiddenRoutes.some(route => {
        if (route === '/') {
          return currentUrl === '/';
        }
        return currentUrl === route || currentUrl.startsWith(route + '/');
      }) || this.hiddenChildRoutes.some(route => currentUrl.startsWith(route + '/'));

      this.showHeader.set(!shouldHide);
      this.overArt.set(currentUrl.startsWith('/dashboard'));
    });
  } 
}
