import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideCrown, lucideHome, lucideJoystick, lucideMoon, lucideSun, lucideSwords } from '@ng-icons/lucide';
import { ThemeService } from '../theme/theme.service';

@Component({
  selector: 'app-header',
  imports: [
    BrnSheetImports,
    HlmSheetImports,
    HlmButtonImports,
    HlmSeparatorImports,
    RouterLink,
    RouterLinkActive,
    NgIcon,
    HlmIcon
  ],
  providers: [provideIcons({ lucideJoystick, lucideCrown, lucideSwords, lucideHome, lucideSun, lucideMoon })],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  private platformId = inject(PLATFORM_ID);
  protected theme = inject(ThemeService);

  protected userName: string = isPlatformBrowser(this.platformId)
    ? localStorage.getItem('user-name') || 'Usuário'
    : 'Usuário';
}
