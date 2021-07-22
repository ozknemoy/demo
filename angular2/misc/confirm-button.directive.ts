import {HostListener, Directive, Output, EventEmitter, Input} from '@angular/core';
import {DialogService} from "../service/dialog.service";
import {debounce} from "../_decorators/debounce.decorator";

/**
 * @Component директива вызова модалки подтверждения действия пользователя
 */
@Directive({
  selector: '[confirmButton]',
})
export class ConfirmButtonDirective {
  @Input() text: string;
  @Output() callback = new EventEmitter();
  dblclicked = false;

  constructor(private dialogService: DialogService) {
  }

  @debounce(300)
  click() {
    if(this.dblclicked) return;
    this.dialogService.confirm(this.text || 'Удалить?').subscribe(confirmed => {
      if (confirmed) {
        this.emit()
      }
    })

  }

  @HostListener('dblclick', ['$event'])
  @HostListener('click', ['$event'])
  dblclick($event) {
    if($event.type === 'click') return this.click();
    this.dblclicked = true;
    setTimeout(() => this.dblclicked = false,400)
    this.emit()
  }

  emit() {
    this.callback.emit()
  }

}
