import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiTags,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import {
  MerchantResponseSchema,
  MerchantListResponseSchema,
  MerchantInvitationSchema,
  MerchantInvitationListSchema,
  MerchantMemberListSchema,
  CreateMerchantSchema,
  InviteMerchantMemberSchema,
  type CreateMerchant,
  type InviteMerchantMember,
} from '@resolve-ai/contracts';
import { zodOpenApi } from '../../common/http/zod-openapi.js';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe.js';
import {
  AccountAccessGuard,
  type AccountRequest,
} from './auth/account-access.guard.js';
import {
  MerchantAccessGuard,
  MerchantAdminOnly,
  type MerchantRequest,
} from './auth/merchant-access.guard.js';
import { MerchantsService } from './merchants.service.js';
import { MerchantTeamsService } from './merchant-teams.service.js';

@ApiTags('teams')
@ApiBearerAuth('supabase')
@UseGuards(AccountAccessGuard)
@Controller()
export class AccountTeamsController {
  constructor(
    @Inject(MerchantsService) private readonly merchants: MerchantsService,
    @Inject(MerchantTeamsService) private readonly teams: MerchantTeamsService,
  ) {}
  @Get('merchants')
  @ApiResponse({ status: 200, schema: zodOpenApi(MerchantListResponseSchema) })
  list(@Req() request: AccountRequest) {
    return this.merchants.listMerchants(request.accountIdentity.userId);
  }
  @Post('merchants')
  @ApiBody({ schema: zodOpenApi(CreateMerchantSchema) })
  @ApiResponse({ status: 201, schema: zodOpenApi(MerchantResponseSchema) })
  create(
    @Req() request: AccountRequest,
    @Body(new ZodValidationPipe(CreateMerchantSchema)) input: CreateMerchant,
  ) {
    return this.teams.create(request.accountIdentity, input);
  }
  @Get('merchant-invitations')
  @ApiResponse({
    status: 200,
    schema: zodOpenApi(MerchantInvitationListSchema),
  })
  pending(@Req() request: AccountRequest) {
    return this.teams.pending(request.accountIdentity);
  }
  @Post('merchant-invitations/:id/accept')
  @HttpCode(200)
  @ApiResponse({ status: 200, schema: zodOpenApi(MerchantResponseSchema) })
  accept(
    @Req() request: AccountRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.teams.accept(request.accountIdentity, id);
  }
}

@ApiTags('teams')
@ApiBearerAuth('supabase')
@ApiHeader({
  name: 'X-Merchant-Id',
  description:
    'Selected team UUID; required when the account belongs to multiple teams',
})
@UseGuards(MerchantAccessGuard)
@MerchantAdminOnly()
@Controller('merchants')
export class MerchantTeamMembersController {
  constructor(
    @Inject(MerchantTeamsService) private readonly teams: MerchantTeamsService,
  ) {}
  @Get('members')
  @ApiResponse({ status: 200, schema: zodOpenApi(MerchantMemberListSchema) })
  members(@Req() request: MerchantRequest) {
    return this.teams.members(request.merchantActor);
  }
  @Get('invitations')
  @ApiResponse({
    status: 200,
    schema: zodOpenApi(MerchantInvitationListSchema),
  })
  invitations(@Req() request: MerchantRequest) {
    return this.teams.invitations(request.merchantActor);
  }
  @Post('invitations')
  @ApiBody({ schema: zodOpenApi(InviteMerchantMemberSchema) })
  @ApiResponse({ status: 201, schema: zodOpenApi(MerchantInvitationSchema) })
  invite(
    @Req() request: MerchantRequest,
    @Body(new ZodValidationPipe(InviteMerchantMemberSchema))
    input: InviteMerchantMember,
  ) {
    return this.teams.invite(request.merchantActor, input);
  }
  @Delete('invitations/:id')
  @HttpCode(204)
  revoke(
    @Req() request: MerchantRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.teams.revoke(request.merchantActor, id);
  }
}
