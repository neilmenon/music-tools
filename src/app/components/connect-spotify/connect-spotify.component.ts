import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { config } from 'src/app/config/config';
import { LastfmLocalUserModel, MusicTool, SpotifyAuthModel, UserPreferenceModel } from 'src/app/models/localStorageModel';
import { SpotifyApiTokenModel } from 'src/app/models/spotifyApiModel';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { MessageService } from 'src/app/services/message.service';
import { SpotifyService } from 'src/app/services/spotify.service';

@Component({
  selector: 'app-connect-spotify',
  templateUrl: './connect-spotify.component.html',
  styleUrls: ['./connect-spotify.component.css']
})
export class ConnectSpotifyComponent implements OnInit {
  @Input() showConnectButton: boolean = true
  @Input() tool: MusicTool
  @Output() needMoreScopesEmitter = new EventEmitter<boolean>(true)
  userPref: UserPreferenceModel
  needMoreScopes: boolean

  constructor(
    public spotifyService: SpotifyService,
    public localStorageService: LocalStorageService,
    private messageService: MessageService
  ) {
    
  }

  ngOnInit(): void {
    this.userPref = this.localStorageService.getUserPreferences()

    if (this.tool) {
      let spotifyAuth: SpotifyApiTokenModel = this.localStorageService.getSpotifyAuthDetails()?.data
      if (spotifyAuth?.scope) {
        let currentScopes: string[] = spotifyAuth.scope.split(" ")
        let neededScopes: string[] = config.spotify.scopes[this.tool].split(" ")
        if (!neededScopes.every(x => currentScopes.includes(x))) {
          this.needMoreScopes = true
          this.needMoreScopesEmitter.emit(this.needMoreScopes)
        }
      }
    }

    // check if spotify auth code exists in query params
    const params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    if (params['code']) { // finish the authentication
      // this.messageService.open("Connecting Spotify....", "center", true)
      this.spotifyService.getAuthTokensFromCode(params['code'], this.tool)
    }
  }

  get user(): SpotifyApi.UserObjectPublic { 
    return this.localStorageService.getSpotifyUserDetails()
  }

  get lastfmUser(): LastfmLocalUserModel {
    return this.localStorageService.getLastfmUserDetails()
  }

  get spotifyUserImage(): string {
    return this.user.images?.length ? this.user.images[this.user.images.length - 1].url : "https://lastfm.freetls.fastly.net/i/u/avatar170s/818148bf682d429dc215c1705eb27b98.webp"
  }

  async disconnect() {
    this.localStorageService.clearSpotifyUserData()
  }

  disconnectLastfm() {
    this.localStorageService.clearLastfmData()
  }
}
