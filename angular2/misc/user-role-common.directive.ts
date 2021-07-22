import {Directive, Input, ElementRef} from '@angular/core';
import {TUserRolePermission, UserService} from "../service/user-session.service";
import {ActivatedRoute} from "@angular/router";
import {IRolePermission} from "../../__.util";

@Directive()
export class UserRoleDirectiveCommon {
  //* раздел. нужно например если это будующий урл, а не текущий. или вместе с userRoleStandalone*/
  @Input('userRole') section?: string;//
  //* разрешения на элемент */
  @Input() userRolePermission: TUserRolePermission | TUserRolePermission[] = 'view';
  //** использовать section а не урл, и будет искать по вхождению права  */
  @Input() userRoleStandalone;
  //* attr флаг что элемент доступен только суперадминам */
  @Input() userRoleSA;
  //* attr флаг что элемент доступен только админам и суперадминам */
  @Input() userRoleAdmin;

  constructor(protected userService: UserService, protected el: ElementRef, protected route: ActivatedRoute) {
  }


  ngOnInit() {
    const perms: IRolePermission = this.userService.permissions;
    const userRoleStandalone = this.hasOwnProperty('userRoleStandalone');
    const userRolePermission: TUserRolePermission[] = typeof this.userRolePermission === 'string' ? [this.userRolePermission] : this.userRolePermission;
    if(this.hasOwnProperty('userRoleSA')) {
      if(this.userService.role.type !== 1) return this.whenNoPermission();
    } else if(this.hasOwnProperty('userRoleAdmin')) {
      if([1, 2].indexOf(this.userService.role.type) === -1) return this.whenNoPermission();
    } else if (userRoleStandalone) {
      const permProps = Object.keys(perms);
      for (let i = 0; i < permProps.length; i++) {
        const perm = permProps[i];
        if (perm.indexOf(this.section) > -1) {
          /*
          не обрабатывается ситуация когда у нас на раздел например delete и он ища "dynamic-web" не найдет
           в первом попавшемся итератеру совпадении (dynamic-web/fields-dict) этого разрешения спрячет элемент
          {
            dynamic-web/fields-dict: ["view"],
            dynamic-web/locations-dict: ["view", "delete", "update", "create"]
          }
          */
          if (userRolePermission.every(_perm_ => perms[perm].indexOf(_perm_) === -1)) {
            // нет текущего разрешения на раздел но тут элемент не удаляю, удалю после цикла
            break
          } else {
            // есть текущее разрешение и поэтому заканчиваю работу
            return
          }
        }

      }
      return this.whenNoPermission();
    } else {
      // вытаскиваю раздел из урла
      if(this.userService.hasNoPermission(this.route, userRolePermission,this.section, this.el)) {
        return this.whenNoPermission();
      }
    }

    this.whenHasPermission();
  }

  /** действие если нет разрешений */
  whenNoPermission() {
    return this.el.nativeElement.remove();
  }

  /** действие если есть разрешения */
  whenHasPermission() {}

}
