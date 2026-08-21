import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
    private http = inject(HttpClient);
    private API_URL = `${environment.apiUrl}/users`;

    getUsers() {
        return this.http.get<any>(`${this.API_URL}`);
    }
}