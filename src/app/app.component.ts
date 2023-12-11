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
  isStandalone: boolean = (navigator as any)?.standalone
  isIOSSafari = this.getIOSSafari()

  constructor(private swUpdate: SwUpdate, private messageService: MessageService) {
    if (this.swUpdate.isEnabled) {
      swUpdate.versionUpdates.subscribe((update) => {
        switch (update.type) {
          case 'VERSION_READY':
            this.messageService.open("New app version is available!", "center", true)
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

  get showAddToHomescreen(): boolean {
    // return localStorage.getItem("dismissAddToHomescreen") != "true"
    return !this.isStandalone &&
      this.isIOSSafari &&
      localStorage.getItem("dismissAddToHomescreen") != "true"
  }

  getIOSSafari(): boolean {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!Chrome|Android).)*Safari/.test(userAgent);

    return isIOS && isSafari;
  }
}