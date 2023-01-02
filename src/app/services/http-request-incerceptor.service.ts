import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, from, lastValueFrom, Observable, switchMap, throwError } from 'rxjs';
import * as moment from 'moment';
import { LocalStorageService } from './local-storage.service';
import { SpotifyService } from './spotify.service';

@Injectable({
  providedIn: 'root'
})
export class HttpRequestIncerceptorService implements HttpInterceptor {
  private isRefreshing = false

  constructor(
    private localStorageService: LocalStorageService,
    private spotifyService: SpotifyService
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return from(this.handle(req, next))
  }

  async handle(req: HttpRequest<any>, next: HttpHandler) {
    if (req.url.includes("api.spotify.com")) {
      req = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${this.localStorageService.getAuthDetails()?.data.access_token}`,
        },
      })
      
      if (moment().unix() >= this.localStorageService.getAuthDetails()?.expiresUnix) {
        // refresh token handling (preventative)
        await this.spotifyService.refreshToken()
      }
    }

    return await lastValueFrom(next.handle(req).pipe(
      catchError(async (error) => {
        if (
          error instanceof HttpErrorResponse &&
          req.url.includes("api.spotify.com") &&
          error.status === 401
        ) {
          return lastValueFrom(await this.handle401Error(req, next))
        }

        return lastValueFrom(throwError(() => error)) 
      })
    ));
  }

  async handle401Error(req: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true

      // refresh token handling (after-the-error)
      await this.spotifyService.refreshToken()
      this.isRefreshing = false
      req = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${this.localStorageService.getAuthDetails()?.data.access_token}`,
        },
      })
      return next.handle(req)
    }

    return next.handle(req);
  }
}
