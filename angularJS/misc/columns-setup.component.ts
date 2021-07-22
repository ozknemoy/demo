import {Component, Output} from "angular-ts-decorators";
import {IDocDirectionUpperCase} from "../../models/doc.model";
import {DocListSrv} from "../../services/documents-list.service";
import {_} from "../../helpers-and-libs/globals";


export interface IColumnsSetup {
  name: string
  label?: string
  sequenceNumber: number
  visible: boolean
  canChangeVisibility: boolean
}


/**
 * @Component компонент настройки отображения колонок на списках доков
 */
@Component({
  selector: 'columns-setup',
  template: `<i id="intro-columns-setup" class="tool-20 i-icons cursor-pointer" title="Настройка колонок"
                ng-click="$ctrl.openModal()"></i>`,
})
export class ColumnsSetupComponent {
  /** колбек в родителя */
  @Output() columnsChanged;
  /** колонки */
  columns: IColumnsSetup[];
  /** направление списка */
  direction: IDocDirectionUpperCase = this.$state.current.name.split('-').pop().toUpperCase();

  constructor(
    private DocListSrv: DocListSrv,
    private ediModal: any,
    private $state) {
    'ngInject'

  }

  $onInit() {
    this.DocListSrv.setTableColumns(this.direction).then(columns => {
      this.columns = ColumnsSetupComponent.sortedColumns(columns);
      this.columnsHasChanged(columns);
    })
  }

  /** применить колонки */
  static sortedColumns(columns: IColumnsSetup[]): IColumnsSetup[] {
    return columns.sort((a, b) => a.sequenceNumber > b.sequenceNumber ? 1 : -1);
  }

  /** при изменении колонок */
  columnsHasChanged(columns: IColumnsSetup[]) {
    this.columnsChanged({$columns: _.copy(columns)})
  }

  openModal() {
    this.ediModal.open({
      animation: true,
      title: 'Настройка колонок',
      template: `
      <div class="k-window__scrollable-holder">
        <span class="helper">Порядок колонок можно менять. Просто схватите мышкой название колонки и поместите в нужное место.</span>
        <ul class="pr5 pl5">
          <li ng-repeat="column in $ctrl.columns track by column.name" class="level-1 lr-drag-n-drop"
            debug="{{::column.name}}"
            lr-drag-data="$ctrl.columns"
            lr-drag-src="reorder"
            lr-drop-target="reorder">
            <label class="lr-drag-n-drop__child mr5">
              <input type="checkbox" ng-model="column.visible"
                ng-class="{'visibility-hidden': !column.canChangeVisibility}">
              {{column.label}}
            </label>
          </li>
          <li class="mt5"><!--НЕ УДАЛЯТЬ. нужно для того, чтобы не дергался скролл при перетаскивании в конец--></li>
        </ul>
      </div>
      <div class="k-window__footer">
        <button type="button" ng-click="$ctrl.save()" class="k-window__footer-main-btn right">Сохранить</button>
        <button class="k-window__footer-cancel-btn right" ng-click="$ctrl.getDefaultTableColumns()">По умолчанию</button>
        <button class="k-window__footer-cancel-btn k-window__footer-btn-pinned-left" ng-click="$ctrl.cancel()">Отмена</button>
      </div>
      `,
      controller: ColumnsSetupModal,
      controllerAs: '$ctrl',
      width: '350px',
      resolve: {
        direction: ()=> this.direction,
        columns: ()=> _.copy(this.columns),
      }
    }).result.then((columns) => {
      if(columns) {
        this.columns = columns;
        this.columnsHasChanged(columns)
      }
    })
  }

}


/**
 * @Component компонент модалки настройки отображения колонок на списках доков
 */
class ColumnsSetupModal {

  constructor(private direction: IDocDirectionUpperCase,
              private $uibModalInstance,
              public columns: IColumnsSetup[],
              private DocListSrv: DocListSrv,) {
    'ngInject'
  }

  /** кнопка сохранить колонки */
  save() {
    // resort
    this.columns.forEach((column, i) => column.sequenceNumber = i + 1);
    // save
    this.DocListSrv.saveTableColumns(this.columns, this.direction);
    // and apply
    this.$uibModalInstance.close(this.columns);

  }

  /** кнопка сбрость колонки к умолчательным */
  getDefaultTableColumns() {
    this.DocListSrv.getDefaultTableColumns(this.direction)
      .then(columns => this.columns = ColumnsSetupComponent.sortedColumns(columns))
  }

  cancel() {
    this.$uibModalInstance.dismiss()
  }
}
