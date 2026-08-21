import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CardService {
  private http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}/mtg`;

  getCard(name: string) {
    const params = new HttpParams().set('name', name);
    return this.http.get<any>(`${this.API_URL}/search`, { params });
  }
}