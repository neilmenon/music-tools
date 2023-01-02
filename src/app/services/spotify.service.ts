import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, lastValueFrom, throwError } from 'rxjs';
import { config } from '../config/config';
import { SpotifyAuthModel } from '../models/localStorageModel';
import { SpotifyApiTokenModel } from '../models/spotifyApiModel';
import { ErrorHandlerService } from './error-handler.service';
import { LocalStorageService } from './local-storage.service';
import { MessageService } from './message.service';

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private errorService: ErrorHandlerService,
    private localStorageService: LocalStorageService
  ) { }

  redirectToAuthorizationPage() {
    let authParameters = {
      client_id: config.spotify.clientId,
      response_type: "code",
      redirect_uri: config.spotify.redirectUri,
      scope: config.spotify.scope
    }

    window.location.href = `https://accounts.spotify.com/authorize?${ new URLSearchParams(authParameters).toString() }`
  }

  async getAuthTokensFromCode(code: string) {
    let authResponse: SpotifyApiTokenModel = await lastValueFrom(
      this.http.get<SpotifyApiTokenModel>(config.spotify.authCodeUrl + `?code=${ code }`).pipe(
        catchError((err: HttpErrorResponse) => {
          this.messageService.open("Error authenticating with Spotify!" + this.errorService.getHttpErrorMessage(err))
          return throwError(() => err)
        })
        )
      )
    let authDetails: SpotifyAuthModel = new SpotifyAuthModel()
    authDetails.data = authResponse
    this.localStorageService.setAuthDetails(authDetails)
    window.location.href = ""
  }

  getUserDetails() {
    lastValueFrom(this.http.get("https://api.spotify.com/v1/me"))
  }

  async refreshToken() {
    let authDetails = JSON.parse(JSON.stringify(this.localStorageService.getAuthDetails()))
    let data = new FormData()
    data.append("refresh_token", authDetails.data.refresh_token)
    let refreshResponse: SpotifyApiTokenModel = await lastValueFrom(
      this.http.post<SpotifyApiTokenModel>(config.spotify.authCodeUrl, data).pipe(
        catchError((err: HttpErrorResponse) => {
          this.messageService.open("Error refreshing Spotify auth token." + this.errorService.getHttpErrorMessage(err))
          return throwError(() => err)
        })
      )
    )
    
    refreshResponse.refresh_token = authDetails.data.refresh_token
    authDetails.data = refreshResponse
    this.localStorageService.setAuthDetails(authDetails)
  }
}
