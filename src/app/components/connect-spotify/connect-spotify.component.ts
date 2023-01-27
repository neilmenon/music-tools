import { Component, Input } from '@angular/core';
import { UserPreferenceModel } from 'src/app/models/localStorageModel';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { MessageService } from 'src/app/services/message.service';
import { SpotifyService } from 'src/app/services/spotify.service';

@Component({
  selector: 'app-connect-spotify',
  templateUrl: './connect-spotify.component.html',
  styleUrls: ['./connect-spotify.component.css']
})
export class ConnectSpotifyComponent {
  userPref: UserPreferenceModel

  constructor(
    public spotifyService: SpotifyService,
    public localStorageService: LocalStorageService,
    private messageService: MessageService
  ) {
    this.userPref = this.localStorageService.getUserPreferences()
  }

  get user(): SpotifyApi.UserObjectPublic { 
    return this.localStorageService.getSpotifyUserDetails()
  }

  async disconnect() {
    let tmpUser: any = this.user
    tmpUser['logout'] = true
    await this.spotifyService.spotifyLogin(tmpUser)
    this.localStorageService.clearSpotifyUserData()
  }

  async changeEmailPref() {
    this.userPref.emails = !this.userPref.emails
    this.localStorageService.setUserPreferences(this.userPref)
    let tmpUser: any = this.user
    tmpUser['emailNotifs'] = this.userPref.emails
    await this.spotifyService.spotifyLogin(tmpUser)
    this.messageService.open("Updated your notification settings.")
  }
}
