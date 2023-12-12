import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from '../../services/local-storage.service';
import { AnniversifyService } from '../../services/anniversify.service';
import { AnniversifyModel, PushNotificationObject } from '../../models/anniversifyModel';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { timezones } from '../../constants/timezones';
import { MessageService } from '../../services/message.service';
import * as moment from 'moment';
import { config } from '../../config/config';
import { SwPush } from '@angular/service-worker';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-anniversify',
  templateUrl: './anniversify.component.html',
  styleUrls: ['./anniversify.component.css']
})
export class AnniversifyComponent implements OnInit {
  anniversifyDetails: AnniversifyModel
  anniversifyForm: UntypedFormGroup
  timezones = timezones
  saveClicked: boolean
  loadingDetails: boolean
  loadingUpdate: boolean
  showDeleteConfirmation: boolean
  loadingDelete: boolean
  moment = moment
  emailSender = config.anniversify.emailSender
  needsMoreScopes: boolean

  constructor(
    private localStorageService: LocalStorageService,
    private anniversifyService: AnniversifyService,
    private fb: UntypedFormBuilder,
    private messageService: MessageService,
    private swPush: SwPush
  ) {
    
  }
  
  ngOnInit(): void {
    this.createForm()
    this.anniversifyForm.valueChanges.pipe(debounceTime(50), distinctUntilChanged()).subscribe(() => {
      console.log(this.anniversifyForm.getRawValue())
    })

    this.anniversifyForm.controls['emailsEnabled'].valueChanges.subscribe(() => {
      this.anniversifyForm.controls['email'].setValidators(this.anniversifyForm.controls['emailsEnabled'].value ? Validators.compose([Validators.required, Validators.email]) : [])
      this.anniversifyForm.controls['email'].updateValueAndValidity()
    })

    if (this.user && !this.needsMoreScopes) {
      this.loadingDetails = true
      this.anniversifyService.getDetails().then(details => {
        this.loadingDetails = false
        this.anniversifyDetails = details
        this.anniversifyForm.patchValue(this.anniversifyDetails ? JSON.parse(JSON.stringify(this.anniversifyDetails)) : this.getNewAnniversifyModel())
      }).catch(err => {
        this.loadingDetails = false
        console.log(err)
        this.messageService.open("There was an error getting your Anniversify information. Please refresh to try again.")
      })
    }
  }

  setAnniversifyDetails() {
    this.saveClicked = true
    if (!this.anniversifyForm.controls['playlistEnabled'].value && !this.anniversifyForm.controls['emailsEnabled'].value) {
      this.messageService.open("Either email or playlist  must be enabled to save!")
      return
    }
    if (!this.anniversifyForm.controls['playlistEnabled'].value && this.anniversifyForm.controls['pushNotificationObject'].value) {
      this.messageService.open("Spotify playlist must be enabled for push notifications (so I can take you there).")
      return
    }
    if (this.anniversifyForm.valid) {
      this.loadingUpdate = true
      let payload: AnniversifyModel = JSON.parse(JSON.stringify(this.anniversifyForm.getRawValue()))
      this.anniversifyService.setDetails(payload, this.anniversifyDetails ? false : true).then(data => {
        this.anniversifyDetails = JSON.parse(JSON.stringify(data))
        this.loadingUpdate = false
        this.messageService.open("Successfully saved Anniversify settings.")
        this.anniversifyForm.patchValue(this.anniversifyDetails)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }).catch(err => {
        this.loadingUpdate = false
        console.log(err)
        this.messageService.open("There was an error getting your Anniversify information. Please refresh to try again.")
      })
    } else {
      this.messageService.open("Please fix the errors on the form.")
    }
  }

  firstDeleteClicked() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    this.showDeleteConfirmation = true
  }

  deleteAnniversifyDetails() {
    this.loadingDelete = true
    this.anniversifyService.deleteDetails().then(() => {
      this.loadingDelete = false
      this.showDeleteConfirmation = false
      this.messageService.open(`Sorry to see you go! Successfully removed ${ this.anniversifyDetails.name } from Anniversify.`, "center", true)
      this.anniversifyDetails = null
      this.localStorageService.setAnniversifyDeviceTokensSent(false)
      setTimeout(() => window.location.href = '', 5000)
    }).catch(err => {
      this.loadingDelete = false
      this.showDeleteConfirmation = false
      console.log(err)
      this.messageService.open("There was an error deleting your Anniversify information. Please refresh to try again.")
      this.localStorageService.setAnniversifyDeviceTokensSent(false)
    })
  }

  createForm() {
    this.anniversifyForm = this.fb.group({
      lastAuthenticated: [null],
      albumsOnly: [null],
      emailsEnabled: [null],
      playlistEnabled: [null],
      email: [null],
      spotifyPlaylistId: [null],
      errors: [null],
      lastRun: [null],
      timezone: [null, Validators.compose([Validators.required])],
      name: [null],
      libraryLastFetched: [null],
      notifyTime: [null, Validators.compose([Validators.required])],
      registerDate: [null],
      pushNotificationObject: [null],
    })
  }

  getNewAnniversifyModel(): AnniversifyModel {
    let model = new AnniversifyModel()
    model.name = this.localStorageService.getSpotifyUserDetails()?.display_name
    return model
  }

  get user(): SpotifyApi.UserObjectPublic { 
    return this.localStorageService.getSpotifyUserDetails()
  }

  updateNeedMoreScopes(event: boolean) {
    this.needsMoreScopes = event
  }

  togglePushNotifications(event: MatSlideToggleChange) {
    if (event.checked) {
      this.swPush.requestSubscription({ serverPublicKey: config.anniversify.vapidPublicKey })
        .then(sub => { 
          console.log(sub.toJSON()) 
          let pushNotificationObject: PushNotificationObject = new PushNotificationObject()
          pushNotificationObject.subscription = JSON.parse(JSON.stringify(sub.toJSON()))
          this.anniversifyForm.controls['pushNotificationObject'].setValue(pushNotificationObject)
          this.messageService.open("Notification permission granted. Make sure you save your settings to enable notifications!")
        })
        .catch(err => {
          this.messageService.open("Error while requesting push notification permissions. Did you disable permissions? If so, go to Settings > Notifications, find N.M.T, and toggle Allow Notifications, and restart this app.")
          this.anniversifyForm.controls['pushNotificationObject'].setValue(null)
          console.error(err)
        })
    } else {
      this.anniversifyForm.controls['pushNotificationObject'].setValue(null)
    }
  }

  canEnablePushNotifications(): boolean {
    return config.spotify.redirectUri.includes('localhost') ? true :
     (window.navigator as any)?.standalone && this.isIOSVersionAtLeast(16, 4)
    // return true
  }

  isIOSVersionAtLeast(requiredMajor: number, requiredMinor: number): boolean {
    const userAgent = window.navigator.userAgent;
    
    // Check if the user agent contains information about iOS
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any)?.MSStream) {
      // Extract the iOS version using a regular expression
      const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  
      if (match) {
        const majorVersion = parseInt(match[1], 10);
        const minorVersion = match[2] ? parseInt(match[2], 10) : 0;
        
        // Check if the version is equal to or greater than the required version
        return majorVersion > requiredMajor || (majorVersion === requiredMajor && minorVersion >= requiredMinor);
      }
    }
  
    return false; // Return false for non-iOS devices or if the version information cannot be determined
  }

  dismissedAddToHomeScreen() {
    return localStorage.getItem("dismissAddToHomescreen") == "true"
  }

  showHomescreenInstructions() {
    localStorage.setItem("dismissAddToHomescreen", "false")
  }
}
