import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AppService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'u+T6qtPbiWPgZT/X0CiDREI1zwcZek94HLEF/mcQaoxsPhfoWvvhd/CjD9xubAYXU6aOYJIchBnXi8iSMCUlQQ==';

  constructor(private readonly databaseService: DatabaseService) {}

  async authenticate(data: { email: string; password: string }): Promise<{ user: any; token: string } | null> {
    const user = await this.databaseService.user.findUnique({ where: { email: data.email } });
    if (user && user.password === data.password) {
      const payload = { sub: user.id, email: user.email };
      const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '2d' });
      return { user, token };
    }
    return null;
  }

  // async register(data: { email: string; password: string; name?: string }): Promise<any> {
  //   return await this.databaseService.user.create({ data });
  // }

  async getCurrentUser(token: string): Promise<any | null> {
    console.log(token)
    try {
      
      return await this.databaseService.user.findUnique({ where: { id: token } });
    } catch {
      return null;
    }
  }

  async resetPassword(email: string, newPassword: string): Promise<boolean> {
    
    const user = await this.databaseService.user.findUnique({ where: { email } });
    if (!user) {
      return false;
    }
    const updatedUser = await this.databaseService.user.update({
      where: { email },
      data: { password: newPassword },
    });
    
    console.log(updatedUser)
    return true;
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      jwt.verify(token, this.jwtSecret);
      return true;
    } catch {
      return false;
    }
  }
}
