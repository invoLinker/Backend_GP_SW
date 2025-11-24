import { IsString, IsEnum, IsOptional, IsJSON } from 'class-validator';

export enum HistoryCategory {
  AUTH = 'auth',
  SYSTEM = 'system',
  USER = 'user',
  SECURITY = 'security',
  DATA = 'data',
  CONFIG = 'config',
}

export enum HistorySeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

export class CreateHistoryLogDto {
  @IsString()
  action: string;

  @IsString()
  description: string;

  @IsString()
  user: string;

  @IsString()
  userRole: string;

  @IsEnum(HistoryCategory)
  category: HistoryCategory;

  @IsEnum(HistorySeverity)
  severity: HistorySeverity;

  @IsOptional()
  @IsJSON()
  details?: any;
}