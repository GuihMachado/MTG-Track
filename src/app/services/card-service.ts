import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CardDto } from '../models/card.models';

@Injectable({ providedIn: 'root' })
export class CardService {
  private http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}/mtg`;

  /** Carta estruturada: faces separadas e texto de oráculo já em linhas. */
  getCard(name: string): Observable<CardDto> {
    const params = new HttpParams().set('name', name);
    return this.http.get<CardDto>(`${this.API_URL}/search`, { params });
  }
}