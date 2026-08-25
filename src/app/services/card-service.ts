import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CardDto } from '../models/card.models';

@Injectable({ providedIn: 'root' })
export class CardService {
  private http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}/mtg`;

  /**
   * Carta estruturada: faces separadas e texto de oráculo já em linhas.
   * `translate` liga o DeepL para carta sem impressão PT — ele cobra por
   * caractere, então só a aba Português pede a tradução.
   */
  getCard(name: string, translate = false): Observable<CardDto> {
    let params = new HttpParams().set('name', name);
    if (translate) params = params.set('translate', '1');
    return this.http.get<CardDto>(`${this.API_URL}/search`, { params });
  }
}