
# DEMO
Код тупо скопирован из проектов. Без улучшайзеров. Со всеми багами комментариев, отступов и точек с запятыми

## angular2
побольше бизнес-логики в папке angular2/rel (связка RelTmplDetailEditModalComponent extends RelsEditor)
в папке angular2/misc собрал пайп, дерективы/компоненты, декоратор, роутинг

## angularJS
побольше бизнес-логики в папке angularJS/desadv
в папке angular2/misc собрал дерективы/компоненты, родительские классы


## nestJS
используется 11(!) oracle, который НЕ поддерживается typeorm. для этого допиливал _BaseEntity чтобы связка работала
есть много таблиц без ID и редактируемыми PK. поэтому костыльное сохранение
интересные запросы к БД в папке nestJS/assort.service.ts
побольше бизнес-логики в папке nestJS/company.service.ts (например метод createBatch)
