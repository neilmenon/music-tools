import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, from, lastValueFrom, Observable, switchMap, throwError } from 'rxjs';
import * as moment from 'moment';
import { LocalStorageService } from './local-storage.service';
import { SpotifyService } from './spotify.service';
import { MessageService } from './message.service';
import { ErrorHandlerService } from './error-handler.service';
import { config } from '../config/config';

@Injectable({
  providedIn: 'root'
})
export class HttpRequestIncerceptorService implements HttpInterceptor {
  private isRefreshing = false;

  constructor(
    private localStorageService: LocalStorageService,
    private spotifyService: SpotifyService,
    private messageService: MessageService,
    private errorHandlerService: ErrorHandlerService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.handle(req, next);
  }

  handle(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Preventative Spotify token refresh
    if (
      (req.url.includes('api.spotify.com') || req.url.includes(config.anniversify.apiRoot)) &&
      moment().unix() >= this.localStorageService.getSpotifyAuthDetails()?.expiresUnix
    ) {
      return from(this.spotifyService.refreshToken()).pipe(
        switchMap(() => this.forwardRequest(req, next))
      );
    }

    return this.forwardRequest(req, next);
  }

  private forwardRequest(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Spotify
    if (req.url.includes('api.spotify.com')) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${this.localStorageService.getSpotifyAuthDetails()?.data.access_token}`,
        },
      });
    }
    // Anniversify
    else if (req.url.includes(config.anniversify.apiRoot)) {
      const tokenToSend: string = this.localStorageService.getAnniversifyDeviceTokensSent()
        ? `${this.localStorageService.getSpotifyAuthDetails()?.data.refresh_token}`
        : `${this.localStorageService.getSpotifyAuthDetails()?.data.access_token}`;
      req = req.clone({
        setHeaders: {
          Authorization: tokenToSend,
          SpotifyUserId: `${this.localStorageService.getSpotifyUserDetails()?.id}`,
        },
      });
    }
    // Last.fm (audioscrobbler)
    else if (req.url.includes('audioscrobbler.com')) {
      req = req.clone({
        url: `${req.url}${
          this.localStorageService.getLastfmUsername() ? `&user=${this.localStorageService.getLastfmUsername()}` : ''
        }&api_key=${config.lastfm.apiKey}&format=json`,
      });
    }

    return next.handle(req).pipe(
      catchError((error: any) => {
        // Spotify errors
        if (error instanceof HttpErrorResponse && req.url.includes('api.spotify.com')) {
          if (error.status === 401) {
            return this.handle401Error(req, next);
          }
          this.messageService.open(
            'The Spotify API returned an error instead of data. ' +
              this.errorHandlerService.getHttpErrorMessage(error)
          );
          return throwError(() => error);
        }

        // Last.fm retry logic
        if (req.url.includes('audioscrobbler.com') && error instanceof HttpErrorResponse) {
          const retry = req.params.get('retry') ? parseInt(req.params.get('retry')!, 10) : 0;

          if (retry >= 5) {
            this.messageService.open(
              'The Last.fm API returned an error instead of data. Please reload and try again.',
              'center',
              true
            );
            return throwError(() => error);
          } else {
            console.warn(`Last.fm API request failed. Retrying... ${retry + 1}/3`);
            const retryReq = req.clone({
              setParams: { retry: String(retry + 1) },
            });
            return this.forwardRequest(retryReq, next); 
          }
        }

        return throwError(() => error);
      })
    );
  }

  private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;

      return from(this.spotifyService.refreshToken()).pipe(
        switchMap(() => {
          this.isRefreshing = false;
          const newReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${this.localStorageService.getSpotifyAuthDetails()?.data.access_token}`,
            },
          });
          return next.handle(newReq);
        }),
        catchError(err => {
          this.isRefreshing = false;
          return throwError(() => err);
        })
      );
    }

    // If refresh is already in progress, just forward the request
    return next.handle(req);
  }
}