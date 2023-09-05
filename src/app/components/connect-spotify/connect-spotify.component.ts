import { Component, Input, OnInit } from '@angular/core';
import { config } from 'src/app/config/config';
import { MusicTool, SpotifyAuthModel, UserPreferenceModel } from 'src/app/models/localStorageModel';
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
        }
      }
    }
  }

  get user(): SpotifyApi.UserObjectPublic { 
    return this.localStorageService.getSpotifyUserDetails()
  }

  async disconnect() {
    this.localStorageService.clearSpotifyUserData()
  }
}
