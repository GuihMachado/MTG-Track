import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucideSearch } from '@ng-icons/lucide';
import { CardService } from '../../services/card-service';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { ManaSymbolPipe } from "../../shared/pipes/mana-symbol-pipe";
import { BackButton } from '../../shared/back-button/back-button';
import { NotificationService } from '../../shared/notification/notification.service';

@Component({
  selector: 'app-cards',
  imports: [
    HlmSeparatorImports,
    HlmInputGroupImports,
    NgIcon,
    HlmIcon,
    ReactiveFormsModule,
    AsyncPipe,
    ManaSymbolPipe,
    BackButton
],
  providers: [provideIcons({ lucideSearch })],
  templateUrl: './cards.html',
  styleUrl: './cards.css',
})
export class Cards {
  protected search = new FormControl('', { nonNullable: true });

  private cardService = inject(CardService);
  private notify = inject(NotificationService);

  protected card$ = this.search.valueChanges.pipe(
    debounceTime(500),
    distinctUntilChanged(),
    switchMap(term => {
      const query = term.trim();

      if (query.length < 3) {
        return of(null); 
      }

      return this.cardService.getCard(query).pipe(
        tap(card => {
          if (!card) {
            this.notify.warning(`Nenhum card encontrado para "${query}".`);
          }
        }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.notify.warning(`Nenhum card encontrado para "${query}".`);
          } else {
            this.notify.apiError(error, { fallback: 'Não foi possível buscar esse card agora.' });
          }

          return of(null);
        })
      );
    })
  );
}
