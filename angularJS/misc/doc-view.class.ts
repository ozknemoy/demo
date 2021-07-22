
import {Docsrv} from "../../services/doc.service";
import {DifferentNetsExtras} from "../../services/different-nets-extras.notservice";
import {DifferentNetsSrv, IBackFieldsHandled} from "../../services/different-nets.service";
import {IStateService} from "angular-ui-router";
import  {_} from "../../helpers-and-libs/globals";
import {Input} from "angular-ts-decorators";

/**
 * базовый класс для контроллеров просмотра документов
 */
export class DocView<D> extends DifferentNetsExtras{
  /** ид документа */
  protected docId = this.$state.params.id;
  /** документ */
  protected doc: D;
  /** входящий док или нет */
  @Input() protected isInDoc: boolean;
  /** тип документа на английском (pricat, desadv)*/
  @Input('@') protected docName: string;
  /** мапа полей хедера из DW */
  public fDict: IBackFieldsHandled;
  /** мапа табличных полей из DW. иногда нужна дополнительно*/
  public fDictTable: IBackFieldsHandled;
  /** херпер */
  public _ = _;

  constructor(protected DifferentNetsSrv: DifferentNetsSrv,
              protected Docsrv: Docsrv,
              protected $state: IStateService,) {
    super()
  }

  $onInit() {
    this.beforeDocInit();
    this.getDoc().then((doc: D) => this.afterRetrieve(doc));
  }

  /** манипуляции сразу ПОСЛЕ получения документа с бекенда */
  afterRetrieve(doc: D): void {
    this.doc = doc;
    this.afterDocInit();
    this.getDWSettings(doc)
  }


  /** получение документа */
  getDoc(): Promise<D> {
    return this.Docsrv.getDoc(this.docId, true, this.isInDoc ? 'in' : 'out', true)
  }

  /** получение полей админки DW */
  getDWSettings(doc: D): void {
    if(!this.docName) throw new Error('!!!!!!!!!!!!! no docName !!!!!!!!!!!!!')
    this.DifferentNetsSrv.handleFrontFields(this.docName, doc, 'header', 'hdrView').then(({fDict})=> {
      this.fDict = fDict;
      this.afterFieldsInit();
    });
  }

  /** манипуляции ДО  */
  protected beforeDocInit() {}

  /** манипуляции сразу ПОСЛЕ того как документ стал инстансм контроллера */
  protected afterDocInit() {}

  /** манипуляции сразу ПОСЛЕ получения полей DW */
  protected afterFieldsInit() {}

  /** манипуляции сразу ПОСЛЕ получения полей таблицы из админки DW */
  protected afterTableFieldsInit() {}

  /** получение полей таблицы из админки DW */
  protected initTableFields() {
    this.DifferentNetsSrv.handleFrontFields(this.docName, this.doc, 'table', 'tblView').then(({fDict}) => {
      this.fDictTable = fDict;
      this.afterTableFieldsInit();
    });
  }
}
