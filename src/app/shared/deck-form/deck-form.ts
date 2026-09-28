import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { CardPicker } from '../card-picker/card-picker';
import { ManaSymbolPipe } from '../pipes/mana-symbol-pipe';
import { ScryfallCard } from '../../models/proxy.models';
import { identityOf, ManaCode, toggleColor } from '../deck-choice';

export interface DeckFormValue {
  name: string;
  /** Nome exibido do commander — o escolhido agora ou o que o deck já tinha. */
  commanderName: string;
  /** Só existe quando o commander foi escolhido nesta edição: é o que o servidor busca. */
  commanderScryfallId: string | null;
  colors: ManaCode[];
}

export function emptyDeckForm(): DeckFormValue {
  return { name: '', commanderName: '', commanderScryfallId: null, colors: [] };
}

const ORBS: { code: ManaCode; label: string }[] = [
  { code: 'W', label: 'Branco' },
  { code: 'U', label: 'Azul' },
  { code: 'B', label: 'Preto' },
  { code: 'R', label: 'Vermelho' },
  { code: 'G', label: 'Verde' },
];

/**
 * Nome, commander e cores de um deck — o formulário da tela de deck e da folha
 * rápida da partida. Escolher o commander acende as orbes pela identidade de
 * cor dele; depois que a pessoa mexe numa orbe, trocar o commander não desfaz o
 * ajuste (commander com parceiro, deck que ignora uma cor da identidade).
 */
@Component({
  selector: 'app-deck-form',
  standalone: true,
  imports: [CardPicker, ManaSymbolPipe],
  templateUrl: './deck-form.html',
  styleUrl: './deck-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckForm implements OnInit {
  value = model.required<DeckFormValue>();
  /** Prefixo dos ids dos campos — duas instâncias na mesma tela não colidem. */
  idPrefix = input('deck');

  protected readonly orbs = ORBS.map(orb => ({ ...orb, rgb: `var(--mana-${orb.code.toLowerCase()}-rgb)` }));

  /** O card-picker trabalha com FormControl; o valor dele é o nome do commander. */
  protected commanderControl = new FormControl<string>('', { nonNullable: true });

  /** A pessoa já ajustou as cores à mão: o commander não as sobrescreve mais. */
  private colorsTouched = signal(false);

  protected namePlaceholder = computed(() => this.value().commanderName || 'Nome do deck');

  protected colorHint = computed(() => {
    const value = this.value();
    if (!value.commanderName) return 'Escolha o commander e as cores acendem sozinhas.';
    if (this.colorsTouched()) return 'Ajustadas à mão. Toque para mudar.';
    return `Acesas pela identidade de ${value.commanderName.split(',')[0]}. Toque para ajustar.`;
  });

  ngOnInit(): void {
    const current = this.value();
    this.commanderControl.setValue(current.commanderName);
    // Deck existente: as cores gravadas já são a escolha do dono.
    if (current.commanderName) this.colorsTouched.set(true);
  }

  protected setName(name: string): void {
    this.value.update(value => ({ ...value, name }));
  }

  protected onCommander(card: ScryfallCard): void {
    this.value.update(value => ({
      ...value,
      commanderName: card.name,
      commanderScryfallId: card.id,
      colors: this.colorsTouched() ? value.colors : identityOf(card),
    }));
  }

  protected toggle(code: ManaCode): void {
    this.colorsTouched.set(true);
    this.value.update(value => ({ ...value, colors: toggleColor(value.colors, code) }));
  }

  protected isOn(code: ManaCode): boolean {
    return this.value().colors.includes(code);
  }
}
