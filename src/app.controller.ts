import { Body, Controller, Get,Request, Post,Patch,UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AppService } from './app.service';
import { AuthLoginDto } from './app/dto/auth-login.dto';
import { ResetPasswordDto } from './app/dto/reset-password.dto';
import { GetCurrentUserDto } from './app/dto/get-current-user.dto';
import {  AuthGuard} from "./app/guards/authGuard";

@ApiTags('Auth')
@Controller('auth')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/login')

  async login(@Body() body: AuthLoginDto) {
    return this.appService.authenticate({
      email: body.email,
      password: body.password,
    });
  }

  @Patch('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.appService.resetPassword(body.email, body.newPassword);
  }

  
  @Get('get-current-user')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Request() req) {
    console.log(req.user)
    return this.appService.getCurrentUser(req.user.sub);
  }
}
