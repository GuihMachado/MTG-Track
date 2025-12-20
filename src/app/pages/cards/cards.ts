import { Component, inject } from '@angular/core';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucideSearch } from '@ng-icons/lucide';
import { CardService } from '../../services/card-service';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, filter, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-cards',
  imports: [
    HlmSeparatorImports,
    HlmInputGroupImports,
    NgIcon,
    ReactiveFormsModule,
    AsyncPipe
  ],
  providers: [provideIcons({ lucideSearch })],
  templateUrl: './cards.html',
  styleUrl: './cards.css',
})
export class Cards {
  protected search = new FormControl('', { nonNullable: true });
  protected card: any = null;
  private cardService = inject(CardService);
  private readonly destroy = new Subject<void>();

  protected card$ = this.search.valueChanges.pipe(
    debounceTime(500),
    distinctUntilChanged(),
    switchMap(term => {
      if (!term || term.length < 3) {
        return of(null); 
      }

      return this.cardService.getCard(term).pipe(
        catchError(error => {
          console.warn('Erro:', error);
          return of(null);
        })
      );
    })
  );


  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }
}
