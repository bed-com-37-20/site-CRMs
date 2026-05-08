import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('auth')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/login')
  async login(@Body() body: { email: string; password: string } ) {

    return this.appService.authenticate({ email: body.email, password: body.password });
  }
  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; newPassword: string }) {
    return this.appService.resetPassword(body.email, body.newPassword);
  }

  @Get('get-current-user')
  async getCurrentUser(@Body() body: { token: string }) {
    return this.appService.getCurrentUser(body.token);
  }
}
