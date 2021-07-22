import {Component} from '@angular/core';
import {FileUploaderComponent} from "../../../main/_components/file-uploader.component";
import {HttpService} from "../../../main/service/http.service";
import {ToastrService} from "ngx-toastr";
import {first} from "rxjs/operators";
import {MatDialog} from "@angular/material/dialog";
import {CompaniesBatchCreationModalComponent} from "./companies-batch-creation.modal.component";

/**
 * @Component компонент кнопка массового создания компаний из эксель
 */
@Component({
  selector: 'companies-batch-creation',
  template: `
    <ngx-loading [show]="uploader?.isUploading"></ngx-loading>
    <label class="btn btn-sm btn-outline-warning ml-1 mt-2"
           [mdePopoverTriggerFor]="batchCreationPopover">
      <input type="file" style="display:none"
             ng2FileSelect
             [uploader]="uploader"
             #uploadEl
             accept="{{accept}}">Добавить списком
    </label>
    <mde-popover #batchCreationPopover="mdePopover" [mdePopoverOverlapTrigger]="false">
      <mat-card style="max-width: 400px">
        <mat-card-content>
          Требования к файлу:
          <ul>
            <li>не более 100 компаний</li>
            <li>формат xlsx</li>
            <li>данные должны быть на листе 1 и не содержать объединенных ячеек</li>
            <li>в строке 1 должен быть только заголовок</li>
            <li>для последующих строк должен быть строгий порядок столбцов: A - Наименование, B - GLN, C - ИНН, D - КПП</li>
          </ul>
          <a href="assets/files/example-comps-batch-creation.xlsx">Пример файла</a>
        </mat-card-content>
      </mat-card>
    </mde-popover>
  `
})
export class CompaniesBatchCreationComponent extends FileUploaderComponent {
  /** бекенд урл */
  url = 'company/batch';
  /** расширения файлов */
  accept= '.xlsx';

  constructor(protected httpService: HttpService,
              protected toast: ToastrService,
              private dialog: MatDialog) {
    super(httpService, toast);
  }

  /** после удачной загрузки */
  afterSuccessUpload(response: string) {
    this.dialog.open(CompaniesBatchCreationModalComponent,
      {
        minWidth: '1100px',
        maxWidth: '1100px',
        data: JSON.parse(response),
      }).afterClosed().pipe(first()).subscribe()
  }

}
