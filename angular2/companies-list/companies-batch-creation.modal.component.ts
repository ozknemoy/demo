import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {MatDialogRef} from "@angular/material/dialog";
import {ICompanyBatchCreationReportInterface} from "../../../models/outer/no-model/company-batch-creation-report.interface";


/**
 * @Component компонент модалка массового создания компаний из эксель
 */
@Component({
  selector: 'companies-batch-creation-modal',
  templateUrl: './companies-batch-creation.modal.component.html'
})
export class CompaniesBatchCreationModalComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public report: ICompanyBatchCreationReportInterface,
    public dialogRef: MatDialogRef<ICompanyBatchCreationReportInterface>) {

  }

  ngOnInit() {

  }


}

