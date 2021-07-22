
/**
 * @Component декоратор класса для автоотписки всех подписчиков, являющихся свойством класса
 * принимает массив строк свойств от которых не надо отписываться
 */
export function AutoUnsubscribe(blackList: any = []) {
  return function (constructor) {
    const original = constructor.prototype.ngOnDestroy;
    if(typeof original !== 'function') {
      console.log(constructor);
      alert('Для работы AutoUnsubscribe необходимо добавить метод ngOnDestroy')
    }

    constructor.prototype.ngOnDestroy = function () {
      for (let prop in this) {
        const property = this[prop];
        if (!blackList.includes(prop) && property && typeof property.unsubscribe === "function") {
          property.unsubscribe();
        }
      }
      if(original && typeof original === 'function') original.apply(this, arguments);
    };
  }

}
