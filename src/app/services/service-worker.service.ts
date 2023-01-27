import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { MessageService } from './message.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceWorkerService {

  constructor(
    private messageService: MessageService,
    updates: SwUpdate
  ) { 
    // check for app updates via ng-service worker
    updates.versionUpdates.subscribe(update => {
      switch (update.type) {
        case 'VERSION_READY':
          this.messageService.open("New app version is available! Reload or restart the app to update.", "center", true)
          break
        case 'VERSION_INSTALLATION_FAILED':
          this.messageService.open(`Failed to install app version`)
          break
      }
    })
  }
}
