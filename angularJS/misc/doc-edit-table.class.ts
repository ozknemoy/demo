import {DifferentNetsExtras} from "../../services/different-nets-extras.notservice";
import {IBackFields} from "../../models/tables-fields.model";
import {DifferentNetsSrv, IBackFieldsHandled, TFieldsExtras} from "../../services/different-nets.service";
import {Docsrv} from "../../services/doc.service";
import {Dicsrv} from "../../services/dictionary.service";
import {_} from "../../helpers-and-libs/globals";
import {DictLocalSrv} from "../../services/dictionary-local.service";
import {ICountry, IObjBoolean, ISimpleDict} from "../../models/dicts.model";
import {TableCommonSrv} from "../../services/table-common-methods.service";
import {ICMPSettingHandled} from "../../services/sys.service";
import {ICalculationMethod} from "../../models/pricat.model";


export class DocEditTable <D extends {header: any, item: any[]}> extends DifferentNetsExtras {
  protected doc: D;
  protected originalDoc: D;
  // это _select который бросается снаружи
  // нужен если есть фильтр в доке
  protected selectedRows;
  /** чекбоксы выделения строк */
  protected _select = new IObjBoolean();
  protected filteredTable;
  onSelectGoods: Function;
  /** поля таблицы из админки */
  protected backFields: IBackFields[];
  /** мапа полей таблицы из админки */
  protected fDict: IBackFieldsHandled;
  /** дополнения полей из админки */
  protected extras: TFieldsExtras;
  /** отображать таблицу */
  protected showTable: boolean;
  protected _ = _;
  /** значение по умолчанию пагинатора */
  public itemsPerPage = this.DictLocalSrv.itemsPerPage;
  /** текущая страница пагинатора */
  public currentPage = 1;
  /** справочник возможных значений пагинатора */
  protected pagerOptions:ISimpleDict[] = this.DictLocalSrv.pagerOptions;
  /** ид покупателя */
  public buyerId: number;
  /** показать таблицу сразу */
  protected autoShowTable = true;
  /** настройки из админок */
  protected settings: ICMPSettingHandled;

  constructor(
    protected docType: string,
    protected DifferentNetsSrv: DifferentNetsSrv,
    protected Docsrv: Docsrv,
    protected DictLocalSrv: DictLocalSrv,
    protected Dicsrv: Dicsrv,
    protected TableCommonSrv: TableCommonSrv,
    protected extendWithRowNumber?: boolean,
  ) {
    'ngInject';
    super();
  }

  $onInit() {
    this.init();
  }

  init() {
    if (!this.doc) return console.warn("таблицу надо инициализировать только после получения дока");
    this.buyerId = DifferentNetsSrv.getBuyerId(this.doc);
    this.DifferentNetsSrv.handleFrontFields(this.docType, this.doc, 'table', 'tblEdit').then(dWFields => {
      // для верстки
      this.extras = dWFields.extras;
      this.fDict = dWFields.fDict;// не менять название переменной/ используется в директивах
      this.backFields = dWFields.backFields;
      this.afterDWFieldDefined(dWFields);
    });
  }

  /** инициализация */
  afterDWFieldDefined(dWFields) {
    if(this.extendWithRowNumber) {
      this.doc.item.forEach((row, i) => {
        row['_number'] = i;
      });
      [this.backFields, this.fDict] = this.DifferentNetsSrv.extendWithRowNumber(dWFields.backFields, dWFields.fDict);
    }

    if(this.autoShowTable) this.showTable = true;
    this.afterFieldsInit()
  }

  /** ДО инициализации полей dw */
  protected beforeFieldsInit() {}

  /** ПОСЛЕ инициализации полей dw */
  protected afterFieldsInit() {}

  onChangeRow(row: D['item'][0], newRow: D['item'][0]): void {
    Object.assign(row, newRow);
  }

  /** вернет реальный номер строки в массиве а не пейджинговый */
  getRowNumber($index: number) {
    return $index + (this.itemsPerPage * (this.currentPage - 1))
  }

  /** удаление строчки таблицы и постобработка */
  deleteRowAndHandleTable(i: number) {
    this.TableCommonSrv.deSelectMassDelObject(this.selectedRows);
    this.TableCommonSrv.deSelectMassDelObject(this._select);
    this.doc.item.splice(i, 1);
    this.doc.item.forEach((row, i)=> {
      row['_number'] = i;
    });
    // если есть фильтр и он уже задействован удаляю строку и в нём
    if(this.filteredTable) {
      // без слома наследования
      this.filteredTable.some((row, j) => {
        if(row._number === i) {
          this.filteredTable.splice(j, 1);
          return true
        }
      });

    }
  }

  /** для восстановления неизменяемого числа строк в таблице */
  recoverSelectedUndeletableRows() {
    // применяю только для снаружи отфильтрованного результата
    const table = _.isFilledArray(this.filteredTable) ? this.filteredTable : this.doc.item;
    table.forEach((row, i) => {
      if(this.selectedRows[i]) {
        Object.assign(row, this.originalDoc.item[i]);
      }
    });
  }

  /** восстановление всей таблицы */
  recoverAllTable() {
    const table = _.isFilledArray(this.filteredTable) ? this.filteredTable : this.doc.item;
    table.forEach((row, i) => {
        Object.assign(row, this.originalDoc.item[i]);
    });
  }

  /** после смены страны */
  afterChangeCountry(row, countryRowDict: ICountry) {
    row.country = countryRowDict.alpha2;
    if (this.DictLocalSrv.isCustomsUnion(countryRowDict.alpha2)) row.gtd = null;
  }

  // 3 метода ниже продублированны в DocEditTableModal
  /** редактируемость НДС */
  pointerNoneChangeNDS(...additionalConditions: boolean[]) {
    return (this.fDict?.nds?.xlsReadOnly)
      || this.disabledByCalcMethod(['31', '4'])
      || (additionalConditions && additionalConditions.indexOf(true) > -1) ? this.ngClassPointerNone : null
  }

  /** редактируемость полей по методу расчета */
  pointerNoneByCalcMethod(methods: ICalculationMethod[]) {
    return this.disabledByCalcMethod(methods) ? this.ngClassPointerNone : null
  }

  /** редактируемость полей по методу расчета */
  disabledByCalcMethod(methods: ICalculationMethod[]): boolean {
    // после доработок расчетов мегафона претензии по поводу медленности редактора респонза не принимаются
    return methods.indexOf(this.doc.header.calculationMethod) > -1
  }

  resetSelection() {
    this._select = new IObjBoolean();
  }

}


