import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { LASTFM_USER_DETAILS } from 'src/app/constants/localStorageConstants';
import { LastfmService } from 'src/app/services/lastfm.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { MessageService } from 'src/app/services/message.service';

@Component({
  selector: 'app-connect-lastfm',
  standalone: false,
  templateUrl: './connect-lastfm.component.html',
  styleUrl: './connect-lastfm.component.css'
})
export class ConnectLastfmComponent {
  userForm: UntypedFormGroup
  loading: boolean

  constructor(
    private messageService: MessageService,
    private fb: UntypedFormBuilder,
    private http: HttpClient,
    private lastfmService: LastfmService,
    private localStorageService: LocalStorageService
  ) { }

  ngOnInit(): void {
    this.userForm = this.fb.group({
      lastfmUsername: [null]
    })
  }

  validateAndRedirect() {
    this.loading = true
    lastValueFrom(this.http.get(`https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${this.userForm.controls['lastfmUsername'].value.trim()}`)).then((data: any) => {
      this.userForm.disable()
      this.messageService.open(`Hey, ${this.userForm.controls['lastfmUsername'].value.trim()}! Connecting your account...`, "center", true)
      this.localStorageService.setLastfmUserDetails(this.lastfmService.translateLastfmProfile(data))
      setTimeout(() => window.location.reload(), 2000)
    }).catch((error: HttpErrorResponse) => {
      this.loading = false
      if (error.status == 404) {
        this.messageService.open("Last.fm user not found. Did you make a typo?")
      } else {
        this.messageService.open("An unexpected error occured from Last.fm's API. Please try again.")
      }
    });
  }
}
