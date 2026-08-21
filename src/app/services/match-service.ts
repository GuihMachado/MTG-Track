import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
    CreateMatchPayload,
    FinishMatchPayload,
    MatchDto,
    RankingEntry,
    RecentDeck,
    StartMatchResponse,
    UserStats
} from '../models/match.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MatchService {
    private http = inject(HttpClient);
    private API_URL = `${environment.apiUrl}/match`;

    startMatch(payload: CreateMatchPayload): Observable<StartMatchResponse> {
        return this.http.post<StartMatchResponse>(`${this.API_URL}/start`, payload);
    }

    finishMatch(matchId: number, payload: FinishMatchPayload): Observable<{ message: string }> {
        return this.http.patch<{ message: string }>(`${this.API_URL}/finish/${matchId}`, payload);
    }

    getMatchById(matchId: number): Observable<MatchDto> {
        return this.http.get<MatchDto>(`${this.API_URL}/${matchId}`);
    }

    getMatchesByUser(userId: number): Observable<MatchDto[]> {
        return this.http.get<MatchDto[]>(`${this.API_URL}/user/${userId}`);
    }

    getUserStats(userId: number): Observable<UserStats> {
        return this.http.get<UserStats>(`${this.API_URL}/user/${userId}/stats`);
    }

    getRecentDecks(userId: number, limit = 5): Observable<RecentDeck[]> {
        return this.http.get<RecentDeck[]>(`${this.API_URL}/user/${userId}/recent-decks?limit=${limit}`);
    }

    getRanking(top = 10): Observable<RankingEntry[]> {
        return this.http.get<RankingEntry[]>(`${this.API_URL}/ranking?top=${top}`);
    }
}
