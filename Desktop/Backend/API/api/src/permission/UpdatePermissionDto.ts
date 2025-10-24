import { CreatePermissionDto } from "./CreatePermissionDto";
import { PartialType } from '@nestjs/mapped-types';


export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {}