import {Column, Entity, JoinColumn, ManyToOne} from 'typeorm';
import {_BaseEntity} from './_base-entity';
import {__be} from '../util/be.util';
import {IAperakSetting} from './aperak-setting.interface';
import {DOCUMENT_TYPES} from "./document-types.dict";
import {ICompany} from "./company.interface";
import {Company} from "./company";
import {TimestampToOracleTimestampTransformer} from "../transformer/timestamp-date-time-oracle.transformer";
import {User} from "./user";
import {IsNotEmpty, IsOptional, MaxLength} from "class-validator";
import {__} from "../util/__.util";
import {IsUnique} from "../validator/is-unique";

@Entity({name: 'SET_APERAK', synchronize: false})
export class AperakSettingEntity extends _BaseEntity implements IAperakSetting {

  constructor(newEntity: IAperakSetting) {
    super();
    this.setModel(newEntity);
  }

  getSeqNameAddress() {
    return 'SET_APERAK_SEQ';
  }


  @Column('number', {primary: true, name: 'ID', default: () => '0'})
  id: number = null;

  @IsNotEmpty({message: __.constructRequireErrorMessage('Системный статус')})
  @Column('number', {name: 'ADD_STATUS', nullable: true})
  status: number | null = null;

  @IsNotEmpty({message: __.constructRequireErrorMessage('Тип документа')})
  @Column('number', {name: 'REF_DOC_TYPE', nullable: true})
  docTypeId: number | null = null;

  @ManyToOne(() => DOCUMENT_TYPES)
  @JoinColumn({name: 'REF_DOC_TYPE'})
  docType: DOCUMENT_TYPES | null;



  @IsUnique({message: 'Настройка по данному типу документа и компании с таким кодом сообщения уже существует'}, {whereProps: ['docTypeId', 'companyId']})
  @IsNotEmpty({message: __.constructRequireErrorMessage('Код сообщения из APERAK')})
  @Column('varchar2', {name: 'MSG_CODE', nullable: true, length: 1020})
  messageCode: string | null = null;

  @IsNotEmpty({message: __.constructRequireErrorMessage('Отправитель APERAK')})
  @Column('number', {name: 'COMPANY_ID'})
  companyId: number = null;

  @ManyToOne(() => Company)
  @JoinColumn({name: 'COMPANY_ID'})
  company: ICompany | null;

  @IsOptional()
  @MaxLength(500, {message: __.constructErrorMaxLengthMessage('Комментарий', 500)})
  @Column('varchar2', {name: 'CMT', nullable: true, length: 2000})
  comment: string | null = null;

  @IsNotEmpty()
  @Column('number', {name: 'USER_ID', default: () => '0'})
  userId: number = 0;

  @ManyToOne(() => User)
  @JoinColumn({name: 'USER_ID'})
  user: User;

  @Column('timestamp', {name: 'UPDATED', default: () => 'sysdate', transformer: new TimestampToOracleTimestampTransformer()})
  updated: number = __be.nowDateTimeOracle;

  @Column('timestamp', {name: 'CREATED', default: () => 'sysdate', transformer: new TimestampToOracleTimestampTransformer()})
  created: number = null;

}
