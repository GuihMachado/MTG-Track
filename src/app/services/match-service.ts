import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CreateMatchPayload } from '../pages/new-match/new-match';

@Injectable({ providedIn: 'root' })
export class MatchService {
    private http = inject(HttpClient);
    private API_URL = 'http://localhost:3000/match';

    startMatch(payload: CreateMatchPayload) {
        return this.http.post<any>(`${this.API_URL}/start`, payload);
    }

    finishMatch(payload: CreateMatchPayload) {
        return this.http.post<any>(`${this.API_URL}/finish`, payload);
    }
}