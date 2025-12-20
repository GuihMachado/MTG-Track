import { Component } from '@angular/core';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideCrown, lucideHome, lucideJoystick, lucideSwords } from '@ng-icons/lucide';

@Component({
  selector: 'app-header',
  imports: [
    BrnSheetImports,
    HlmSheetImports,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSeparatorImports,
    RouterLink,
    NgIcon,
    HlmIcon
  ],
  providers: [provideIcons({ lucideJoystick, lucideCrown, lucideSwords, lucideHome })],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  protected userName: string = localStorage.getItem('user-name') || 'Usuario';
}
