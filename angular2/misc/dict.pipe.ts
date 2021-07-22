import { Pipe, PipeTransform } from '@angular/core';
import {__} from "../../__.util";

/**
 * @Component pipe вытаскиваю из словаря значение по идентификатору
 */
@Pipe({name: 'dict'})
export class DictPipe implements PipeTransform {

    public transform<T, K extends keyof T>(value: T[K], dict: T[], valueProp: K, neededProp: K, defaultValue?: string | number): T[K] {
      if(__.isInvalidPrimitive(value) || !dict ||__.isEmptyArray(dict)) return <any>defaultValue || value;
      return (__.where(dict, valueProp, value, true))[neededProp]
    }
}
