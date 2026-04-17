import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const token = authService.accessToken();

  // Only intercept requests to our backend
  const isBackendRequest = req.url.includes('localhost:8000');

  if (token && isBackendRequest) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle global errors here
      if (error.status === 401 && isBackendRequest) {
        // Token expired or invalid
        authService.logout();
      }
      
      let errorMessage = 'An error occurred';
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else if (error.error && typeof error.error === 'object') {
        // DRF validation errors
        if (error.error.detail) {
          errorMessage = error.error.detail;
        } else if (error.error.error) {
          if (typeof error.error.error === 'string') {
            errorMessage = error.error.error;
          } else if (error.error.error.message) {
            errorMessage = error.error.error.message;
          } else {
            errorMessage = JSON.stringify(error.error.error);
          }
        } else {
           const errs = [];
           for (const key of Object.keys(error.error)) {
             const val = error.error[key];
             if (Array.isArray(val)) errs.push(`${key}: ${val.join(' ')}`);
             else if (typeof val === 'string') errs.push(`${key}: ${val}`);
             else errs.push(`${key}: Invalid input`);
           }
           errorMessage = errs.length > 0 ? errs.join(' | ') : error.message;
        }
      } else {
        errorMessage = error.message;
      }
      
      console.error('API Error:', errorMessage);
      return throwError(() => new Error(errorMessage));
    })
  );
};
