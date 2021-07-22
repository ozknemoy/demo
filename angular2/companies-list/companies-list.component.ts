import { Component } from '@angular/core';
import {HttpService} from "../../../main/service/http.service";
import {DictService} from "../../../main/service/dict.service";
import {ICompany} from "../../../models/outer/company.interface";
import {urls} from "../../../main/urls";
import {ViewList} from "../../../class/view-list";
import {ICompanyFilter} from "../../../models/outer/no-model/company-filter.interface";

/**
 * @Component view компонент списка компаний
 */
@Component({
  selector: 'edi-admin-companies-list',
  templateUrl: './companies-list.component.html',
  styleUrls: ['./companies-list.component.sass']
})
export class CompaniesListComponent extends ViewList<ICompany> {
  /** фильтр */
  filter = new ICompanyFilter();
  /** компании */
  comps: ICompany[];
  /** словарь баннеров */
  bannerList = this.dictService.getBannerList().slice(1);
  /** мапа словарей баннера */
  bannerListFlatten = this.dictService.bannerObj;
  /** роль url */
  userRole = `../${urls.comp.name}/:id/editor`;

  constructor(private httpService: HttpService, private dictService: DictService) {
    super();
  }

  /** запрос компаний */
  filterComps() {
    this.filterLoading = true;
    this.httpService.post<ICompany[]>('company/filter', this.filter).then(comps => {
      this.comps = comps;
    }).finally(() => {
      this.afterFilterApply()
    });
  }

  /** очистить фильтр */
  clearFilter() {
    this.filter = new ICompanyFilter();
  }

}
