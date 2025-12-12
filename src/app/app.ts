import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';


@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HlmButtonImports,
    HlmToasterImports
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('MTG-ui');
}
