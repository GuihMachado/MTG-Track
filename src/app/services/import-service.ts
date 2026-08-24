import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CardPrint,
  FetchedDeck,
  ImportSource,
  ParsedLine,
  ResolutionDto,
} from '../models/collection.models';

/**
 * O que a importação precisa de rede. O parser da lista é puro e mora em
 * `pages/collection/import/parse-list.ts`, com teste; aqui ficam as três
 * chamadas que passam pelo nosso servidor.
 *
 * Elas passam pelo servidor de propósito: a resolução em lote respeita o limite
 * da Scryfall a partir de um único cliente, e os sites de deck não mandam CORS.
 */
@Injectable({ providedIn: 'root' })
export class ImportService {
  private http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}/mtg`;

  /** Resolve as linhas em lote: até 75 identificadores por requisição lá dentro. */
  resolveLines(lines: ParsedLine[]): Observable<ResolutionDto[]> {
    return this.http.post<ResolutionDto[]>(`${this.API_URL}/resolve`, { lines });
  }

  /**
   * Impressões de uma carta, com preço em cada uma — o seletor de edição.
   * `allLanguages` é o segmento "Outro" do controle de idioma: sem ele o
   * servidor devolve só inglês e português, que é o que a mesa usa.
   */
  prints(name: string, allLanguages = false): Observable<CardPrint[]> {
    const params: Record<string, string> = { name };
    if (allLanguages) params['lang'] = 'all';

    return this.http.get<CardPrint[]>(`${this.API_URL}/prints`, { params });
  }

  /** Busca a lista de um deck externo; volta como texto, revisável na tela. */
  fromUrl(url: string): Observable<FetchedDeck> {
    return this.http.post<FetchedDeck>(`${this.API_URL}/deck-url`, { url });
  }

  /**
   * Reconhecimento de fonte pelo domínio, no cliente: o chip acende enquanto o
   * usuário digita, sem uma ida ao servidor por tecla.
   */
  detectSource(url: string): ImportSource | null {
    const value = (url ?? '').toLowerCase();
    if (value.includes('moxfield.com')) return 'moxfield';
    if (value.includes('archidekt.com')) return 'archidekt';
    if (value.includes('deckstats.net')) return 'deckstats';
    if (value.includes('tappedout.net')) return 'tappedout';
    return null;
  }
}
