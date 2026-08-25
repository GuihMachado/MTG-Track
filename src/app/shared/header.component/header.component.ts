import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import {
  lucideChartColumn,
  lucideCrown,
  lucideLibraryBig,
  lucideHouse,
  lucideLogOut,
  lucideMenu,
  lucideMoon,
  lucidePrinter,
  lucideScrollText,
  lucideSearch,
  lucideSun,
  lucideSwords,
  lucideUser,
  lucideUserCog,
} from '@ng-icons/lucide';
import { ThemeService } from '../theme/theme.service';
import { ProfileService } from '../profile/profile.service';
import { SessionService } from '../session/session.service';

interface NavItem {
  route: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-header',
  imports: [
    BrnSheetImports,
    HlmSheetImports,
    HlmSeparatorImports,
    HlmDropdownMenuImports,
    RouterLink,
    RouterLinkActive,
    NgIcon,
    HlmIcon
  ],
  providers: [
    provideIcons({
      lucideChartColumn,
      lucideCrown,
      lucideLibraryBig,
      lucideSwords,
      lucideHouse,
      lucideLogOut,
      lucideSun,
      lucideMoon,
      lucidePrinter,
      lucideScrollText,
      lucideMenu,
      lucideSearch,
      lucideUser,
      lucideUserCog,
    }),
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  /** Home: o header fica sobre a arte do commander, sem barra nenhuma. */
  overArt = input(false);

  protected theme = inject(ThemeService);
  protected profile = inject(ProfileService);
  // Template chama session.confirmSignOut() direto: o header não decide nada
  // sobre a saída, só oferece o botão.
  protected session = inject(SessionService);
  private router = inject(Router);

  /**
   * Buscar carta entra no menu — era um FAB na home, que a Levitação tirou de
   * lá para o rodapé pertencer só a "nova partida". E "Jogar" saiu: levava para
   * a mesma /play da pílula da home, que está a um toque daqui.
   */
  protected readonly navItems: NavItem[] = [
    { route: '/dashboard', icon: 'lucideHouse', label: 'Home' },
    { route: '/matchs', icon: 'lucideSwords', label: 'Partidas' },
    { route: '/ranking', icon: 'lucideCrown', label: 'Ranking' },
    { route: '/estatisticas', icon: 'lucideChartColumn', label: 'Estatísticas' },
    { route: '/colecao', icon: 'lucideLibraryBig', label: 'Coleção' },
    { route: '/proxies', icon: 'lucidePrinter', label: 'Proxies' },
    { route: '/rules', icon: 'lucideScrollText', label: 'Regras da Casa' },
    { route: '/cards', icon: 'lucideSearch', label: 'Buscar carta' },
  ];

  protected goToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
