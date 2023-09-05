import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from '../services/local-storage.service';
import { AnniversifyService } from '../services/anniversify.service';
import { AnniversifyModel } from '../models/anniversifyModel';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { timezones } from '../constants/timezones';
import { MessageService } from '../services/message.service';
import * as moment from 'moment';
import { config } from '../config/config';

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

  constructor(
    private localStorageService: LocalStorageService,
    private anniversifyService: AnniversifyService,
    private fb: UntypedFormBuilder,
    private messageService: MessageService
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

    if (this.user) {
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
      this.messageService.open("Either email or playlist notification method must be enabled to save!")
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
}
