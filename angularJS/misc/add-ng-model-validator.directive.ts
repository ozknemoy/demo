import {Directive, ViewParent, Input} from "angular-ts-decorators";
import {INgModelController} from "angular";

/**
 * @Component директива добавляющая функцию валидатор в ngModel
 * @description привалидации надо помнить что валидатор проверяется еще до того как значение ng-model попадет в объект
 * поэтому надо работать с modelValue во addNgModelValidator методе
 */
@Directive({
  selector: 'add-ng-model-validator',
})
export class AddNgModelValidatorDirective {
  // контроллер ngModel
  @ViewParent('ngModel') ngModelCtrl: INgModelController;
  // функция проверки валидности. false - не валидно, true - валидно
  @Input() addNgModelValidator: (modelValue: any, viewValue: any) => boolean;
  // this который используется внутри функции addNgModelValidator
  @Input() outerCtrl;

  $onInit() {
    if(!this.addNgModelValidator) throw new Error('has no addNgModelValidator');
    // если в функции есть контекстные поля то его надо добавить
    this.ngModelCtrl.$validators.customValidator = this.outerCtrl
      ? this.addNgModelValidator.bind(this.outerCtrl)
      : this.addNgModelValidator;
  }

}
