import {Injectable} from "@nestjs/common";
import {Assort} from "../../model/assort";
import {IAssort} from "../../model/assort.interface";
import {validate} from "class-validator";
import {__} from "../../util/__.util";
import {ErrHandler} from "../../util/error-handler.util";
import {__be} from "../../util/be.util";
import {AssortGoods} from "../../model/assort-goods";
import {AssortSetting} from "../../model/assort-setting";
import {IAssortFilter} from "../../model/no-model/assort-filter.interface";
import {CompanyService} from "../company/company.service";
import {AssortDocTypePropName} from "../../model/assort-doc-type-prop-name";
import {IAssortDocTypePropName} from "../../model/assort-doc-type-prop-name.interface";
import {IAssortSetting} from "../../model/assort-setting.interface";
import {DictService} from "../dict/dict.service";
import {CONFIG} from "../../config/main-config";
import {DictDictsVals} from "../../model/dict-dicts-vals";
import {IDictDictsVals} from "../../model/dict-dicts-vals.interface";
import {DOCUMENT_TYPES} from "../../model/document-types.dict";
import {EntityManager, In, IsNull, Not, Transaction, TransactionManager} from "typeorm";
import {IDocTypeCherryPickDict} from "../../model/document-types-cherry-pick.dict.interface";
import {RelCoding} from "../../model/rel.coding";
import {IRelCoding} from "../../model/rel-coding.dict.interface";
import {IUser} from "../../model/user.interface";
import {IDiffNetSetHistory} from "../../model/diff-nets-set-history.interface";
import {AssortSettingHistory} from "../../model/assort-setting-history";
import {FindManyOptions} from "typeorm/find-options/FindManyOptions";
import {entityHasChanged, logHistory} from "../../decorator/logger/log-history-storage-metadata";

@Injectable()
export class AssortService {

  constructor(private dictService: DictService) {
  }

  async filterAssorts({hasGoods, settingUsageType, sellerId, buyerId, key, asTmpl}: IAssortFilter) {

    const where = {
      sellerId: sellerId ?? undefined,
      buyerId: buyerId ?? undefined,
      key: key ?? undefined,
    };

    if(asTmpl) {
      where.sellerId = <any>IsNull()
    } else if(asTmpl === false) {
      where.sellerId = <any>Not(IsNull())
    }

    const a =  Assort.createQueryBuilder('assort')
      .select()
      .where(__.extractOnlyDefinedValues(where))
      .orderBy('assort.updated', 'DESC')

      .leftJoin('assort.buyer', 'buyer')
      .leftJoinAndSelect('buyer.glns', 'buyerGlns', 'buyerGlns.isBase = 1')
      .leftJoin('assort.seller', 'seller')
      .leftJoinAndSelect('seller.glns', 'sellerGlns', 'sellerGlns.isBase = 1')
      .addSelect(['seller',  'buyer'])

      .leftJoin('assort.settings', 'settings')
      .addSelect(['settings.docTypeId', 'settings.usageTypeId'])

      .addSelect(['goods.id'])
      .leftJoin('assort.goods', 'goods');

    if(typeof hasGoods === 'boolean') {
      a.andWhere(
        __be[hasGoods ? 'existsQuery' : 'notExistsQuery'](
          AssortGoods.createQueryBuilder('goods')
            .select('goods.id')
            .where('assort.id = goods.assortId')
        )
      )
    }
    if(__.isValidPrimitive(settingUsageType)) {
      if(settingUsageType !== 0) {
        if(settingUsageType === 12) {
          a
            .andWhere(this.assortSettingSubQuery(1))
            .andWhere(this.assortSettingSubQuery(2))
        } else {
          a.andWhere(this.assortSettingSubQuery(settingUsageType))
        }
      } else /*settingUsageType === 0*/{
        a.andWhere(
          __be.notExistsQuery(
            AssortSetting.createQueryBuilder('setting')
              .select('setting.docTypeId')
              .where('assort.id = setting.assortId')
          )
        )
      }
    }


    const assorts: Assort[] = await a.select().getMany();
    assorts.forEach(row => {
      CompanyService.extendCompanyByGln(row.buyer);
      CompanyService.extendCompanyByGln(row.seller);
      row.setFlags();
      row.settings = null;
      row.goods = null;
    })


    return assorts
  }

  assortSettingSubQuery(settingUsageType:number) {
    const subQuery = AssortSetting.createQueryBuilder('setting').select('setting.docTypeId');
    return __be.existsQuery(subQuery.where(`assort.id = setting.assortId and setting.usageTypeId = ${settingUsageType}`))
  }

  async saveOrCreateAssort(assort: IAssort, login: string, isNew: boolean) {
    const assortEntity = new Assort(assort);
    assortEntity.login = login;
    const errors = await validate(assortEntity);
    if(__.isFilledArray(errors)) return ErrHandler.throw(__be.handleValidationErrors(errors));
    return isNew ? Assort.insert(assortEntity): assortEntity.save();
  }

  @Transaction()
  deleteAssort(assortId, @TransactionManager() manager?: EntityManager) {
    return manager.delete(AssortGoods, {assortId}).then(() => manager.delete(Assort, assortId));
  }

  getAssortDocTypePropName() {
    return AssortDocTypePropName.find({relations: ['documentType', 'field'], order: {'documentTypeId': 'ASC'}})
  }

  getAssortSettingFieldsForDoc(documentTypeId): Promise<IDictDictsVals[]> {
    return AssortDocTypePropName.find({where: {documentTypeId}, relations: ['field']}).then(d => d.map(r => r.field))
  }

  async saveOrCreateAssortDocTypePropName(assort: IAssortDocTypePropName, isNew: boolean) {
    const entity = new AssortDocTypePropName(assort);
    const errors = await validate(entity);
    if(__.isFilledArray(errors)) return ErrHandler.throw(__be.handleValidationErrors(errors));
    return  isNew ? AssortDocTypePropName.insert(entity): entity.save()
  }

  deleteAssortDocTypePropName(id) {
    return AssortDocTypePropName.delete(id)
  }

  async getAssortSettings(assortId: number) {
    return this.getAssortSettingsOrItsHistory(AssortSetting, {where: {assortId}})
  }

  async getAssortSettingsOrItsHistory<T>(entity, {where, order}: FindManyOptions<T>) {
    const qb = entity.createQueryBuilder('a_setting')
      .where(where)
      .leftJoinAndSelect('a_setting.docType', 'docType')
      .leftJoinAndSelect('a_setting.fillType', 'DictDictsVals', `DictDictsVals.dictId in (${this.assortTypeDictIds.join()})`)

    if(order) {
      qb.orderBy(order)
    }

    const settings = await qb.getMany();

    const fields = await this.dictService.getDictDicts('ASSORT_FIELDS');
    const fieldMap: {[key: string]: IDictDictsVals} = {};
    fields.forEach(f => {
      fieldMap[f.code] = f;
    })

    settings.forEach(s => {
      if(!s.propNames) return;
      s.propNames.split(';').forEach(field => {
        if(s.props) s.props.push(fieldMap[field]);
        else s.props = [fieldMap[field]]
      })
    })
    return settings;
  }

  get assortTypeDictIds(): [number/*ASSORT_FILL_TYPE*/, number/*ASSORT_ADD_TYPE*/] {
    const {isDemo, isProd} = CONFIG;
    if(isProd) {
      return [373, 122]
    } else if(isDemo) {
      return [393, 122]
    } else {
      return [701, 176]
    }
  }

  async saveOrCreateAssortSetting(assortSetting: IAssortSetting, isNew: boolean, login: string) {
    const newEntity = new AssortSetting(assortSetting);
    const errors = await validate(newEntity);
    if(__.isFilledArray(errors)) return ErrHandler.throw(__be.handleValidationErrors(errors));

    if(isNew) {
      const inserted = await AssortSetting.insert(newEntity)
      assortSetting.id = __be.getOneInsertedPK(inserted);
      AssortSettingHistory.insert(new AssortSettingHistory(assortSetting, login, __be.createItemId));
      return assortSetting.id
    } else {
      const oldSetting = await this.getAssortSetting(assortSetting.id);
      if(entityHasChanged(newEntity, new AssortSetting(oldSetting))) AssortSettingHistory.insert(new AssortSettingHistory(newEntity, login, __be.updateItemId))

      return newEntity.save()
    }
  }

  async deleteAssortSetting(id: number, login: string) {
    const setting = await this.getAssortSetting(id);
    return Promise.all([
      AssortSetting.delete(id),
      AssortSettingHistory.insert(new AssortSettingHistory(setting, login, __be.deleteItemId)),
    ]).then(([del, insert]) => del);
  }

  getAssortSetting(id: number) {
    return AssortSetting._findById<AssortSetting>(id)
  }

  getAssortSettingHistory(assortSettingId: number) {
    return this.getAssortSettingsOrItsHistory<AssortSettingHistory>(AssortSettingHistory, {where: {assortSettingId}, order: <any>{'HIST_DATE': 'DESC'}});
  }

  /** вернет список документов для настроек ассорт */
  async getAssortSettingDocTypes(sellerId: number | null, buyerId: number, usageTypeId: number, isSender: boolean): Promise<IDocTypeCherryPickDict[]> {
    if(typeof isSender !== 'boolean') return [];
    let subQuery: string;

    if(usageTypeId === 1) {
      subQuery = `select 1 from DOC_TYPES_USE_ASSORT where DOCUMENT_TYPE_ID = set_company_sets.doc_type_id`
    } else if(usageTypeId === 2) {
      subQuery = `select 1 from EDI_GUI_SBR.SET_DOC_TYPE where DOC_TYPE_ID = set_company_sets.doc_type_id`
    } else {
      ErrHandler.throw('usageTypeId not defined')
    }
    const senderId = isSender ? sellerId : buyerId;
    const receiverId = isSender ? buyerId : sellerId;
    const senderCondition = __.isValidPrimitive(senderId) ? ` and sender_id ${__be.equalOrIsOperator(senderId)}` : '';
    const receiverCondition = __.isValidPrimitive(receiverId) ? ` and receiver_id ${__be.equalOrIsOperator(receiverId)}` : '';
    const query = `select distinct doc_type_id from set_company_sets where is_transit = 0 ${senderCondition} ${receiverCondition} and exists (${subQuery})`;
    const r = await AssortSetting.query(query);
    const docIds: number[] = r.map(row => row.DOC_TYPE_ID);
    const qb = DOCUMENT_TYPES.createQueryBuilder('docTypes')
      .select(['docTypes.documentAttr', 'docTypes.documentTypeName', 'docTypes.documentTypesId'])
      .where({documentTypesId: In(docIds)});

    if(usageTypeId === 1) {
      qb.innerJoin('docTypes.assortDocTypePropName', 'assortDocTypePropName')
    } else if(usageTypeId === 2) {
      qb.innerJoin('docTypes.docTypeProp', 'docTypeProp', 'docTypeProp.fillAssort = 1')
    }

    return qb.getMany()
  }
}
