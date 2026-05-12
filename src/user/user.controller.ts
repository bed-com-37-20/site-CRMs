import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Query,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Response,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { Prisma } from 'generated/prisma/client';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() createUserDto: Prisma.UserCreateInput) {
    return await this.userService.create(createUserDto);
  }

  @Get()
  async findAll() {
    return await this.userService.findAll();
  }

  @Get(':id/profile-pic')
  @ApiOperation({ summary: 'Get profile picture for a user (proxy)' })
  @ApiResponse({ status: 200, description: 'Profile picture image' })
  async getProfilePicture(@Param('id') id: string, @Response() res) {
    try {
      const stream = await this.userService.getProfilePictureStream(id);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      });
      stream.pipe(res);
    } catch (error) {
      throw new NotFoundException('Profile picture not found');
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.userService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: Prisma.UserUpdateInput,
  ) {
    return await this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.userService.remove(id);
  }

  @Post(':id/upload-profile-pic')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a profile picture for a user' })
  @ApiResponse({ status: 200, description: 'Profile picture uploaded successfully' })
  async uploadProfilePicture(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.userService.uploadProfilePicture(id, file);
  }

  @Delete(':id/profile-pic-delete')
  @ApiOperation({ summary: 'Delete a profile picture for a user' })
  @ApiResponse({ status: 200, description: 'Profile picture deleted successfully' })
  async deleteProfilePicture(@Param('id') id: string) {
    return await this.userService.deleteProfilePicture(id);
  }
}
