import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { MessageService } from 'src/app/services/message.service';
import { SpotifyService } from 'src/app/services/spotify.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  user: SpotifyApi.UserObjectPublic

  constructor(
    public spotifyService: SpotifyService,
    private messageService: MessageService,
    private localStorageService: LocalStorageService,
  ) { }

  ngOnInit(): void {
    this.user = this.localStorageService.getSpotifyUserDetails()
  }
}
