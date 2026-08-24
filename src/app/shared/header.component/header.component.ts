import { Component, input } from '@angular/core';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import {
  lucideCrown,
  lucideHouse,
  lucideJoystick,
  lucideMenu,
  lucideMoon,
  lucidePrinter,
  lucideScrollText,
  lucideSearch,
  lucideSun,
  lucideSwords,
} from '@ng-icons/lucide';
import { ThemeService } from '../theme/theme.service';
import { inject } from '@angular/core';

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
    RouterLink,
    RouterLinkActive,
    NgIcon,
    HlmIcon
  ],
  providers: [
    provideIcons({
      lucideJoystick,
      lucideCrown,
      lucideSwords,
      lucideHouse,
      lucideSun,
      lucideMoon,
      lucidePrinter,
      lucideScrollText,
      lucideMenu,
      lucideSearch,
    }),
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  /** Home: o header fica sobre a arte do commander, sem barra nenhuma. */
  overArt = input(false);

  protected theme = inject(ThemeService);

  /**
   * Buscar carta entra no menu — era um FAB na home, que a Levitação tirou de
   * lá para o rodapé pertencer só a "nova partida".
   */
  protected readonly navItems: NavItem[] = [
    { route: '/dashboard', icon: 'lucideHouse', label: 'Home' },
    { route: '/play', icon: 'lucideJoystick', label: 'Jogar' },
    { route: '/matchs', icon: 'lucideSwords', label: 'Partidas' },
    { route: '/ranking', icon: 'lucideCrown', label: 'Ranking' },
    { route: '/proxies', icon: 'lucidePrinter', label: 'Proxies' },
    { route: '/rules', icon: 'lucideScrollText', label: 'Regras da Casa' },
    { route: '/cards', icon: 'lucideSearch', label: 'Buscar carta' },
  ];
}
