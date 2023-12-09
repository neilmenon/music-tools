import { Component } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { MessageService } from './services/message.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'music-tools';

  constructor(private swUpdate: SwUpdate, private messageService: MessageService) {
    if (this.swUpdate.isEnabled) {
      swUpdate.versionUpdates.subscribe((update) => {
        switch (update.type) {
          case 'VERSION_READY':
            this.messageService.open("New app version is available! Restart/reload to update.", "center", true)
            break
          case 'VERSION_INSTALLATION_FAILED':
            // this.messageService.open(`Failed to install app version`)
            break
        }
      })
    } else {
      console.warn("swUpdate not enabled")
    }
  }
}