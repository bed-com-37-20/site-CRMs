import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AppService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret';

  constructor(private readonly databaseService: DatabaseService) {}

  async authenticate(data: { email: string; password: string }): Promise<{ user: any; token: string } | null> {
    const user = await this.databaseService.user.findUnique({ where: { email: data.email } });
    if (user && user.password === data.password) {
      const payload = { sub: user.id, email: user.email };
      const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' });
      return { user, token };
    }
    return null;
  }

  // async register(data: { email: string; password: string; name?: string }): Promise<any> {
  //   return await this.databaseService.user.create({ data });
  // }

  async getCurrentUser(token: string): Promise<any | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { sub: string; email: string };
      return await this.databaseService.user.findUnique({ where: { id: decoded.sub } });
    } catch {
      return null;
    }
  }

  async resetPassword(email: string, newPassword: string): Promise<boolean> {
    const user = await this.databaseService.user.findUnique({ where: { email } });
    if (!user) {
      return false;
    }
    await this.databaseService.user.update({
      where: { email },
      data: { password: newPassword },
    });
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
