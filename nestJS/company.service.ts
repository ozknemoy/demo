import {HttpStatus, Injectable} from "@nestjs/common";
import {DictService} from "../dict/dict.service";
import {Company} from "../../model/company";
import {
  EntityManager,
  FindOneOptions,
  getManager,
  In,
  Like,
} from "typeorm";
import {__} from "../../util/__.util";
import {ErrHandler} from "../../util/error-handler.util";
import {Banner} from "../../model/banner";
import {validate} from "class-validator";
import {ICompany} from "../../model/company.interface";
import {IUser} from "../../model/user.interface";
import {GLNS} from "../../model/gln";
import {CompanyHistory} from "../../model/company-history";
import {__be} from "../../util/be.util";
import {DpService} from "../dp/dp.service";
import {CircleDependencies} from "../circle-dependencies";
import {CompanyErrorNotification} from "../../model/company-error-notification";
import {ICompanyErrorNotification} from "../../model/company-error-notification.interface";
import {CompanyEmail} from "../../model/company-email";
import {CompanyPayer} from "../../model/company-payer";
import {ICompanyPayer} from "../../model/company-payer.interface";
import {CompanyAdditionalSetting} from "../../model/company-additional-setting";
import {ICompanyAdditionalSetting} from "../../model/company-additional-setting.interface";
import {CompanyAddParamDict} from "../../model/company-additional-setting-dict";
import {ICompanySubsidiaryResponse} from "../../model/no-model/company-subsidiary-response.interface";
import {entityHasChanged, logHistory} from "../../decorator/logger/log-history-storage-metadata";
import {ICompanyHistoryFilter} from "../../model/no-model/company-history-filter.interface";
import {VetconMap} from "../../model/vetcon-map";
import {IVetconMap} from "../../model/vetcon-map.interface";
import {CompanySapCode} from "../../model/company-sap-code";
import {ICompanySapCode} from "../../model/company-sap-code.interface";
import {CompanyDocPath} from "../../model/company-doc-path";
import {ICompanyDocPath} from "../../model/company-doc-path.interface";
import {ICompanyFilter} from "../../model/no-model/company-filter.interface";
import {ICompsUserCommon} from '../../model/comps-user-common.interface';
import {UserSphere} from "../../model/user-sphere";
import {RelsService} from "../rels/rels.service";
import {IRelsFilter} from "../../model/no-model/rels-filter.interface";
import {CompsUserCommon} from "../../model/comps-user-common";
import {CompsUserAvailableGln} from "../../model/comps-user-available-gln";
import {ICompsUserAvailableGln} from "../../model/comps-user-available-gln.interface";
import {IFileUpload} from "../upload/file-upload.interface";
import {PrintService} from "../print/print.service";
import {ICompanyBatchCreationReportInterface} from "../../model/no-model/company-batch-creation-report.interface";
import {MimeEnum} from "../../util/mime.enum";
import {Rel} from "../../model/rel";
import {ICompanyCherryPick} from "../../model/company-cherry-pick.interface";
import {IUserDomain} from "../../model/user-domain.interface";
import {UserService} from "../user/user.service";
import {IUserSphere} from "../../model/user-sphere.interface";
import {User} from "../../model/user";
import {VetconMapHistory} from "../../model/vetcon-map-history";

interface WhereCompanyHistory {
  newValue?: FindOneOptions<ICompanyHistoryFilter>['where'];
  oldValue?: FindOneOptions<ICompanyHistoryFilter>['where'];
  entity?: FindOneOptions<ICompanyHistoryFilter>['where'];
  changedField?: FindOneOptions<ICompanyHistoryFilter>['where'];
  created?: FindOneOptions<ICompanyHistoryFilter>['where'];
  userId?: ICompanyHistoryFilter['userId'];
  companyId: ICompanyHistoryFilter['companyId'];
}

interface WhereCompanyFilter {
  id?: FindOneOptions<ICompanyFilter>['where'];
  inn?: FindOneOptions<ICompanyFilter>['where'];
  kpp?: FindOneOptions<ICompanyFilter>['where'];
  ogrn?: FindOneOptions<ICompanyFilter>['where'];
  director?: FindOneOptions<ICompanyFilter>['where'];
  hasTracker?: ICompanyFilter['hasTracker'];
  bannerId?: FindOneOptions<ICompanyFilter>['where'];
}

export class ICompanyWithFtpUserInfo {
  companyName: string = null;
  hasNoFtpUser: boolean = null;
}

@Injectable()
export class CompanyService {

  constructor(private dpService: DpService, private relsService: RelsService) {}

  findGlns(companyId: number) {
    return GLNS.find({where: {companyId}, order: {isBase: 'DESC'}})
  }

  findActiveCompanyBanner(companyId: number) {
    return Banner._findOne<Banner>({where: {companyId, active: true}})
  }

  async filterComp(filter: ICompanyFilter) {
    const where: WhereCompanyFilter = {};
    if(__.isFilledArray(filter.id)) {
      where.id = In(filter.id)
    }
    if(__.isValidPrimitive(filter.inn)) {
      where.inn = Like(`%${filter.inn}%`)
    }
    if(__.isValidPrimitive(filter.kpp)) {
      where.kpp = Like(`%${filter.kpp}%`)
    }
    if(__.isValidPrimitive(filter.ogrn)) {
      where.ogrn = Like(`%${filter.ogrn}%`)
    }
    if(__.isValidPrimitive(filter.director)) {
      where.director = Like(`%${filter.director}%`)
    }
    if(filter.hasTracker !== null) {
      where.hasTracker = filter.hasTracker
    }

    const qb = Company.createQueryBuilder()
      .select()
      .where(where)
      .leftJoinAndSelect('Company.glns', 'GLN', 'GLN.isBase = :isBase', {isBase: true});
    if(__.isFilledArray(filter.bannerId)) {
      qb.innerJoinAndSelect('Company.banner', 'BANNER', `BANNER.active = 1 AND BANNER.typeId IN(${filter.bannerId.filter(id => __.isNumber(id)).join(',')})`);
    } else {
      qb.leftJoinAndSelect('Company.banner', 'BANNER')
    }
    return DictService.extendCompsWithGln(await qb.getMany());
  }

  /** создание или сохранение компании */
  async saveOrCreateComp(comp: ICompany, oldComp: ICompany, isNew: boolean, user: IUser, batchInsert: boolean): Promise<ICompany | number> {
    const compEntity = new Company(comp);
    let errors = await validate(compEntity);
    let newGlnEntity: GLNS;
    // такая ситуация пока только возможна если у компании не был заведен gln
    const glnChanged = (comp.gln !== oldComp.gln) || (!comp.gln && !isNew);
    if (isNew || glnChanged) {
      newGlnEntity = new GLNS({
        gln: comp.gln,
        isBase: true,
        companyId: -1,// доброшу после создания компании
        kpp: comp.kpp,
        specLogin: null,
        address: null
      });
      const glnErrors = await validate(newGlnEntity);
      if (__.isFilledArray(glnErrors)) errors = errors.concat(glnErrors);

    }

    if (__.isFilledArray(errors))  ErrHandler.throw(__be.handleValidationErrors(errors));
    if (isNew || glnChanged) {
      await this.checkGlnAlreadyUsed(comp)
    }
    return getManager().transaction(async transactionalManager => {
      if (!isNew) {
        const savedComp = await  transactionalManager.save<Company>(compEntity);
        this.logEdit(compEntity, oldComp, user);
        if(glnChanged) {
          await this.createGln(transactionalManager, newGlnEntity, comp.id);
          await this.dpService.createIfNotExistDpFromGLNS(transactionalManager, newGlnEntity, user);
        }
        return savedComp.id
      } else {
        const savedComp = await transactionalManager.insert<Company>(Company, compEntity);
        const newCompId = __be.getOneInsertedPK(savedComp, () => ErrHandler.throw('Не вернулся ID компании. Не могу сохранить GLNS'));
        await this.createGln(transactionalManager, newGlnEntity, newCompId);
        await this.dpService.createIfNotExistDpFromGLNS(transactionalManager, newGlnEntity, user);
        this.logCreate(newCompId, user);
        return newCompId

      }
    }).then(id => batchInsert ? id : DictService.findCompanyWithBaseGln(id));
  }

  /** проверка глн уже существует */
  async checkGlnAlreadyUsed(comp: ICompany) {
    const oldGlnEntity:GLNS = await CircleDependencies.findGlnWithCompany(comp.gln);
    if(oldGlnEntity) {
      CircleDependencies.throwGlnAlreadyUsed(comp.gln, oldGlnEntity);
    }
  }

  /** создание глн */
  async createGln(transactionalManager: EntityManager, newGlnEntity: GLNS, companyId: number) {
    // при создании компании мы еще не знаем ее ид
    newGlnEntity.companyId = companyId;
    await transactionalManager.insert(GLNS, newGlnEntity);
  }

  logCreate(companyId: number, user: IUser) {
    CompanyHistory.insert(new CompanyHistory({
      userId: user.id,
      newValue: companyId,
      oldValue: null,
      entity: 'Добавление',
      changedField: 'Компания',
      companyId,
    }))
  }

  logEdit(newComp: ICompany, oldComp: ICompany, user: IUser) {
    logHistory(newComp, oldComp).forEach((log) => {
      CompanyHistory.insert(new CompanyHistory({
        userId: user.id,
        newValue: log.newValue,
        oldValue: log.oldValue,
        entity: 'Компания',
        changedField: log.name,
        companyId: newComp.id,
      }))
    })
  }

  getMails(companyId: number) {
    return CompanyEmail._findById(companyId)
  }

  async saveMail(mails: string, companyId: number) {
    if(__.isInvalidPrimitive(mails)) return CompanyEmail.delete(companyId)
    const mail = new CompanyEmail({companyId, email: mails});
    const errors = await validate(mail);
    return __.isFilledArray(errors) ? ErrHandler.throw(__be.handleValidationErrors(errors)) : CompanyEmail.save(mail)
  }

  getErrorNotification(companyId: number) {
    return CompanyErrorNotification.find({where: {companyId}})
  }

  async saveErrorNotification(notifications: ICompanyErrorNotification[], companyId: number) {
    return __be.createOrUpdateMany(CompanyErrorNotification, 'companyId', companyId, notifications)
  }

  getPayers(companyId: number) {
    return CompanyPayer.find({where: {companyId}})
  }

  getPayer(gln: string) {
    return CompanyPayer._findOneOrThrow({where: {gln}})
  }

  async savePayer(_payer: ICompanyPayer, oldPayer: ICompanyPayer) {
    const glnChanged = oldPayer.gln && oldPayer.gln !== _payer.gln;
    const isNew = !oldPayer.gln;
    const payer = new CompanyPayer(_payer);
    const errors = await validate(payer);
    if(glnChanged || isNew) {
      const payer = await CompanyPayer._findOne<CompanyPayer>({where: {gln: _payer.gln}, relations: ['company']})
      if(payer) {
        const m = `GLN ${_payer.gln} уже используется в качестве GLN плательщика компании ${payer.company.name}`
        errors.push(__be.createValidationError(m));
      }
    }
    if(__.isFilledArray(errors)) return ErrHandler.throw(__be.handleValidationErrors(errors));


    return getManager().transaction(async transactionalManager => {
      if(glnChanged) {
        await transactionalManager.delete(CompanyPayer, oldPayer.gln);
      }
      return transactionalManager.save(CompanyPayer, payer)
    })
  }

  getAdditionalSetting(companyId: number) {
    return CompanyAdditionalSetting.find<CompanyAdditionalSetting>({where: {companyId}, relations: ['addParam']})
  }

  async saveAdditionalSetting(addSetting: ICompanyAdditionalSetting, oldAddSetting: ICompanyAdditionalSetting, user: IUser) {
    const addSettingEntity = new CompanyAdditionalSetting(addSetting);
    const errors = await validate(addSettingEntity);
    const addParam = await CompanyAddParamDict._findOne<CompanyAddParamDict>({where: {name: addSetting.name}})
    const existedSingularAddInfo = await CompanyAdditionalSetting._findOne<CompanyAdditionalSetting>(
      {
        where: {
          companyId: addSetting.companyId,
          name: addSetting.name,
          id: __be.notIdWhere(addSetting.id)
        }
    })

    if(existedSingularAddInfo && addParam && !addParam.multi) {
      errors.push(__be.createValidationError(`Настройка ${addParam.name} может быть добавлена для компании только один раз`))
    }

    if(__.isFilledArray(errors)) return ErrHandler.throw(__be.handleValidationErrors(errors));

    const isNew = __.isInvalidPrimitive(addSettingEntity.id);
    // надо вернуть с addParam
    const setting = await addSettingEntity.save();
    CompanyService.logEditOrCreate(addSettingEntity, oldAddSetting, user, isNew);
    setting.addParam = addParam
    return setting;
  }

  static logEditOrCreate(addSetting: ICompanyAdditionalSetting, oldAddSetting: ICompanyAdditionalSetting, user: IUser, isNew) {
    if(!isNew) {
      logHistory(addSetting, oldAddSetting).forEach((log) => {
        CompanyHistory.insert(new CompanyHistory({
          userId: user.id,
          newValue: log.newValue,
          oldValue: log.oldValue,
          entity: 'Доп.настройка ' + addSetting.name,
          changedField: log.name,
          companyId: addSetting.companyId,
        }))
      })
    } else {
      CompanyHistory.insert(new CompanyHistory({
        userId: user.id,
        newValue: addSetting.value,
        oldValue: null,
        entity: 'Добавление',
        changedField: 'Доп.настройка ' + addSetting.name,
        companyId: addSetting.companyId,
      }))

    }

  }

  async deleteAdditionalSetting(id: number, user: IUser) {
    const setting = await CompanyAdditionalSetting._findById<CompanyAdditionalSetting>(id);
    await CompanyAdditionalSetting.delete({id})
    CompanyHistory.insert(new CompanyHistory({
      userId: user.id,
      newValue: null,
      oldValue: setting.value,
      entity: 'Удаление',
      changedField: 'Доп.настройка ' + setting.name,
      companyId: setting.companyId,
    }))
    return
  }

  getSubsidiaries(companyId: number): Promise<ICompanySubsidiaryResponse> {
    return Promise.all([
      Company.find<Company>({where: {parentCompanyId: companyId}}),
      Company._findById<Company>(companyId).then(com => com.parentCompanyId),
    ]).then(([subsidiaries, parentId]) =>
      ({
        isParent: !!subsidiaries.length,
        subsidiaries: subsidiaries.map(com => com.id),
        parentId
      })
    )
  }

  async saveSubsidiaries(companyId: number, sub: ICompanySubsidiaryResponse): Promise<boolean> {
    // чтобы не было проблемы одновременного редактирования
    const oldSub = await this.getSubsidiaries(companyId);
    const parentChanged = oldSub.parentId !== sub.parentId;
    const subsChanged = !__.arrayEqualsEvenShuffle(oldSub.subsidiaries, sub.subsidiaries);

    if(sub.subsidiaries && sub.subsidiaries.includes(sub.parentId)) ErrHandler.throw('Wrong parent/childs', HttpStatus.BAD_REQUEST)
    if(!parentChanged && !subsChanged) return false
    // процедуры в бд: admin_pkg.Delete_Main_Cmp admin_pkg.Set_Main_Cmp
    return getManager().transaction(async transactionalManager => {
      if(parentChanged) {
        await transactionalManager.update(Company, companyId, {parentCompanyId: sub.parentId});
      }
      if(subsChanged) {
        // не усложняю логику/ просто чищу все старые записи и потом обновляю
        await transactionalManager.update(Company, {parentCompanyId: companyId}, {parentCompanyId: null});
        if(__.isFilledArray(sub.subsidiaries)) {
          await transactionalManager.update(Company, sub.subsidiaries, {parentCompanyId: companyId});
        }
      }
      return true
    })
  }

  filterHistory(historyFilter: ICompanyHistoryFilter) {
    const where: WhereCompanyHistory = {companyId: historyFilter.companyId};

    if(__.isValidPrimitive(historyFilter.userId)) {
      where.userId = historyFilter.userId
    }
    if(__.isValidPrimitive(historyFilter.newValue)) {
      where.newValue = Like(`%${historyFilter.newValue}%`)
    }
    if(__.isValidPrimitive(historyFilter.oldValue)) {
      where.oldValue = Like(`%${historyFilter.oldValue}%`)
    }
    if(__.isValidPrimitive(historyFilter.entity)) {
      where.entity = Like(`%${historyFilter.entity}%`)
    }
    if(__.isValidPrimitive(historyFilter.changedField)) {
      where.changedField = Like(`%${historyFilter.changedField}%`)
    }

    __be.setFilteredDates(historyFilter, where);

    return Promise.all([
      CompanyHistory.find({where, relations: ['user', 'userSphere'], order: {created: 'DESC'}}),
      UserService.mapDomainUsers()
    ]).then(([history, mapDomainUsers]) => {
      // по сути тут реализация leftJoin из двух объединенных таблиц
      // не использовать UserView тк нет фио
      history.forEach(hist => {
        if(!hist.user) {
          hist.user = hist.userSphere;
          hist.userSphere = null;
        }
      })
      history.forEach(h => CompanyService.extendHistoryUser(h.user, mapDomainUsers))
      return history
    })
  }

  static extendHistoryUser(user: User | UserSphere, mapDomainUsers: {[k: string]: string}) {
    if(!user) return;
    if(user instanceof User) {
      UserService.extendUserWithLdapInfo(user, mapDomainUsers);
    } else {
      user.isKorus = user.companyId === 0;
    }

  }

  getCompanyVetconMap(gln: string) {
    return VetconMap.find({where: {gln}, order: {gln: 'ASC'}})
  }

  async saveVetconMap(vetconMap: IVetconMap, oldVetconMap: IVetconMap, user: IUser) {
    const vetconMapEntity = new VetconMap(vetconMap);
    let errors = await validate(vetconMapEntity);
    const isNew = __.isInvalidPrimitive(oldVetconMap.name);
    const isOldAndChangedValueFrom = !isNew && (vetconMap.name !== oldVetconMap.name || vetconMap.valueFrom !== oldVetconMap.valueFrom);
    if(isNew || isOldAndChangedValueFrom) {
      const exist: boolean = await VetconMap._exist({where: {name: vetconMap.name, gln: vetconMap.gln, valueFrom: vetconMap.valueFrom}})
      if(exist) errors.push(__be.createValidationError(__.constructErrorNotUniqueMessage('Код')))
    }
    if(__.isFilledArray(errors)) return ErrHandler.throw(__be.handleValidationErrors(errors));

    return getManager().transaction(async (transactionalManager) => {
      if(isOldAndChangedValueFrom) {
        await transactionalManager.delete(VetconMap, {gln: oldVetconMap.gln, valueFrom: oldVetconMap.valueFrom, name: oldVetconMap.name});
      }
      const log = (type: number) => VetconMapHistory.insert(new VetconMapHistory(vetconMap, user.login, type));
      if(isNew) {
        log(__be.createItemId);
      } else if(entityHasChanged(vetconMapEntity, new VetconMap(oldVetconMap))) {
        log(__be.updateItemId);
      }
      return transactionalManager.save(vetconMapEntity);
    })
  }

  async deleteVetconMap(gln: string, name: string, valueFrom: string, login: string) {
    const setting = await VetconMap._findOne<VetconMap>({where: {gln, name, valueFrom}});
    return VetconMap.delete({gln, name, valueFrom})
      .then(() => VetconMapHistory.insert(new VetconMapHistory(setting, login, __be.deleteItemId)))
  }

  getVetconMapHistory(gln: string, name: string) {
    return VetconMapHistory.find({where: {gln, name}, order: {date: 'DESC'}})
  }

  getSapCodes(companyId: number): Promise<CompanySapCode[]> {
    return CompanySapCode.find({where: {companyId}, relations: ['counterpart']});
  }

  getSapCode(companyId: number, counterpartId: number): Promise<CompanySapCode>  {
    return CompanySapCode._findOne<CompanySapCode>({where: {companyId, counterpartId}, relations: ['counterpart']});
  }

  async saveSapCode(sapCode: ICompanySapCode, oldSapCode: ICompanySapCode, user: IUser) {
    const sapCodeEntity = new CompanySapCode(sapCode);
    let errors = await validate(sapCodeEntity);
    const isNew = __.isInvalidPrimitive(oldSapCode.counterpartId);
    const isOldAndChangedPKeyValue = !isNew && sapCode.counterpartId !== oldSapCode.counterpartId;
    if(isNew || isOldAndChangedPKeyValue) {
      const exist: boolean = await CompanySapCode._exist({where: {counterpartId: sapCode.counterpartId, companyId: sapCode.companyId}})
      if(exist) errors.push(__be.createValidationError(__.constructErrorNotUniqueMessage('Корреспондент')))
    }
    if(__.isFilledArray(errors)) return ErrHandler.throw(__be.handleValidationErrors(errors));

    return getManager().transaction(async (transactionalManager) => {
      if(isOldAndChangedPKeyValue) await transactionalManager.delete(CompanySapCode, {counterpartId: oldSapCode.counterpartId, companyId: oldSapCode.companyId});
      return transactionalManager.save(sapCodeEntity);
    }).then(newSapCode => this.getSapCode(newSapCode.companyId, newSapCode.counterpartId))
  }

  async deleteSapCode(companyId: number, counterpartId: number) {
    return CompanySapCode.delete({companyId, counterpartId})
  }

  getDocPaths(companyId: number): Promise<CompanyDocPath[]> {
    return CompanyDocPath.find({where: {companyId}, relations: ['docType']});
  }

  async saveDocPath(docPath: ICompanyDocPath, oldDocPath: ICompanyDocPath, user: IUser) {
    const docPathEntity = new CompanyDocPath(docPath);
    let errors = await validate(docPathEntity);
    const isNew = __.isInvalidPrimitive(oldDocPath.docTypeId);
    const oldPK = this.getDocPathPK(oldDocPath);
    const newPK = this.getDocPathPK(docPath);
    const isOldAndChangedPKeyValue = !isNew && !__.objectEquals(oldPK, newPK);
    if(isNew || isOldAndChangedPKeyValue) {
      const exist: boolean = await CompanyDocPath._exist({where: newPK})
      if(exist) errors.push(__be.createValidationError(__.constructErrorNotUniqueMessage('Тип документа, Режим, Направление', true)))
    }
    if(__.isFilledArray(errors)) return ErrHandler.throw(__be.handleValidationErrors(errors));

    return getManager().transaction(async (transactionalManager) => {
      if(isNew) {
        await transactionalManager.insert(CompanyDocPath, docPath);
        return docPathEntity
      }

      return transactionalManager.update(CompanyDocPath, oldPK, docPath);

    }).then((newDocPath: CompanyDocPath) => CompanyDocPath._findOne<CompanyDocPath>({where: newPK, relations: ['docType']}))
  }

  async deleteDocPath(companyId: number, docTypeId: number, regime: number, direction: number) {
    return CompanyDocPath.delete({companyId, docTypeId, regime, direction})
  }

  getDocPathPK(docPath: ICompanyDocPath): Partial<ICompanyDocPath> {
    return {
      docTypeId: docPath.docTypeId,
      companyId: docPath.companyId,
      regime: docPath.regime,
      direction: docPath.direction,
    }
  }

  getCompUserEntity(entity: typeof CompsUserCommon, userId: number, companyId: number): Promise<CompsUserCommon> {
    return entity._findOne<CompsUserCommon>({where: {userId, companyId}, relations: ['company']});
  }

  async findCompaniesHaveRelsWithUsersCompany(userId: number) {
    const user = await UserSphere._findOne<UserSphere>({where: {id: userId}});
    const relFilter = new IRelsFilter();
    relFilter.senderId = [user.companyId];
    relFilter.receiverId = [user.companyId];
    relFilter.compsSearchType = 1;
    const rels = await this.relsService._getFilteredRels(relFilter, [], Infinity);
    const compsIds: number[] = __.flatten<number>(rels.map(rel => [rel.senderId, rel.receiverId]));
    const uniqueCompsIds: number[] = Array.from(new Set(compsIds));
    const uniqueCompsIdsExceptYourself = uniqueCompsIds.filter(id => id != user.companyId);
    if(!__.isFilledArray(uniqueCompsIdsExceptYourself)) return [];
    return  <ICompany[]>(await Promise.all(
      __.splitArrayOnChunks(uniqueCompsIdsExceptYourself, 1000).map(DictService.getCompaniesWithBaseGlnByIds)
    ).then(__.flatten));
  }

  getAllCompsUserEntity(entity: typeof CompsUserCommon, userId: number): Promise<CompsUserCommon[]> {
    return entity.find({where: {userId}, relations: ['company']});
  }

  async saveCompUserEntity(entity: typeof CompsUserCommon, newOne: ICompsUserCommon, oldOne: ICompsUserCommon) {
    const currentEntity = new entity(newOne);
    let errors = await validate(currentEntity);
    const isNew = __.isInvalidPrimitive(oldOne.companyId);
    const isOldAndChangedPKeyValue = !isNew && newOne.companyId !== oldOne.companyId;
    if(isNew || isOldAndChangedPKeyValue) {
      const exist = await this.getCompUserEntity(entity, newOne.userId, newOne.companyId);
      if(!!exist) errors.push(__be.createValidationError(__.constructErrorNotUniqueMessage('Компания')))
    }
    if(__.isFilledArray(errors)) return ErrHandler.throw(__be.handleValidationErrors(errors));

    return getManager().transaction(async (transactionalManager) => {
      if(isOldAndChangedPKeyValue) {
        await transactionalManager.delete(entity, {userId: oldOne.userId, companyId: oldOne.companyId});
        currentEntity.created = __be.nowDateTimeOracle;
      }

      return transactionalManager.save(currentEntity);
    })
  }

  deleteCompUserEntity(entity: typeof CompsUserCommon, companyId: number, userId: number) {
    return entity.delete({companyId, userId})
  }

  getCompsUserAvailableGln(userId: number) {
    return CompsUserAvailableGln.find({where: {userId}})
  }

  async createCompsUserAvailableGln(compsUserAddGln: ICompsUserAvailableGln, currentLogin: IUser) {
    const compsUserAddGlnEntity = new CompsUserAvailableGln(compsUserAddGln);
    compsUserAddGlnEntity.creatorId = currentLogin.id;
    const {companyId} = await UserSphere._findOneOrThrow<UserSphere>({where: {id: compsUserAddGln.userId}});
    compsUserAddGlnEntity.companyId = companyId;
    const errors = await validate(compsUserAddGlnEntity);
    return __.isFilledArray(errors) ? ErrHandler.throw(__be.handleValidationErrors(errors)) : CompsUserAvailableGln.insert(compsUserAddGlnEntity)
  }

  deleteCompsUserAvailableGln(userId: number, gln: string) {
    return CompsUserAvailableGln.delete({gln, userId})
  }

  async createBatch(file: IFileUpload, user: IUser): Promise<ICompanyBatchCreationReportInterface> {
    if(file.mimetype !== MimeEnum.xlsx) {
      ErrHandler.throwInvalidFile();
    }
    let xls = await PrintService.parseXlsxBufferOnlyFirstPage(file.buffer);

    xls = xls.slice(1);
    if(!__.isFilledArray(xls)) {
      ErrHandler.throwInvalidFile();
    }
    if(xls.length > 100) {
      ErrHandler.throw('Файл содержит более 100 компаний');
    }

    let comps: ICompany[] = xls.map(CompanyService.creatCompanyFromExcel);

    let ok = [];
    let fail: ICompanyBatchCreationReportInterface['fail'] = [];
    // отбрасываю дубли глн. оставляю первый, остальные удаляю и пишу в ошибку
    let uniqueGlns: string[] = [];
    comps = comps.filter(comp => {
      if(uniqueGlns.includes(comp.gln)) {
        let reason = `GLN ${comp.gln} уже используется в качестве основного GLN`;
        const unUniqueCompName = __.where(comps, 'gln', comp.gln, true).name;
        if(unUniqueCompName) {
          reason += ` компании ${unUniqueCompName}`
        }
        fail.push({reason, gln: comp.gln});
        return false;
      } else {
        uniqueGlns.push(comp.gln);
        return true;
      }
    })

    for (var i = 0; i < comps.length; i++) {
      const comp = comps[i];
      await this.saveOrCreateComp(comp, new ICompany(), true, user, true)
        .then(
          newCompId => ok.push(comp),
          e => {
            // надо выкинуть повторяющиеся тексты валидации (у компании и у глн есть одинаковые) + в разных типах ошибок текст в разных свойствах
            const _reason = __.dedupe(e.response ?? e.message ?? e);
            const reason = Array.isArray(_reason) ? _reason.join('. ') : _reason;
            // for dev if(reason === 'create success') return ok.push(comp);
            fail.push({reason, gln: comp.gln ?? null});
          }
        )
    }

    return {ok, fail}
  }

  static creatCompanyFromExcel([name, gln, inn, kpp]: [string, string | number, string | number, string | number]): ICompany {
    const company = new ICompany();
    company.name = CompanyService.extractStringFromCell(name);
    company.description = company.name;
    company.gln = CompanyService.extractStringFromCell(gln);
    company.inn = CompanyService.extractStringFromCell(inn);
    company.kpp = CompanyService.extractStringFromCell(kpp);
    return company;
  }

  static extractStringFromCell(value: string | number): string {
    if(typeof value === 'number') {
      return value.toString();
    } else if(typeof value === 'string') {
      return value.trim();
    }
    // валидации некорректно работают с undefined
    return value ?? null;
  }

  /** запрос компании c фтп юзером */
  static companyWithFtpUser(companyId: number): Promise<ICompanyWithFtpUserInfo> {
    return Company.createQueryBuilder('company')
      .where({id: companyId})
      .select(['user.id', /*'user.name',*/ 'company.id', 'company.name'])
      .leftJoin('company.users', 'user', 'user.isFtp = 1')
      .getOne().then(company => ({companyName: company.name, hasNoFtpUser: !__.isFilledArray(company.users)}))
  }

  static companyHasRelFtpValidation(companyId: number) {
    return Rel.count({where: [
        {senderId: companyId, senderProtocolId: In(RelsService.protocolIdsFtp)},
        {receiverId: companyId, receiverProtocolId: In(RelsService.protocolIdsFtp)}
      ]}).then(qty => qty > 0 ? ErrHandler.throw(`У компании есть взаимосвязи с протоколом FTP. Вы уверены?`, HttpStatus.UNPROCESSABLE_ENTITY) : false)
  }

  /** добрасываю глн из glns */
  static extendCompanyByGln(comp: ICompany | ICompanyCherryPick) {
    if(comp && __.isFilledArray(comp.glns)) {
      comp.gln = comp.glns[0].gln;
      delete comp.glns
    }
  }

}
