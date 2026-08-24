import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HouseRulesData, UpdateHouseRulesPayload } from '../models/house-rules.models';

@Injectable({ providedIn: 'root' })
export class HouseRulesService {
  private http = inject(HttpClient);
  private API_URL = `${environment.apiUrl}/house-rules`;

  getRules(): Observable<HouseRulesData> {
    return this.http.get<HouseRulesData>(this.API_URL);
  }

  updateRules(payload: UpdateHouseRulesPayload): Observable<HouseRulesData> {
    return this.http.put<HouseRulesData>(this.API_URL, payload);
  }

  resetRules(): Observable<HouseRulesData> {
    return this.http.post<HouseRulesData>(`${this.API_URL}/reset`, {});
  }
}
