import {mixin, ForbiddenException} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {User} from "../model/user";
import {logger} from "../util/logger.util";
import {__} from "../util/__.util";
import {ExecutionContextHost} from "@nestjs/core/helpers/execution-context-host";

export interface AuthByRightGuardOptions {
  userType?: number,
  parent?: boolean,
  permissions?: ('delete' | 'create' | 'update' | 'view')[]
  section?: string
}

export function AuthByRightGuard(params: AuthByRightGuardOptions, type?: string | string[]) {
  return mixin(class ScopesAuth extends AuthGuard(type) {

    handleRequest(err, user: User, info, context: ExecutionContextHost): any {
      if (err || !user) {
        console.log(err , !user);
        throw err || new ForbiddenException('handleRequest_err');
      }

      if(params.userType) {
        if(user.admin && user.admin <= params.userType) {
          return user
        } else {
          this.logAndThrow(user, 'Необходим тип юзера минимум' + params.userType)
        }
      }

      const userPermissions = __.getUserPermissions(user.role);
      const sectionPermissions = params.permissions ? params.permissions : ['view'];

      if(params.parent){
        const permProps = Object.keys(userPermissions);
        for (let i = 0; i < permProps.length; i++) {
          const perm = permProps[i];
          if (perm.indexOf(params.section) > -1) {
            if (sectionPermissions.every(_perm_ => userPermissions[perm].indexOf(_perm_) === -1)) {
              // нет текущего разрешения на раздел/ кидаю ошибку доступа ниже по коду
              break
            } else {
              // есть текущее разрешение
              return user
            }
          }
        }
        this.logAndThrow(user, `У вас нет прав на ${params.parent}`)
      }

      if(params.section) {
        const _userPermission = userPermissions[params.section];
        if(!_userPermission || !sectionPermissions.some(perm => _userPermission.indexOf(perm) > -1)) {
          const message = `У вас нет прав на ${sectionPermissions.join(' ИЛИ ')} в разделе ${params.section}`;
          this.logAndThrow(user, message)
        }
      }

      return user;
    }

    logAndThrow(user: User, message: string) {
      logger.warn(`AuthByRightGuard ${user.login}  (${user.role.name}): ${message}`);
      throw new ForbiddenException(message);
    }
  });

}
