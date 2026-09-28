import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideX } from '@ng-icons/lucide';
import { DeckForm, DeckFormValue, emptyDeckForm } from '../../../shared/deck-form/deck-form';
import { NotificationService } from '../../../shared/notification/notification.service';
import { DeckService } from '../../../services/deck-service';
import { DeckOption } from '../../../models/collection.models';
import { orderWubrg } from '../../../shared/deck-choice';
import { PlayerOption } from '../../../models/user.models';

/**
 * "+ Novo deck" dentro da partida: a versão curta do formulário (nome,
 * commander e cores), sem bloco de lista — a mesa está esperando.
 *
 * O deck nasce na conta do **jogador do assento**, mesmo quando outra pessoa
 * está com o celular. A folha diz isso numa linha, com o avatar do dono, porque
 * é a única escrita do app numa conta alheia.
 */
@Component({
  selector: 'app-quick-deck-sheet',
  standalone: true,
  imports: [NgIcon, HlmIcon, DeckForm],
  providers: [provideIcons({ lucideX })],
  templateUrl: './quick-deck-sheet.html',
  styleUrls: ['../seat-sheet.css', './quick-deck-sheet.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickDeckSheet {
  player = input.required<PlayerOption>();
  seatNumber = input.required<number>();

  created = output<DeckOption>();
  closed = output<void>();

  private decks = inject(DeckService);
  private notify = inject(NotificationService);

  protected form = signal<DeckFormValue>(emptyDeckForm());
  protected saving = signal(false);

  protected canSave = computed(() => !this.saving() && this.form().commanderName.length > 0);

  protected initial = computed(() => this.player().name.trim().charAt(0).toUpperCase() || '?');

  protected save(): void {
    if (!this.canSave()) {
      if (!this.form().commanderName) this.notify.warning('Escolha o commander do deck.');
      return;
    }

    const value = this.form();
    this.saving.set(true);
    this.decks
      .createFor(this.player().id, {
        name: value.name.trim() || value.commanderName,
        ...(value.commanderScryfallId ? { commanderScryfallId: value.commanderScryfallId } : {}),
        colors: orderWubrg(value.colors),
      })
      .subscribe({
        next: deck => {
          this.saving.set(false);
          this.notify.success(`${deck.name} criado na conta de ${deck.owner.name}.`);
          this.created.emit(deck);
        },
        error: error => {
          this.saving.set(false);
          this.notify.apiError(error, { fallback: 'Não foi possível criar o deck.' });
        },
      });
  }

  @HostListener('document:keydown.escape')
  protected close(): void {
    if (!this.saving()) this.closed.emit();
  }
}
