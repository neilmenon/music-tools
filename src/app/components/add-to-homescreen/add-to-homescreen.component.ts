import { Component } from '@angular/core';

@Component({
  selector: 'app-add-to-homescreen',
  templateUrl: './add-to-homescreen.component.html',
  styleUrl: './add-to-homescreen.component.css'
})
export class AddToHomescreenComponent {

  dismiss() {
    localStorage.setItem("dismissAddToHomescreen", "true")
  }

}
