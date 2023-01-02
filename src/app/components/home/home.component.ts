import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'src/app/services/message.service';
import { SpotifyService } from 'src/app/services/spotify.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(
    public spotifyService: SpotifyService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    // check if spotify auth code exists in query params
    const params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    if (params['code']) { // finish the authentication
      this.messageService.open("Connecting Spotify....", "center", true)
      this.spotifyService.getAuthTokensFromCode(params['code'])
    }

    // this.spotifyService.getUserDetails()
  }
}
