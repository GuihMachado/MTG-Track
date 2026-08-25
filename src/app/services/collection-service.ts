import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CollectionEntryDto,
  CollectionResponse,
  CollectionSetDto,
  EMPTY_SUMMARY,
  ImportItem,
  ImportResult,
  SetBinderDto,
} from '../models/collection.models';

/**
 * A coleção inteira vive em memória: 500–1.500 cartas dão algumas centenas de
 * entradas, o que é grande o bastante para exigir busca e filtro locais e
 * pequeno o bastante para não precisar de paginação de servidor.
 *
 * O estado é signal porque o app é zoneless — estado atualizado dentro de
 * `subscribe` só chega à view por signal.
 */
@Injectable({ providedIn: 'root' })
export class CollectionService {
  private http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}/collection`;

  private _entries = signal<CollectionEntryDto[]>([]);
  private _sets = signal<CollectionSetDto[]>([]);
  private _loadingSets = signal(false);
  private _setsLoaded = signal(false);
  private _setsFailed = signal(false);
  private _summary = signal(EMPTY_SUMMARY);
  private _loading = signal(false);
  private _loaded = signal(false);

  readonly entries = this._entries.asReadonly();
  /** As coleções da estante — famílias de edição, com quanto falta de cada uma. */
  readonly sets = this._sets.asReadonly();
  readonly loadingSets = this._loadingSets.asReadonly();
  /**
   * A busca das coleções falhou. Existe porque a aba não tem como distinguir
   * "você não tem coleção nenhuma" de "a lista não chegou" olhando só a lista
   * vazia — e chamar de estante vazia quem tem quatro cartas é mentira.
   */
  readonly setsFailed = this._setsFailed.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  /** Quantas cópias de cada carta (por oracleId) — o casamento com os decks. */
  readonly ownedByOracle = computed(() => {
    const owned = new Map<string, number>();
    for (const entry of this._entries()) {
      owned.set(entry.oracleId, (owned.get(entry.oracleId) ?? 0) + entry.quantity);
    }
    return owned;
  });

  load(): Observable<CollectionResponse> {
    this._loading.set(true);

    return this.http.get<CollectionResponse>(this.API_URL).pipe(
      tap({
        next: response => this.apply(response),
        error: () => this._loading.set(false),
      }),
    );
  }

  /** Carrega uma vez por sessão de tela; a lista volta do cache em memória. */
  ensureLoaded(): void {
    if (this._loaded() || this._loading()) return;
    this.load().subscribe({ error: () => undefined });
  }

  /**
   * As coleções vêm do servidor, e não do agrupamento local, porque o
   * denominador ("de 310") é uma busca na Scryfall — o navegador não tem como
   * saber quantas cartas The Hobbit tem.
   */
  loadSets(): Observable<CollectionSetDto[]> {
    this._loadingSets.set(true);
    this._setsFailed.set(false);

    return this.http.get<CollectionSetDto[]>(`${this.API_URL}/sets`).pipe(
      tap({
        next: sets => {
          this._sets.set(sets);
          this._loadingSets.set(false);
          this._setsLoaded.set(true);
        },
        error: () => {
          this._loadingSets.set(false);
          this._setsFailed.set(true);
        },
      }),
    );
  }

  /** Carrega uma vez; mexer na coleção invalida e a próxima visita recarrega. */
  ensureSets(): void {
    if (this._setsLoaded() || this._loadingSets()) return;
    this.loadSets().subscribe({ error: () => undefined });
  }

  /** Depois de uma falha: a aba oferece o botão, e ele chama isto. */
  retrySets(): void {
    if (this._loadingSets()) return;
    this._setsLoaded.set(false);
    this.loadSets().subscribe({ error: () => undefined });
  }

  /** Uma coleção aberta como fichário: todas as cartas dela, tendo você ou não. */
  binder(code: string): Observable<SetBinderDto> {
    return this.http.get<SetBinderDto>(`${this.API_URL}/sets/${encodeURIComponent(code)}`);
  }

  add(scryfallId: string, quantity: number, foil: boolean): Observable<CollectionEntryDto> {
    return this.http
      .post<CollectionEntryDto>(this.API_URL, { scryfallId, quantity, foil })
      .pipe(tap(entry => this.upsertLocal(entry)));
  }

  /** Zero apaga a entrada — o backend responde 204 e a lista perde a linha. */
  setQuantity(id: string, quantity: number): Observable<CollectionEntryDto | null> {
    return this.http
      .patch<CollectionEntryDto | null>(`${this.API_URL}/${id}`, { quantity })
      .pipe(tap(entry => (entry ? this.upsertLocal(entry) : this.removeLocal(id))));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`).pipe(tap(() => this.removeLocal(id)));
  }

  importList(payload: {
    destination: 'collection' | 'deck';
    deckName?: string;
    commanderScryfallId?: string;
    items: ImportItem[];
  }): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.API_URL}/import`, payload).pipe(
      tap(result => {
        if (result.collection) this.apply(result.collection);
      }),
    );
  }

  /**
   * Recalcula os preços em segundo plano. A tela não espera: ela mostra o valor
   * do dia da consulta até a resposta chegar — um total que muda sozinho, sem
   * explicação, corrói a confiança no número.
   */
  refreshPrices(): void {
    this.http.post<{ updated: number }>(`${this.API_URL}/refresh-prices`, {}).subscribe({
      next: result => {
        if (result.updated > 0) this.load().subscribe({ error: () => undefined });
      },
      error: () => undefined,
    });
  }

  private apply(response: CollectionResponse): void {
    this.invalidateSets();
    this._entries.set(response.entries);
    this._summary.set(response.summary);
    this._loading.set(false);
    this._loaded.set(true);
  }

  /**
   * Recalcula o resumo localmente depois de mexer numa entrada. É a mesma conta
   * do servidor, e evita uma volta de rede só para atualizar dois números.
   */
  private invalidateSets(): void {
    this._setsLoaded.set(false);
  }

  private upsertLocal(entry: CollectionEntryDto): void {
    this.invalidateSets();

    this._entries.update(entries => {
      const index = entries.findIndex(item => item.id === entry.id);
      if (index === -1) return [...entries, entry];

      const copy = [...entries];
      copy[index] = entry;
      return copy;
    });

    this.resummarize();
  }

  private removeLocal(id: string): void {
    this.invalidateSets();
    this._entries.update(entries => entries.filter(entry => entry.id !== id));
    this.resummarize();
  }

  private resummarize(): void {
    const entries = this._entries();

    let totalCards = 0;
    let totalValueUsd = 0;
    let withoutPrice = 0;
    let mostValuable: { name: string; priceUsd: number } | null = null;

    for (const entry of entries) {
      totalCards += entry.quantity;

      if (entry.priceUsd === null) {
        withoutPrice++;
        continue;
      }

      totalValueUsd += entry.priceUsd * entry.quantity;

      if (!mostValuable || entry.priceUsd > mostValuable.priceUsd) {
        mostValuable = { name: entry.name, priceUsd: entry.priceUsd };
      }
    }

    this._summary.set({
      totalCards,
      uniqueCards: entries.length,
      totalValueUsd: Math.round(totalValueUsd * 100) / 100,
      mostValuable,
      withoutPrice,
    });
  }
}
