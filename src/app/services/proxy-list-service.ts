import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  DEFAULT_PRINT_SETTINGS,
  extractImageUris,
  PrintSettings,
  ProxyCard,
  ScryfallCard,
} from '../models/proxy.models';

const LIST_KEY = 'proxy-list-v1';
const SETTINGS_KEY = 'proxy-print-settings-v1';

/**
 * Lista de impressão + configurações do estúdio, globais e persistentes:
 * o fluxo real é buscar cartas em várias visitas e imprimir depois.
 */
@Injectable({ providedIn: 'root' })
export class ProxyListService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private _list = signal<ProxyCard[]>(this.hydrate<ProxyCard[]>(LIST_KEY, []));
  private _settings = signal<PrintSettings>({
    ...DEFAULT_PRINT_SETTINGS,
    ...this.hydrate<Partial<PrintSettings>>(SETTINGS_KEY, {}),
  });

  readonly list = this._list.asReadonly();
  readonly settings = this._settings.asReadonly();
  readonly totalModels = computed(() => this._list().length);
  readonly totalCards = computed(() => this._list().reduce((sum, card) => sum + card.quantity, 0));

  constructor() {
    effect(() => this.persist(LIST_KEY, this._list()));
    effect(() => this.persist(SETTINGS_KEY, this._settings()));
  }

  addFromScryfall(card: ScryfallCard): void {
    const images = extractImageUris(card);
    if (!images) return; // resultado sem imagem não vira proxy

    if (this.incrementByName(card.name)) return;

    this._list.update(list => [
      ...list,
      {
        id: crypto.randomUUID(),
        scryfallId: card.id,
        name: card.name,
        setName: card.set_name,
        setCode: card.set?.toUpperCase(),
        typeLine: card.card_faces?.[0]?.type_line ?? card.type_line,
        manaCost: card.mana_cost || card.card_faces?.[0]?.mana_cost,
        colors: card.colors,
        imageUrl: images.normal,
        largeImageUrl: images.large,
        quantity: 1,
      },
    ]);
  }

  addManual(name: string, imageUrl: string): void {
    if (this.incrementByName(name)) return;

    this._list.update(list => [
      ...list,
      { id: crypto.randomUUID(), name: name.trim(), imageUrl: imageUrl.trim(), quantity: 1 },
    ]);
  }

  increment(id: string): void {
    this._list.update(list =>
      list.map(card => (card.id === id ? { ...card, quantity: card.quantity + 1 } : card)),
    );
  }

  decrement(id: string): void {
    this._list.update(list =>
      list.map(card => (card.id === id ? { ...card, quantity: Math.max(1, card.quantity - 1) } : card)),
    );
  }

  remove(id: string): void {
    this._list.update(list => list.filter(card => card.id !== id));
  }

  clear(): void {
    this._list.set([]);
  }

  updateSettings(patch: Partial<PrintSettings>): void {
    this._settings.update(settings => ({ ...settings, ...patch }));
  }

  /** Mesma carta (nome, sem caixa) já na lista vira quantidade, não duplicata. */
  private incrementByName(name: string): boolean {
    const key = name.trim().toLowerCase();
    const existing = this._list().find(card => card.name.trim().toLowerCase() === key);
    if (!existing) return false;
    this.increment(existing.id);
    return true;
  }

  private hydrate<T>(key: string, fallback: T): T {
    if (!this.isBrowser) return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private persist(key: string, value: unknown): void {
    if (!this.isBrowser) return;
    localStorage.setItem(key, JSON.stringify(value));
  }
}
