import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PlayerOption, ProfileUpdatePayload, UserProfile } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
    private http = inject(HttpClient);
    private API_URL = `${environment.apiUrl}/users`;

    getUsers(): Observable<PlayerOption[]> {
        return this.http.get<PlayerOption[]>(`${this.API_URL}`);
    }

    getUser(id: number): Observable<UserProfile> {
        return this.http.get<UserProfile>(`${this.API_URL}/${id}`);
    }

    /** Só nome, email e ícone; a API recusa qualquer outro campo. */
    updateProfile(id: number, payload: ProfileUpdatePayload): Observable<UserProfile> {
        return this.http.put<UserProfile>(`${this.API_URL}/${id}`, payload);
    }
}
