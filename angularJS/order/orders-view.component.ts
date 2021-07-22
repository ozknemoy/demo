import  {_} from "../../../helpers-and-libs/globals";
import {DateUtil} from "../../../services/date-util.service";
import {Dicsrv} from "../../../services/dictionary.service";
import {DifferentNetsSrv} from "../../../services/different-nets.service";
import {Docsrv} from "../../../services/doc.service";
import {HandleDataSrv} from "../../../services/handle-data.service";
import {ICompany} from "../../../models/company.model";
import {IOrdersDoc} from "../../../models/orders.model";
import {DocView} from "../../_classes/doc-view.class";
import {IStateService} from "angular-ui-router";
import {Component} from "angular-ts-decorators";
import {ISimpleValueDict} from "../../../models/dicts.model";


@Component({
  selector: 'orders-view',
  template: require('./orders-view.component.html'),
  controllerAs: 'ctrl',
})
export class OrdersViewComponent extends DocView<IOrdersDoc> {
  public selfDelivery: boolean;
  public schedule: string[][];
  public kdk:ISimpleValueDict[] = [
    {value: 1, name: 'Х5'},
    {value: 2, name: 'Поставщиком'}
  ];

  constructor(
    protected $state: IStateService,
    private DateUtil: DateUtil,
    private Dicsrv: Dicsrv,
    protected DifferentNetsSrv: DifferentNetsSrv,
    protected Docsrv: Docsrv,
    private HandleDataSrv: HandleDataSrv,
  ) {
    'ngInject';
    super(DifferentNetsSrv, Docsrv, $state);
  }

  afterDocInit() {
      const doc:IOrdersDoc = this.doc;
      const kdk = _.where(this.kdk, 'value', doc.header.equipmentPallet);
      doc.header.equipmentPallet = kdk? kdk.name : <any>null;
      if(_.isFilledArray(doc.header.schedule)) {
        this.schedule = doc.header.schedule.map((row) =>
          this.DateUtil.splitDate(row.arrivalDate)
            .concat(this.DateUtil.splitDate(row.departureStartDate))
            .concat(this.DateUtil.splitDate(row.departureEndDate))
        );
      }
      this.selfDelivery = doc.header.deliveryCode === '4';
      if (_.isFilledArray(doc.header.shippingPoint)) {
        doc.header.shippingPoint.forEach((row: ICompany)=> {
          row._fullAddress = this.HandleDataSrv.concatCompanyAddress(row)
        })
      }


      this.doc = doc;
  }

}

