import {registerDecorator, ValidationOptions, ValidationArguments} from "class-validator";
import {getRepository, Not} from "typeorm";
import {CONFIG} from "../config/main-config";
import {__} from "../util/__.util";


// whereProps расширяю условия поиска уникальной записи
interface IsUniqueProps {
  whereProps?: string[]
  wherePropsExept?: string[]
  primaryKey?: string | string[]
  skipIf?: (entity) => boolean
}

// нельзя применять на колонку primaryKey !!!
export function IsUnique(options?: ValidationOptions, props: IsUniqueProps = {}) {
  return function (object: Object, propertyName: string) {
    let primaryKeyArr: string[];
    if(props.primaryKey && Array.isArray(props.primaryKey)) {
      primaryKeyArr = props.primaryKey
    } else if(props.primaryKey && !Array.isArray(props.primaryKey)) {
      primaryKeyArr = [props.primaryKey]
    } else {
      primaryKeyArr = ['id'];
    }


    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: {
        async validate(currentValue: any, args: ValidationArguments): Promise<any> {
          // проверка не требуется
          if(props.skipIf && props.skipIf(args.object)) {
            return true
          }

          const cond = {[propertyName] : currentValue};
          // + это должна быть не своя текущая запись
          // подпихиваю -1 (его не может быть в качестве id) вместо null
          // есть __be.notIdWhere но будут круговые зависимости
          primaryKeyArr.forEach(primaryKey => cond[primaryKey] = Not((<any>args.object)[primaryKey] ?? -1))
          
          if(props.whereProps) {
            props.whereProps.forEach(key => cond[key] = args.object[key])
          }
          if(props.wherePropsExept) {
            props.wherePropsExept.forEach(key => cond[key] = Not(args.object[key]))
          }
          const rows = await getRepository(args.targetName, CONFIG.mainConnectionName).find(cond);
          if(CONFIG.isTest) console.log('----------IsUnique---------- length', rows.length);

          return !__.isFilledArray(rows)
        }
      }
    });
  };
}
