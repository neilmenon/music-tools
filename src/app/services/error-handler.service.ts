import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  constructor() { }

  getHttpErrorMessage(err: HttpErrorResponse): string {
    let message: string = ""
    if (!err?.error) {
      return message
    } 
    message = typeof err.error === "string" ? err.error : 
      err.error?.error_description ? err.error.error_description :
      ""

    return ` (Error: ${ message })`
  }
}
