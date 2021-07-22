import {FormBuilder, FormControl} from '@angular/forms';
import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ActivatedRoute, Router} from "@angular/router";
import {DictService} from "../../../main/service/dict.service";
import {RelsService} from "../../../main/service/rels.service";
import {RelsEditor} from "../rels-editor-common-ctrl";
import {IRelTemplateDetail} from "../../../models/outer/rel.interface";
import {AutoUnsubscribe} from "../../../main/_decorators/auto-unsubscribe.decorator";
import {MatDialogRef} from "@angular/material/dialog";
import {DialogService} from "../../../main/service/dialog.service";


/**
 * @Component компонент модалки шаблонов взаимосвязей
 */
@AutoUnsubscribe()
@Component({
  selector: 'rel-tmpl-detail-edit-modal',
  templateUrl: '../rels-editor-common.html'
})
export class RelTmplDetailEditModalComponent extends RelsEditor<IRelTemplateDetail> {
  /** шаблон а не взаимосвязь */
  isTmplRel = true;

  constructor(
    // специально обманываю что это не IRelTemplateDetail
    @Inject(MAT_DIALOG_DATA) public rel: IRelTemplateDetail,
    public dialogRef: MatDialogRef<RelTmplDetailEditModalComponent>,
    protected fb: FormBuilder,
    protected route: ActivatedRoute,
    protected router: Router,
    protected dictService: DictService,
    protected dialogService: DialogService,
    protected relsService: RelsService) {
    super(route, router, dictService, fb, dialogService, relsService)
  }

  async ngOnInit() {
    this.isNewRel = !this.rel.id;
    if(this.isNewRel) {
      const tmplId = this.rel.tmplId;
      const companyId = this.rel.companyId;
      this.rel  = <any>new IRelTemplateDetail();
      this.rel.tmplId = tmplId;
      this.rel.companyId = companyId;
    }
    this.getDictionaries();
    this.initForm();

  }

  /** после инициализации формы */
  afterInitForm() {
    // поля которых нет в IRel
    this.relForm.addControl('isSender', new FormControl(this.rel.isSender));
    this.relForm.addControl('tmplId', new FormControl(this.rel.tmplId));
    this.relForm.addControl('companyId', new FormControl(this.rel.companyId));
  }

  save(rel, skipUserFtpValidation = undefined) {
    this.relsService.saveRelTmpl(rel, skipUserFtpValidation)
      .then((_rel) => this.dialogRef.close(_rel.id))
      .catch((e) => {
        this.loading = false;
        // компания имеет юзера фтп
        this.dialogService.handleError422ByModalWindow(e, 'FTP-польз', () => this.save(rel, true))
      });
  }

  /** проверка чекбокса аперака */
  async checkAperakExistence() {
    const isAperak = this.relForm.get('docTypeId').value === 17;
    this.disableControlAndSetValue('needAperak', isAperak, isAperak ? false : undefined);
  }

  ngOnDestroy() {}

}
