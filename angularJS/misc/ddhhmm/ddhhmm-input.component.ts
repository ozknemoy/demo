import {Component, Input, Output} from "angular-ts-decorators";
import {DictLocalSrv} from "../../../services/dictionary-local.service";

/**
 * @Component Компонент выбора даты как набора день + месяц + год
 */
@Component({
  selector: 'ddhhmm-input',
  template: `
    <ui-select class="select"
               ng-if-start="$ctrl.hasD"
               on-select="$ctrl.onChangeInput()"
               ng-model="$ctrl.dd">
        <ui-select-match placeholder="ДД">{{$select.selected}}</ui-select-match>
        <ui-select-choices repeat="dd in $ctrl.hundredHours | filter: $select.search track by $index">
            <span>{{dd}}</span>
        </ui-select-choices>
    </ui-select>
    <label class="ddhhmm-input__label" ng-if-end>д</label>
    <ui-select class="select"
               ng-if-start="$ctrl.hasH"
               on-select="$ctrl.onChangeInput()"
               ng-model="$ctrl.hh">
        <ui-select-match placeholder="ЧЧ">{{$select.selected}}</ui-select-match>
        <ui-select-choices repeat="dd in $ctrl.twentyFourHours | filter: $select.search track by $index">
            <span>{{dd}}</span>
        </ui-select-choices>
    </ui-select>
    <label class="ddhhmm-input__label" ng-if-end>ч</label>
    <ui-select class="select"
               ng-if-start="$ctrl.hasM"
               on-select="$ctrl.onChangeInput()"
               ng-model="$ctrl.mm">
        <ui-select-match placeholder="ММ">{{$select.selected}}</ui-select-match>
        <ui-select-choices repeat="dd in $ctrl.sixtyMinutes | filter: $select.search track by $index">
            <span>{{dd}}</span>
        </ui-select-choices>
    </ui-select>
    <label class="ddhhmm-input__label" ng-if-end>м</label>
    <div not-if="::$ctrl.hideResetBtn" class="ddhhmm-input__reset-btn" ng-show="$ctrl.dd || $ctrl.hh || $ctrl.mm">
      <i class="icon-20 i-del" ng-click="$ctrl.reset()"></i>
    </div>
`,
})
export class DDHHMMInputComponent {
  /** значение в формате DDHHMM */
  @Input() value;
  /** флаг спрятать кнопку удаления. например для фильтра */
  /*@Input($attrs) */hideResetBtn = this.$attrs.hasOwnProperty('hideResetBtn');
  /** тип например HHMM */
  @Input('@?') type: string;
  /** колбек в родителя */
  @Output('&?') onChange;
  /** значение селекта DD */
  dd;
  /** значение селекта HH */
  hh;
  /** значение селекта MM */
  mm;
  /** значение по умолчанию */
  readonly oneDefaultValue = '00';
  /** справочник значений от 0 до 24 */
  twentyFourHours = this.DictLocalSrv.twentyFourHours;
  /** справочник значений от 0 до 100 */
  hundredHours = this.DictLocalSrv.hundredHours;
  /** справочник значений от 0 до 60 */
  sixtyMinutes = this.DictLocalSrv.sixtyMinutes;
  /** отображение селекта ДД */
  hasD: boolean;
  /** отображение селекта ЧЧ */
  hasH: boolean;
  /** отображение селекта ММ */
  hasM: boolean;
  
  constructor(private $attrs, private DictLocalSrv: DictLocalSrv) {
    'ngInject'
  }

  $onInit() {
    this.type = this.type || 'DDHHMM';

    this.hasD = this.hasChunk('DD');
    this.hasM = this.hasChunk('MM');
    this.hasH = this.hasChunk('HH');
    this.split();
  }

  /** есть ли substring */
  hasChunk(chunk: 'DD' | 'MM' | 'HH') {
    return this.type.indexOf(chunk) > -1
  }

  $onChanges() {
    this.split();
  }

  /** подготовка значений для селектов */
  split() {
    if(this.value && typeof this.value === 'string') {
      if(this.value.length === 6 && this.type === 'DDHHMM') {
        this.dd = this.value.slice(0, 2);
        this.hh = this.value.slice(2, 4);
        this.mm = this.value.slice(4, 6);
      } else if(this.value.length === 4 && this.type === 'HHMM') {
        this.hh = this.value.slice(0, 2);
        this.mm = this.value.slice(2, 4);
      }
    } else if(this.value === null) {
      this.reset();
    }
  }

  /** конкатенация в значение для сохранения */
  join(): string {
    if(this.type === 'DDHHMM') return this.dd + this.hh + this.mm;
    else if(this.type === 'HHMM') return this.hh + this.mm;
  }

  /** подготовка значения для сохранения */
  onChangeInput() {
    if(!this.dd)  this.dd = this.oneDefaultValue;
    if(!this.hh)  this.hh = this.oneDefaultValue;
    if(!this.mm)  this.mm = this.oneDefaultValue;
    this.onChange({$value: this.join()})
  }

  /** сброс селектов и значения для сохранения */
  reset() {
    this.dd = null;
    this.mm = null;
    this.hh = null;
    this.onChange({$value: null})
  }
}
