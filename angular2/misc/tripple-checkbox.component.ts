import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output, SimpleChanges} from '@angular/core';
import {MatCheckbox} from "@angular/material/checkbox";


/**
 * @Component компонент трехзначного чекбокса
 */
@Component({
  selector: 'tripple-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-checkbox #checkboxCtrl color="primary"
                  [disabled]="disabled"
                  [indeterminate]="value === false"
                  (ngModelChange)="onChange(checkboxCtrl, $event)"
                  [ngModelOptions]="{standalone: true}"
                  [(ngModel)]="value">{{label}}
    </mat-checkbox>
  `
})
export class TrippleCheckboxComponent {
  /** назавние */
  @Input() label: string;
  /** значение */
  @Input() value: boolean = null;
  /** disabled */
  @Input() disabled: boolean;
  /** колбек в родителя */
  @Output() valueChange = new EventEmitter<boolean>();
  /** предыдущее значение */
  prevValue: boolean | null = this.value;

  /** после изменения значения */
  onChange(checkboxCtrl: MatCheckbox, value: boolean | null): void {
    // возврат к шагу 1(конец цикла)
    if(this.prevValue === false && value === true) {
      this.prevValue = null;
      checkboxCtrl.writeValue(null);
      this.valueChange.emit(null);
    // 2 шаг
    } else if(this.prevValue === true && value === false) {
      this.prevValue = false;
      this.valueChange.emit(false);
    // 1 шаг
    } else if(this.prevValue === null && value === true) {
      this.prevValue = true;
      this.valueChange.emit(true);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    this.prevValue = this.value
  }

}
