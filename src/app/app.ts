import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { HeaderComponent } from './shared/header.component/header.component';
import { filter } from 'rxjs';
import { FooterComponent } from './shared/footer.component/footer.component';


@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HlmButtonImports,
    HlmToasterImports,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('MTG-ui');

  private router = inject(Router);
  
  private hiddenRoutes = ['/', '/register'];
  
  showHeader = signal(true);

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
    });
  } 
}
