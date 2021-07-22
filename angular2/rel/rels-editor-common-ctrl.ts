import {ActivatedRoute, Router} from "@angular/router";
import {IRel, IRelTemplateDetail} from "../../models/outer/rel.interface";
import {DictService} from "../../main/service/dict.service";
import {Observable} from "rxjs";
import {IRelFormat} from "../../models/outer/rel-format.dict.interface";
import {IRelProtocol} from "../../models/outer/rel-protocol.interface";
import {IDocumentTypes} from "../../models/outer/document-types.dict.interface";
import {RelsService} from "../../main/service/rels.service";
import {FormBuilder, FormControl, FormGroup} from "@angular/forms";
import {HandleData} from "../../main/service/handle-data";
import {Dict} from "../../models/outer/no-model/dict.interface";
import {DialogService} from "../../main/service/dialog.service";
import {__} from "../../__.util";
import {map} from "rxjs/operators";

/**
 * @Component родительский класс редактора шаблонов взаимосвязей
 */
export class RelsEditor<T> {
  /** отображение формы */
  showForm = false;
  /** взаимосвязь */
  rel: IRelTemplateDetail | IRel;
  /** создание */
  isNewRel = true;
  /** объект класса с pointerNone */
  disableIfNotNew;
  /** справочник */
  relFormat$$: Observable<IRelFormat[]>;
  /** справочник */
  relProtocol$$: Observable<IRelProtocol[]>;
  /** справочник */
  docTypes$$: Observable<IDocumentTypes[]>;
  /** справочник */
  specialEmail$$: Observable<Dict.IStdDict[]>;
  /** справочник */
  coding$$: Observable<Dict.ICodeStdDict[]>;
  /** справочник */
  uniqueTypes$$: Observable<Dict.IStdDict[]>;
  /** справочник */
  loadToCourierList$$: Observable<Dict.IStdDict[]>;
  /** справочник */
  courierStandList$$: Observable<Dict.IStdDict[]>;
  /** справочник */
  routeCourierSendList: Dict.IStdDictWithShortName[];
  /** справочник */
  courierLoadDoubleList: Dict.IStdDict[];
  /** справочник */
  bindingESFList: Dict.IStdDict[];
  /** форма */
  relForm: FormGroup;
  /** тип уведомления */
  // оставил  обработку specialEmailId в общем классе чтобы не ругался типизатор в шаблоне
  specialEmailId = new FormControl({value: null, disabled: true});
  /** ид взаимосвязи */
  id: number;
  /** шаблон а не взаимосвязь */
  isTmplRel: boolean;
  /** поиск по типу лока */
  public _documentTypesId = new FormControl();
  /** поиск по формату отправителя */
  public _sFormatId = new FormControl();
  /** поиск по формату получателя */
  public _rFormatId = new FormControl();
  /** сохранение и получение */
  loading: boolean;

  constructor(protected route: ActivatedRoute,
              protected router: Router,
              protected dictService: DictService,
              protected fb: FormBuilder,
              protected dialogService: DialogService,
              protected relsService: RelsService) { }


  /** инициировать форму */
  async initForm() {
    this.disableIfNotNew = {'pointer-none': !this.isNewRel};
    const rel = this.rel;
    this.relForm = this.fb.group({
      docTypeId: {value: rel.docTypeId, disabled: !this.isNewRel && !this.isTmplRel},
      senderFormatId: {value: rel.senderFormatId, disabled: false},
      receiverFormatId: {value: rel.receiverFormatId, disabled: false},
      senderProtocolId: {value: rel.senderProtocolId, disabled: false},
      receiverProtocolId: {value: rel.receiverProtocolId, disabled: false},
      fileName: {value: rel.fileName, disabled: false},
      docSequence: {value: rel.docSequence, disabled: false},
      checkUniqueType: {value: rel.checkUniqueType, disabled: false},
      needMail: {value: rel.needMail, disabled: false},
      mails: {value: rel.mails, disabled: !rel.needMail},
      isTransitDoc: {value: rel.isTransitDoc, disabled: rel.needEancomOut},
      needEancomOut: {value: rel.needEancomOut, disabled: rel.isTransitDoc},
      needReceiverPriceList: rel.needReceiverPriceList,
      canMerge: {value: rel.canMerge, disabled: !rel.needReceiverPriceList},
      loadWithError: {value: rel.loadWithError, disabled: !rel.needReceiverPriceList},
      needReceiverSendErrorMail: {value: rel.needReceiverSendErrorMail, disabled: false},
      receiverMail: {value: rel.receiverMail, disabled: !rel.needReceiverSendErrorMail},
      searchDocParent: {value: rel.searchDocParent, disabled: false},
      needSla: {value: rel.needSla, disabled: false},
      needOriginDoc: rel.needOriginDoc,
      //canCreate: {value: rel.canCreate, disabled: false},
      //needDebug: {value: rel.needDebug, disabled: false},
      cleanXmlIn: {value: rel.cleanXmlIn, disabled: false},
      needAperak: {value: rel.needAperak, disabled: false},
      isVet: {value: rel.isVet, disabled: false},
      loadToCourier: {value: rel.loadToCourier, disabled: false},
      senderCodingId: {value: rel.senderCodingId, disabled: false},
      receiverCodingId: {value: rel.receiverCodingId, disabled: false},
      needCourierSent: {value: rel.needCourierSent, disabled: !rel.loadToCourier},
      courierLoadDouble: {value: rel.courierLoadDouble, disabled: !rel.loadToCourier || !this.isInvoiceSf(rel)},
      bindingESF: {value: rel.bindingESF, disabled: !rel.loadToCourier || !this.isInvoiceOrActFns(rel)},
      uniqueAperak: {value: rel.uniqueAperak, disabled: !this.enableUniqueAperak(rel)},
      id: rel.id,
      courierStand: {value: rel.courierStand, disabled: !rel.loadToCourier}
    });
    this.afterInitForm();
    this.checkIsVetState();
    this.checkAperakExistence();
    if(!this.isNewRel) {
      this.handleAperakFields();
      this.handleSpecialEmailId();
      this.checkTransitDocAndEancomOut();
    }
    this.showForm = true;
  }

  /** геттер docTypeId */
  get docTypeId(): number {
    return this.controlValue('docTypeId');
  }

  /** значение контролла формы */
  controlValue<PROP extends keyof IRel>(key: PROP): IRel[PROP] {
    return this.relForm.get(<string>key).value;
  }

  /** после инициализации формы */
  afterInitForm(): void {}

  /** после смены Высылать уведомление */
  onChangeNeedMail(needMail) {
    this.disableControlAndSetValue('mails', !needMail, !needMail  ? null : undefined);
    this.handleSpecialEmailId();
  }

  /** после смены Ветконнект */
  onChangeIsVet(isVet: boolean) {
    this.disableControlAndSetValue('vetSendDocOnError', !isVet, !isVet  ? new IRel().vetSendDocOnError : undefined);
  }

  /** после смены Уведомлять получателя об ошибках */
  onChangeNeedReceiverSendErrorMail(needMail: boolean) {
    this.disableControlAndSetValue('receiverMail', !needMail, !needMail  ? null : undefined);
  }

  /** после смены загрузки в курьер */
  onChangeLoadToCourier(loadToCourier: number) {
    this.disableControlAndSetValue('courierStand', !loadToCourier, !loadToCourier  ? null : 0);
    this.disableControlAndSetValue('needCourierSent', !loadToCourier, !loadToCourier  ? null : 1);
    this.onChangeLoadToCourierOrDocType();
  }

  /** после смены Использовать прайс поставщика */
  onChangeNeedReceiverPriceList() {
    const needReceiverPriceList = this.controlValue('needReceiverPriceList');
    this.disableControlAndSetValue('loadWithError', !needReceiverPriceList, !needReceiverPriceList ? false : undefined);
    this.disableControlAndSetValue('canMerge', !needReceiverPriceList, !needReceiverPriceList ? false : undefined);
    this.handleAperakFields();
  }

  /** после смены Передавать исходный документ */
  onChangeNeedOriginDoc() {
    this.handleAperakFields();
  }

  /** после смены отправителя */
  async onChangeSender(id: number) {
    this.relForm.get('senderId').setValue(id);
    this.checkAperakExistence();
  }

  /** проверка чекбокса аперака */
  async checkAperakExistence() {
    const senderId = this.relForm.get('senderId').value;
    let aperakRelExist = false;
    if(!this.isAperak() && this.docTypeId && senderId) {
      aperakRelExist = await this.relsService.checkAperakExistence(senderId);
    }
    this.disableControlAndSetValue('needAperak', !aperakRelExist, aperakRelExist ? undefined : false);
  }

  /** аперак */
  isAperak() {
    return this.docTypeId === 17
  }

  /** после смены типа дока */
  onChangeDocType() {
    this.handleAperakFields();
    this.onChangeLoadToCourierOrDocType();
    this.checkAperakExistence();
    this.checkIsVetState();
  }

  /** выставление редактируемости isVet */
  checkIsVetState() {
    const isVet = this.relForm.get('isVet');
    //DESADV, PROINQ, RECADV, IFCSUM, INVRPT
    const needToDisable = [11, 28, 8, 35, 5].indexOf(this.docTypeId) === -1;
    if(needToDisable) {
      isVet.setValue(false);
      isVet.disable();
    } else {
      isVet.enable();
    }
  }

  /** выставление редатируемости полям аперака */
  handleAperakFields() {
    if(this.isAperak()) {
      this.disableControlAndSetValue('needAperak', true, false);
      this.disableControlAndSetValue('needReceiverPriceList', true, false);
    } else {
      const needPriceListEnabled = this.relForm.controls.needReceiverPriceList.enabled;
      // если оба disabled то значит был аперак до этого
      if(!needPriceListEnabled) {
        this.disableControlAndSetValue('needReceiverPriceList', false);
      }

    }
  }

  /** после смены типа дока или загрузки в курьер */
  onChangeLoadToCourierOrDocType() {
    const loadToCourier = this.relForm.controls.loadToCourier.value;
    const isInvoiceSf = this.isInvoiceSf();
    const isInvoiceOrActFns = this.isInvoiceOrActFns();
    //внимательно проверить
    this.disableControlAndSetValue('courierLoadDouble', !loadToCourier || !isInvoiceSf, !loadToCourier || !isInvoiceSf  ? null : 1);
    this.disableControlAndSetValue('bindingESF', !loadToCourier || !isInvoiceOrActFns, !loadToCourier || !isInvoiceOrActFns  ? null : 1);
    const disableUniqueAperak = !this.enableUniqueAperak();
    this.disableControlAndSetValue('uniqueAperak', disableUniqueAperak, disableUniqueAperak  ? (new IRel).uniqueAperak : undefined);
  }

  /** упд */
  isInvoiceSf(rel?: IRel | IRelTemplateDetail): boolean {
    return (rel ? rel.docTypeId : this.docTypeId) === 13;
  }

  /** уник аперак редактируем */
  enableUniqueAperak(rel?: IRel | IRelTemplateDetail): boolean {
    const loadToCourier = rel ? rel.loadToCourier : this.relForm.controls.loadToCourier.value;
    return loadToCourier === 2;
  }

  /** инвойс или актФнс */
  isInvoiceOrActFns(rel?: IRel | IRelTemplateDetail): boolean {
    const docTypeId = rel ? rel.docTypeId : this.docTypeId;
    return docTypeId === 7 || docTypeId === 22;
  }

  /** хелпер выставления значения контролу и редактируемости */
  disableControlAndSetValue(controlName: keyof (IRel), disable : boolean, value?, afterChangeValueCallback?: () => void) {
    HandleData.disableControl(this.relForm, controlName, disable);
    if(value !== undefined && this.relForm.controls[controlName].value !== value) {
      this.relForm.controls[controlName].setValue(value)
      if(afterChangeValueCallback) afterChangeValueCallback();
    }
  }

  /** запрос справочников */
  async getDictionaries() {
    this.relFormat$$ = this.dictService.getRelFormat();
    this.relProtocol$$ = this.dictService.getRelProtocol();
    this.docTypes$$ = this.dictService.getDocTypes().pipe(map(docTypes => docTypes.filter(docType => docType.documentTypesId !== 31)));
    this.specialEmail$$ = this.dictService.getSpecialEmail();
    this.coding$$ = this.dictService.getRelCoding();
    this.uniqueTypes$$ = this.dictService.getRelUniqueTypes();
    this.loadToCourierList$$ = this.dictService.getLoadToCourierList();
    this.courierStandList$$ = this.dictService.getCourierStandList();
    this.routeCourierSendList = await this.dictService.getRouteCourierSendList();
    this.courierLoadDoubleList = this.dictService.getCourierLoadDoubleList();
    this.bindingESFList = this.dictService.getBindingESFList();
  }



  setStateAfterIsTransitDocChange() {
    const isTransitDoc = this.controlValue('isTransitDoc');
    const props: (keyof IRel)[] = ['needReceiverPriceList', 'needOriginDoc', 'searchDocParent'];
    props.forEach(prop => this.disableControlAndSetValue(prop, isTransitDoc, isTransitDoc ? false : undefined));
    /*
    this.onChangeNeedReceiverPriceList();
    this.onChangeNeedOriginDoc();*/

    this.checkTransitDocAndEancomOut();
  }

  /** проверка транзитности и исх янком */
  checkTransitDocAndEancomOut() {
    const rel: Partial<IRel> = this.relForm.getRawValue();
    // 0 и 3 это протокол веб
    const disableTransitDoc = rel.senderProtocolId === 0 || rel.senderProtocolId === 3
      || rel.receiverProtocolId === 0 || rel.receiverProtocolId === 3
      || this.relForm.controls.needEancomOut.value;
    this.disableControlAndSetValue('isTransitDoc', disableTransitDoc, disableTransitDoc ? false : undefined);
    const disableNeedEancomOut = rel.receiverProtocolId === 0 || rel.receiverProtocolId === 3
      || this.relForm.controls.isTransitDoc.value;
    this.disableControlAndSetValue('needEancomOut', disableNeedEancomOut, disableNeedEancomOut ? false : undefined);
  }

  /** выставить редактируемость уведомления */
  handleSpecialEmailId() {
    if(this.docTypeId === 1 && this.relForm.controls.needMail.value) {
      this.specialEmailId.enable()
    } else {
      this.specialEmailId.disable();
      this.specialEmailId.setValue(null);
    }
  }

  /** удалить уведомление */
  async deleteSpecialEmailId() {
    // если это создание то удалять из бд пока нечего
    if(!this.isNewRel) await this.relsService.deleteSpecialEmailId(this.id);
    this.specialEmailId.reset()
  }

  /** wsкод отправителя  */
  get senderWsCode() {
    return 'senderWsCode' in this.rel ? this.rel.senderWsCode: null
  }

  /** ws код получателя */
  get receiverWsCode() {
    return 'receiverWsCode' in this.rel ? this.rel.receiverWsCode: null
  }

  /** проверка правильного заполнения формировки выходново янком */
  needBuildOutEancom():Promise<boolean> {
    const rel: IRel = this.relForm.getRawValue();
    const cond = !rel.isTransitDoc
      && !rel.needEancomOut
      && __.isValidPrimitive(rel.receiverProtocolId)
      && [0, 3].indexOf(rel.receiverProtocolId) === -1
    return cond
      ? this.dialogService.confirm('Формировать выходной EANCOM = Нет. Вы уверены?').toPromise()
      : Promise.resolve(true)
  }

  /** валидация и сохранение */
  async validateAndSaveRel() {
    const rel = this.relForm.getRawValue();
    // когда skipUserFtpValidation === true то needBuildOutEancom второй раз не проверяем
    if(await this.needBuildOutEancom()) {
      this.save(rel)
    }

  }

  /** сохранение */
  save(rel, skipUserFtpValidation?) {}
}

