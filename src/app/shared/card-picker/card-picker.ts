import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HlmAutocompleteImports } from '@spartan-ng/helm/autocomplete';
import { ScryfallService } from '../../services/scryfall-service';
import { extractImageUris, ScryfallCard } from '../../models/proxy.models';
import { NotificationService } from '../notification/notification.service';

/** Quantas sugestões mostrar — a Scryfall devolve até 175 por página. */
const MAX_SUGGESTIONS = 10;

/**
 * Busca de carta na Scryfall com seleção obrigatória: o valor do controle só
 * muda quando o usuário escolhe uma sugestão, então o nome gravado é sempre
 * o nome real da carta (e a imagem no histórico/banlist sempre resolve).
 *
 * Recebe o FormControl do pai em vez de implementar ControlValueAccessor —
 * o hlm-autocomplete interno já é o CVA.
 */
@Component({
  selector: 'app-card-picker',
  standalone: true,
  imports: [ReactiveFormsModule, HlmAutocompleteImports],
  templateUrl: './card-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardPicker {
  control = input.required<FormControl<string>>();
  placeholder = input('Buscar carta na Scryfall...');

  /** Carta escolhida (com imagens), para quem precisa de mais que o nome. */
  selected = output<ScryfallCard>();

  private scryfall = inject(ScryfallService);
  private notify = inject(NotificationService);

  protected options = signal<ScryfallCard[]>([]);
  protected loading = signal(false);

  /** Descarta resposta de uma busca já superada. */
  private searchSeq = 0;

  protected readonly cardToLabel = (card: ScryfallCard) => card.name;
  protected readonly cardToName = (card: ScryfallCard) => card.name;
  /** O valor guardado já é o nome: exibe como está ao reabrir o formulário. */
  protected readonly nameToSearch = (value: string) => value ?? '';
  protected readonly imagesOf = extractImageUris;

  protected onSearch(term: string): void {
    const query = term.trim();
    const seq = ++this.searchSeq;

    if (query.length < 3) {
      this.options.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.scryfall.search(query).subscribe({
      next: page => {
        if (seq !== this.searchSeq) return;
        this.options.set(page.data.slice(0, MAX_SUGGESTIONS));
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (seq !== this.searchSeq) return;
        this.options.set([]);
        this.loading.set(false);
        // 404 é "nenhuma carta com esse nome", não falha de rede.
        if (error instanceof HttpErrorResponse && error.status === 404) return;
        this.notify.apiError(error, { fallback: 'Não foi possível buscar na Scryfall agora.' });
      },
    });
  }

  protected onValueChange(value: unknown): void {
    if (typeof value !== 'string') return;
    const card = this.options().find(option => option.name === value);
    if (card) this.selected.emit(card);
  }
}
