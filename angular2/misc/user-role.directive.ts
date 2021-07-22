import {Directive, ElementRef} from '@angular/core';
import {UserService} from "../service/user-session.service";
import {ActivatedRoute} from "@angular/router";
import {UserRoleDirectiveCommon} from "./user-role-common.directive";

/**
 * @Component Основной компонент ролевой системы. Скрывает элементы если нет прав
 * edi-admin/dps-editor должен быть create чтобы создавать точки, а не edi-admin/dps. потому что при заходе на
 * урл edi-admin/dps-editor будет проверяться именно одноименное разрешение. если форма открывается внутри текущей
 * страницы (например, модалка), то разршение update/create нужно по текущему урлу, если же
 * ссылка/кнопка ведет на другую страницу, то разрешение нужно на будующий урл
 *
 * @example
 * настройка разрешает действие на текущей странице (открытие модалки или удаление записи)
 * ```
 * <button class="btn btn-sm btn-primary"
 *   (onSave)="createAddSetting($event)"
 *   companyAddSettingButton [addSetting]="newAddSetting"
 *   userRole
 *   userRolePermission="create">Добавить настройку</button>
 * ```
 *
 * настройка разрешает (будущее) действие. в прмере для sibling страницы (sibling по урлу)
 * ```
 * <button class="btn btn-sm btn-primary"
 *   [routerLink]="['../', urls.compsGlnEditor.name]"
 *   userRole="../{{urls.compsGlnEditor.name}}"
 *   userRolePermission="create">Добавить GLN</button>
 * ```
 *
 * настройка отображения ссылки совсем другого раздела
 * ```
 * <a class="btn btn-sm btn-outline-primary"
 *   [userRole]="urls.dp.name"
 *   userRoleStandalone
 *   [routerLink]="['../../', urls.dp.name]"
 *   [queryParams]="{companyId: companyId}">{{urls.dp.title}}</a>
 * ```
 *
 */
@Directive({
  selector: '[userRole]',
})
export class UserRoleDirective extends UserRoleDirectiveCommon {

  constructor(protected userService: UserService, protected el: ElementRef, protected route: ActivatedRoute) {
    super(userService, el, route)
  }
}

