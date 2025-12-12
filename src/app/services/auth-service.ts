import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000'; 

  login(bodybuilder: () => any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, bodybuilder);
  }

  register(bodybuilder: () => any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, bodybuilder);
  }
}