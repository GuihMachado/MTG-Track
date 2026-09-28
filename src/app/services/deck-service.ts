import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { DeckDto, DeckOption, DeckPayload, TableDecks } from '../models/collection.models';

/**
 * Decks da coleção — a lista de 100 cartas, não o "deck da vez" do dashboard
 * (esse é derivado das partidas). Quem responde "quanto falta" é o servidor: o
 * casamento com a coleção é por `oracleId` e sai pronto no DTO.
 */
@Injectable({ providedIn: 'root' })
export class DeckService {
  private http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}/decks`;

  private _decks = signal<DeckDto[]>([]);
  private _loading = signal(false);
  private _loaded = signal(false);

  readonly decks = this._decks.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  load(): Observable<DeckDto[]> {
    this._loading.set(true);

    return this.http.get<DeckDto[]>(this.API_URL).pipe(
      tap({
        next: decks => {
          this._decks.set(decks);
          this._loading.set(false);
          this._loaded.set(true);
        },
        error: () => this._loading.set(false),
      }),
    );
  }

  ensureLoaded(): void {
    if (this._loaded() || this._loading()) return;
    this.load().subscribe({ error: () => undefined });
  }

  getDeck(id: string): Observable<DeckDto> {
    return this.http.get<DeckDto>(`${this.API_URL}/${id}`);
  }

/** Deck pelo formulário (nome, commander e cores), sem lista. */
  create(payload: DeckPayload): Observable<DeckDto> {
    return this.http
      .post<DeckDto>(this.API_URL, payload)
      .pipe(tap(deck => this._decks.update(decks => [deck, ...decks])));
  }

  /** Editar pelo mesmo formulário; campo ausente não muda. */
  update(id: string, payload: DeckPayload): Observable<DeckDto> {
    return this.http.patch<DeckDto>(`${this.API_URL}/${id}`, payload).pipe(
      tap(deck =>
        this._decks.update(decks => decks.map(item => (item.id === deck.id ? deck : item))),
      ),
    );
  }

  /**
   * Os decks que podem ir à mesa — de todas as contas ativas, porque o assento
   * aceita deck emprestado — e o último que cada jogador jogou.
   */
  table(): Observable<TableDecks> {
    return this.http.get<TableDecks>(`${this.API_URL}/table`);
  }

  /**
   * O "+ Novo deck" do assento: o deck nasce na conta do jogador do assento,
   * não na de quem está com o celular. Se for a própria conta, a lista local
   * fica velha até a próxima carga.
   */
  createFor(userId: number, payload: DeckPayload): Observable<DeckOption> {
    return this.http
      .post<DeckOption>(`${this.API_URL}/player/${userId}`, payload)
      .pipe(tap(() => this.invalidate()));
  }

  remove(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.API_URL}/${id}`)
      .pipe(tap(() => this._decks.update(decks => decks.filter(deck => deck.id !== id))));
  }

  /** Um deck recém-importado entra na lista sem uma segunda ida ao servidor. */
  put(deck: DeckDto): void {
    this._decks.update(decks => [deck, ...decks.filter(item => item.id !== deck.id)]);
  }

  /** A coleção mudou: o "quanto falta" de cada deck foi junto. */
  invalidate(): void {
    this._loaded.set(false);
  }
}
