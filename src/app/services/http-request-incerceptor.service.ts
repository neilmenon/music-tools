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
  private isRefreshing = false

  constructor(
    private localStorageService: LocalStorageService,
    private spotifyService: SpotifyService,
    private messageService: MessageService,
    private errorHandlerService: ErrorHandlerService
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return from(this.handle(req, next))
  }

  async handle(req: HttpRequest<any>, next: HttpHandler) {
    if (req.url.includes("api.spotify.com") || req.url.includes(config.anniversify.apiRoot) &&
      moment().unix() >= this.localStorageService.getSpotifyAuthDetails()?.expiresUnix
    ) {
      // refresh token handling (preventative)
      await this.spotifyService.refreshToken()
    }

    if (req.url.includes("api.spotify.com")) {
      req = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${this.localStorageService.getSpotifyAuthDetails()?.data.access_token}`,
        },
      })
      
    } else if (req.url.includes(config.anniversify.apiRoot)) {
      let tokenToSend: string = this.localStorageService.getAnniversifyDeviceTokensSent() ? `${this.localStorageService.getSpotifyAuthDetails()?.data.refresh_token}` : `${this.localStorageService.getSpotifyAuthDetails()?.data.access_token}`
      req = req.clone({
        setHeaders: {
          'Authorization': tokenToSend,
          'SpotifyUserId': `${this.localStorageService.getSpotifyUserDetails()?.id}`
        },
      })
    } else if (req.url.includes("audioscrobbler.com")) {
      req = req.clone({
        url: `${req.url}${this.localStorageService.getLastfmUsername() ? `&user=${this.localStorageService.getLastfmUsername()}` : ''}&api_key=${config.lastfm.apiKey}&format=json`
      })
    }

    return await lastValueFrom(next.handle(req).pipe(
      catchError(async (error) => {
        if (
          error instanceof HttpErrorResponse &&
          req.url.includes("api.spotify.com")
        ) {
          if (error.status === 401) {
            return lastValueFrom(await this.handle401Error(req, next))
          }

          // handle error from the Spotify API
          this.messageService.open("The Spotify API returned an error instead of data." + this.errorHandlerService.getHttpErrorMessage(error))
        } else if (
          req.url.includes("audioscrobbler.com") &&
          error instanceof HttpErrorResponse
        ) {
          if (req.params.has("retry")) {
            this.messageService.open("The Last.fm API returned an error instead of data. Please reload and try again.", "center", true)
            return lastValueFrom(throwError(() => error)) 
          } else {
            console.warn("Last.fm API request failed. Retrying...")
            req = req.clone({
              setParams: {
                'retry': `1`,
              },
            })
            return lastValueFrom(next.handle(req))
          }
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
          'Authorization': `Bearer ${this.localStorageService.getSpotifyAuthDetails()?.data.access_token}`,
        },
      })
      return next.handle(req)
    }

    return next.handle(req);
  }
}
