import {ICourierSetting} from "../../../models/courier-setting";
import {IDesadvDoc, IDesadvHeader} from "../../../models/desadv.model";
import {Dicsrv} from "../../../services/dictionary.service";
import {DictLocalSrv} from "../../../services/dictionary-local.service";
import {DesadvSrv} from "../../../services/desadv.service";
import {ICMPSettingHandled, SYSsrv} from "../../../services/sys.service";
import {DifferentNetsSrv} from "../../../services/different-nets.service";
import {DocValidationSrv} from "../../../services/doc-validation.service";
import {Docsrv} from "../../../services/doc.service";
import {_} from "../../../helpers-and-libs/globals";
import {userSessionSrv} from "../../../services/user-session.service";
import {ICompany} from "../../../models/company.model";
import {canActivate} from "../../../decorators/can-activate.decorator";
import {DocEdit, DocMode} from "../../_classes/doc-edit.class";
import {Component, Input} from "angular-ts-decorators";
import {IKendoEventSelect} from "../../../models/kendo-event.intrface";
import {IAlcoManufacturer} from "../../../models/dicts.model";


type TDesadvFooter = 'totalSumWithoutTax' | 'totalSum' | 'sumNds' | 'nqty';

/**
 * @Component компонент редактора десадв
 */
@Component({
  selector: 'desadv-edit',
  controllerAs: 'desadv',
  template: require('./desadv-edit.component.html')
})
export class DesadvEditComponent extends DocEdit<IDesadvDoc>{
  /** режим */
  @Input('@') mode: DocMode;
  /** херпер */
    public _ = _;
  /** курьер настройки */
    private courierSettings: ICourierSetting;
  /** словарь dp */
    private deliveryPointDictionary: ICompany[];
  /** словарь dp загружается */
    private deliveryPointDictionaryLoading = true;
  /**ид дока  */
    private docId: number;
  /** десадв пятерки */
    private isX5: boolean;
  /** настройки из админок */
    private settings: ICMPSettingHandled;
  /** отобразить ссылку Упаковочный лист */
    public _showPackRef: boolean;
  /** словарь */
    private manufacturerGlnsList;
  /** опции кендо комбо бокса manufacturerGlns */
    private manufacturerGlnsOptions;
    /** отображение формы */
    showDocForm = false;
  /** поля для подсчета сумм футера */
  footerFields: TDesadvFooter[] = ['totalSumWithoutTax', 'totalSum', 'sumNds', 'nqty'];

    constructor(
      protected $state,
      protected $timeout,
      protected DesadvSrv: DesadvSrv,
        private Dicsrv: Dicsrv,
        private DictLocalSrv: DictLocalSrv,
      protected DifferentNetsSrv: DifferentNetsSrv,
      protected Docsrv: Docsrv,
        protected DocValidationSrv: DocValidationSrv,
        private SYSsrv: SYSsrv,
        private userSessionSrv: userSessionSrv,
    ) {
        'ngInject';
      super('desadv', DocValidationSrv, $state, Docsrv, DifferentNetsSrv, $timeout, DesadvSrv);
    }

  @canActivate()
  $onInit() {
    this.onInit('docDate');
  }

  /** после инициализации полей DW */
  protected afterFieldsInit() {
    if (this.isShow('invoicee.gln')) {
      this.Dicsrv.getInvoiceeByGln(this.doc.header.buyer.gln).then((deliveryPoints: ICompany[]) => {
        this.deliveryPointDictionary = deliveryPoints;
        this.deliveryPointDictionaryLoading = false;
      })
    }
    if (this.isShow('manufacturerGln')) {
      this.Dicsrv.getAlcoManufacturers(undefined, false).then((d) => {
        this.manufacturerGlnsList = d.filter((m) =>
          ['PROIN', 'PROOUT'].indexOf(m.companyType) > -1 && !_.isInvalidValue(m.companyGln));
      });
      this.manufacturerGlnsOptions = this.getManufacturerGlnOptions();
    }
  }

  /** после инициализации дока */
  afterDocInit() {
        const doc = this.doc;
        this.docId = this.DesadvSrv.docId;
        this.isX5 = this.DifferentNetsSrv.isX5Doc(doc);
        this.Docsrv.getDoc(doc.doc.parent.id).then((baseDoc)=> {
          this.parentDoc = baseDoc;
            // добрасываю фреш для валидации тк иначе не пробросить
            this.doc.header.fresh = baseDoc.header.fresh;
        });
        this._showPackRef = this.showPackRef();
        this.DesadvSrv.getSettingsList(doc.header.buyer.id).then((settings)=>{
            this.settings = settings;
            this.SYSsrv.getWebAdminSettingsAndExtendCMP(doc, this.settings);
            this.$timeout(() => this.showDocForm = true)
        });
        this.Docsrv.courierSettings(this.userSessionSrv.getCache.userSession.companyId, this.doc.header.buyer.id, 'DESADV')
            .then((d:ICourierSetting)=> this.courierSettings = d);

    }

  /** сохранение */
    public save(beforeSend: boolean) {
      if(this.DesadvSrv.isValidPackages(this.doc, 'item', this.settings)
        && this.DesadvSrv.isValidPackages(this.doc, 'returnedPacks', this.settings)) {
        return this.DesadvSrv.save(this.doc, beforeSend).then((savedId:number)=> {
          this.isNewDoc = false;
          if (this.docId != savedId) {
            this.$state.go('desadv-edit', {id: savedId});
          } else {
            this._showPackRef = this.showPackRef()
          }
          // это нужно!
          return savedId
        });
      }
      return Promise.reject(null);
    }

    showPackRef() {
      return this.mode === 'edit' && this.doc && _.isFilledArray(this.doc.packageInfo)
    }

  /** отправка */
  public send() {
    // по мимо стандартноой валидации после будет валидация упаковок
    return this.DocValidationSrv.validate('desadv', this.doc).then(errors=> {
      this.$timeout(()=>this.errors = errors);
      if (!errors.length) {
        this.save(true).then((savedId:number)=> {
          this.Docsrv.sendDoc(
            savedId,
            "DESADV",
            this.doc.header.seller.gln,
            this.doc.header.buyer.gln,
            this.Docsrv.sendingToCourier(this.courierSettings)
          )
        })
      }
    })
  }

  /** после выбора manufacturerGln в селекте */
  manufacturerGlnChange(kendoEvent: IKendoEventSelect<IAlcoManufacturer>) {
    const selectedI = kendoEvent.sender.selectedIndex;
    if(selectedI === -1) {
      this.doc.header.manufacturerGln = null;
    } else {
      const row = kendoEvent.sender.listView._dataItems[0];
      this.doc.header.manufacturerGln = row.companyGln;
    }
  }


  /** после загрузки sscc файла */
  afterUploadSsccFile(desadv: IDesadvDoc) {
    this.doc = desadv;
    this.showDocForm = false;
    this.$timeout(()=> this.showDocForm = true, 1000);
  }

  /** опции кендо комбо бокса manufacturerGlns */
  getManufacturerGlnOptions() {
    return {
      filtering: function (e) {
        const filterValue = e.filter != undefined ? e.filter.value : "";
        e.preventDefault();
        this.dataSource.filter({
          logic: "or",
          filters: [{
            field: 'companyName',
            operator: 'contains',
            value: filterValue
          }, {
            field: 'companyGln',
            operator: "contains",
            value: filterValue
          }]
        });
      }
    };
  }

  afterFooterCount({totalSumWithoutTax, sumNds, totalSum, nqty}: {[key in TDesadvFooter]: number}) {
    this.doc.header.totalSumWithoutTax = totalSumWithoutTax;
    this.doc.header.sumNds = sumNds;
    this.doc.header.totalSum = totalSum;
    this.doc.header.shippedQuantity = nqty;
    this.countTotalSumWithDiscount();
  }

  countTotalSumWithDiscount() {
    this.doc.header.totalSumWithDiscount = _.subtract(this.doc.header.totalSum, this.doc.header.discountSum);
    if(this.doc.header.totalSumWithDiscount < 0) {
      this.doc.header.totalSumWithDiscount = null;
    }
  }
}
