import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CardService {
  private http = inject(HttpClient);
  private API_URL = 'http://localhost:3000/mtg';

  getCard(name: string) {
    const params = new HttpParams().set('name', name);
    return this.http.get<any>(`${this.API_URL}/search`, { params });
  }
}