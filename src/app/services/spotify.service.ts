import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, delay, lastValueFrom, throwError } from 'rxjs';
import { config } from '../config/config';
import { SpotifyAlbumEntryModel, SpotifyAuthModel, SpotifyCustomAlbumPropModel, SpotifyLocalAlbumModel } from '../models/localStorageModel';
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
    private localStorageService: LocalStorageService,
    private router: Router
  ) { }

  isAuthenticated(): boolean {
    return this.localStorageService.getSpotifyAuthDetails() ? true : false
  }

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
    
    // persist auth details
    let authDetails: SpotifyAuthModel = new SpotifyAuthModel()
    authDetails.data = authResponse
    this.localStorageService.setSpotifyAuthDetails(authDetails)

    this.router.navigate([], {
      queryParams: { 'code': null },
      queryParamsHandling: 'merge'
    })
    
    // fetch + persist user + saved albums object
    this.messageService.open("Fetching Spotify user details...", "center", true)
    await this.getSpotifyUserDetails()
    this.messageService.open("Fetching albums saved in your Spotify library...", "center", true)
    await this.getUserAlbums()
    this.messageService.open("Fetch complete.")

  }

  async getSpotifyUserDetails(): Promise<SpotifyApi.UserObjectPublic> {
    let userResponse: SpotifyApi.UserObjectPublic = await lastValueFrom(this.http.get<SpotifyApi.UserObjectPublic>("https://api.spotify.com/v1/me"))

    return this.localStorageService.setSpotifyUserDetails(userResponse)
  }

  async refreshToken() {
    let authDetails = JSON.parse(JSON.stringify(this.localStorageService.getSpotifyAuthDetails()))
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
    this.localStorageService.setSpotifyAuthDetails(authDetails)
  }

  async getUserAlbums(): Promise<SpotifyLocalAlbumModel> {
    let albums: SpotifyApi.SavedAlbumObject[] = []

    let albumResponse: SpotifyApi.UsersSavedAlbumsResponse = await lastValueFrom(this.http.get<SpotifyApi.UsersSavedAlbumsResponse>("https://api.spotify.com/v1/me/albums?limit=50"))
    albums = albumResponse.items
    
    while (albumResponse.next) {
      albumResponse = await lastValueFrom(this.http.get<SpotifyApi.UsersSavedAlbumsResponse>(albumResponse.next).pipe(delay(500)))
      albums = [...albums, ...albumResponse.items]
    }

    let albumArray: SpotifyAlbumEntryModel[] = []
    albums.forEach(async x => {
      let customProperties: SpotifyCustomAlbumPropModel = new SpotifyCustomAlbumPropModel()
      
      // make sure all tracks have been fetched first (if more than 50)
      let trackResponse = x.album.tracks
      let tracks: SpotifyApi.TrackObjectSimplified[] = x.album.tracks.items
      while (trackResponse.next) {
        trackResponse = await lastValueFrom(this.http.get<SpotifyApi.AlbumTracksResponse>(trackResponse.next).pipe(delay(500)))
        tracks = [...tracks, ...trackResponse.items]
      }

      // map custom/calculated properties
      customProperties.duration = x.album.tracks.items.map(x => x.duration_ms).reduce((a, b) => a + b, 0)

      // strip extra data in object which is not needed (for now)
      x.album.available_markets = []
      x.album.tracks.items = []

      albumArray.push({ api: x, custom: customProperties })
    })

    return this.localStorageService.setSpotifySavedAlbums(albumArray)
  }
}
