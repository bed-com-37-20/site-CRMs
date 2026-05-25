// src/modules/user/user.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UserService } from './user.service';
import { Prisma } from 'generated/prisma/client';
import { Response } from 'express';
import { fileUploadConfig } from '../../file-upload.config';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Body() createUserDto: Prisma.UserCreateInput) {
    return await this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  async findAll() {
    return await this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    return await this.userService.findOne(id);
  }

  @Get(':id/profile-pic')
  @ApiOperation({ summary: 'Get profile picture for a user' })
  @ApiResponse({ status: 200, description: 'Profile picture image' })
  async getProfilePicture(@Param('id') id: string, @Res() res) {
    try {
      const stream = await this.userService.getProfilePictureStream(id);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      });
      stream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Profile picture not found');
    }
  }

  @Get(':id/profile-pic-url')
  @ApiOperation({ summary: 'Get profile picture URL for a user' })
  async getProfilePictureUrl(@Param('id') id: string) {
    const url = await this.userService.getProfilePictureUrl(id);
    return { url };
  }

  @Get(':id/files')
  @ApiOperation({ summary: 'Get all files for a user' })
  async getAllFiles(@Param('id') id: string) {
    return await this.userService.getAllUserFiles(id);
  }

  @Get(':id/files/:fieldName')
  @ApiOperation({ summary: 'Get specific file by field name' })
  async getFileByField(
    @Param('id') id: string,
    @Param('fieldName') fieldName: string,
  ) {
    return await this.userService.getUserFileByField(id, fieldName);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: Prisma.UserUpdateInput,
  ) {
    return await this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
  }

  @Post(':id/upload-profile-pic')
  @UseInterceptors(FileInterceptor('file', fileUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a profile picture for a user' })
  @ApiResponse({ status: 200, description: 'Profile picture uploaded successfully' })
  async uploadProfilePicture(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.userService.uploadProfilePicture(id, file);
  }

  @Post(':id/update-profile-pic')
  @UseInterceptors(FileInterceptor('file', fileUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Update profile picture for a user' })
  async updateProfilePicture(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.userService.updateProfilePicture(id, file);
  }

  @Post(':id/upload-file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        fieldName: {
          type: 'string',
          description: 'Optional field name for the file',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a generic file for user' })
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('fieldName') fieldName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.userService.uploadUserFile(id, file, fieldName);
  }

  @Delete(':id/profile-pic')
  @ApiOperation({ summary: 'Delete profile picture for a user' })
  @ApiResponse({ status: 200, description: 'Profile picture deleted successfully' })
  async deleteProfilePicture(@Param('id') id: string) {
    return await this.userService.deleteProfilePicture(id);
  }

  @Delete(':id/files/:fieldName')
  @ApiOperation({ summary: 'Delete a specific file by field name' })
  async deleteFileByField(
    @Param('id') id: string,
    @Param('fieldName') fieldName: string,
  ) {
    return await this.userService.deleteUserFileByField(id, fieldName);
  }
}