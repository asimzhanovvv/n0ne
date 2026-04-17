import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, of, Observable } from 'rxjs';
import { User, AuthResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:8000/api';

  currentUser = signal<User | null>(this.getUserFromStorage());
  accessToken = signal<string | null>(localStorage.getItem('access_token'));

  login(credentials: any): Observable<AuthResponse> {
    // Clear any lingering AI keys from previous sessions
    localStorage.removeItem('or_raw_key');
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login/`, credentials).pipe(
      tap((res) => {
        this.setSession(res);
      })
    );
  }

  register(data: any): Observable<AuthResponse> {
    // Clear any lingering AI keys from previous sessions before registering new user
    localStorage.removeItem('or_raw_key');
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register/`, data).pipe(
      tap((res) => {
        this.setSession(res);
      })
    );
  }

  logout(): void {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      this.http.post(`${this.apiUrl}/auth/logout/`, { refresh }).subscribe({
        next: () => this.clearSession(),
        error: () => this.clearSession(),
      });
    } else {
      this.clearSession();
    }
  }

  private setSession(authRes: AuthResponse): void {
    localStorage.setItem('access_token', authRes.access);
    localStorage.setItem('refresh_token', authRes.refresh);
    localStorage.setItem('user', JSON.stringify(authRes.user));
    this.accessToken.set(authRes.access);
    this.currentUser.set(authRes.user);
  }

  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('or_raw_key'); // Critical: Clear AI key on logout
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private getUserFromStorage(): User | null {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }

  isLoggedIn(): boolean {
    return !!this.accessToken();
  }
}
