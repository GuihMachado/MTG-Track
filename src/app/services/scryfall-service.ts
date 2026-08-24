import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ScryfallSearchPage } from '../models/proxy.models';

export interface ScryfallSearchFilters {
  /** Código de cor Scryfall: w, u, b, r, g, c. */
  color?: string;
  /** Tipo de carta: creature, instant, sorcery, artifact, enchantment, planeswalker, land. */
  type?: string;
}

/**
 * Busca direta na API pública da Scryfall (sem key, CORS liberado).
 * O interceptor de auth ignora URLs fora da nossa API, então nenhum
 * token vaza para cá.
 */
@Injectable({ providedIn: 'root' })
export class ScryfallService {
  private http = inject(HttpClient);
  private SEARCH_URL = 'https://api.scryfall.com/cards/search';

  search(query: string, filters: ScryfallSearchFilters = {}): Observable<ScryfallSearchPage> {
    let q = query.trim();
    if (filters.color) q += ` c:${filters.color.toLowerCase()}`;
    if (filters.type) q += ` t:${filters.type.toLowerCase()}`;

    const params = new HttpParams().set('q', q).set('unique', 'cards');
    return this.http.get<ScryfallSearchPage>(this.SEARCH_URL, { params });
  }

  /** A Scryfall devolve `next_page` como URL completa — basta segui-la. */
  searchByUrl(nextPageUrl: string): Observable<ScryfallSearchPage> {
    return this.http.get<ScryfallSearchPage>(nextPageUrl);
  }
}
