// test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('Application E2E Tests (e2e)', () => {
  let app: INestApplication;
  let prismaService: DatabaseService;
  let authToken: string;
  let testUserId: string;
  let testCompanyId: string;
  let testProductId: string;
  let testFileId: string;

  // Test data
  const testUser = {
    email: `test${Date.now()}@example.com`,
    fname: 'John',
    lname: 'Doe',
    address: '123 Test St',
    password: 'password123',
  };

  const testCompany = {
    name: 'Test Company',
    description: 'This is a test company',
    address: '456 Company Ave',
    phone: '+1234567890',
    email: `company${Date.now()}@example.com`,
    story: 'Our company story',
    missionPoints: ['Mission 1', 'Mission 2'],
    whyChooseUs: { key: 'value' },
  };

  const testProduct = {
    name: 'Test Product',
    description: 'This is a test product',
    price: 99.99,
    status: true,
    avalailableQuantity: 100,
    avalability: 'IN_STOCK',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prismaService = moduleFixture.get<DatabaseService>(DatabaseService);

    // Clean up existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function cleanupTestData() {
    try {
      // Delete in correct order to avoid foreign key constraints
      if (testFileId) {
        await prismaService.file.deleteMany({ where: { id: testFileId } });
      }
      if (testProductId) {
        await prismaService.product.deleteMany({ where: { id: testProductId } });
      }
      if (testCompanyId) {
        await prismaService.companyInfo.deleteMany({ where: { id: testCompanyId } });
      }
      if (testUserId) {
        await prismaService.user.deleteMany({ where: { id: testUserId } });
      }
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  }

  describe('User Module', () => {
    describe('POST /user', () => {
      it('should create a new user', async () => {
        const response = await request(app.getHttpServer())
          .post('/user')
          .send(testUser)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe(testUser.email);
        expect(response.body.fname).toBe(testUser.fname);
        expect(response.body.lname).toBe(testUser.lname);
        
        testUserId = response.body.id;
      });

      it('should not create user with duplicate email', async () => {
        await request(app.getHttpServer())
          .post('/user')
          .send(testUser)
          .expect(500); // Prisma unique constraint error
      });
    });

    describe('GET /user', () => {
      it('should get all users', async () => {
        const response = await request(app.getHttpServer())
          .get('/user')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });

    describe('GET /user/:id', () => {
      it('should get user by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/user/${testUserId}`)
          .expect(200);

        expect(response.body.id).toBe(testUserId);
        expect(response.body.email).toBe(testUser.email);
      });

      it('should return 404 for non-existent user', async () => {
        await request(app.getHttpServer())
          .get('/user/non-existent-id')
          .expect(404);
      });
    });

    describe('PATCH /user/:id', () => {
      it('should update user', async () => {
        const updateData = { fname: 'Jane' };
        
        const response = await request(app.getHttpServer())
          .patch(`/user/${testUserId}`)
          .send(updateData)
          .expect(200);

        expect(response.body.fname).toBe('Jane');
      });
    });

    describe('Profile Picture Operations', () => {
      it('should upload profile picture', async () => {
        const testImagePath = path.join(__dirname, 'test-image.jpg');
        
        // Create a test image if it doesn't exist
        if (!fs.existsSync(testImagePath)) {
          // Create a simple 1x1 pixel JPEG buffer
          const imageBuffer = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            'base64'
          );
          await fs.writeFile(testImagePath, imageBuffer);
        }

        const response = await request(app.getHttpServer())
          .post(`/user/${testUserId}/upload-profile-pic`)
          .attach('file', testImagePath)
          .expect(201);

        expect(response.body.message).toBe('Profile picture uploaded successfully');
        expect(response.body.file).toHaveProperty('id');
        expect(response.body.file.fieldName).toBe('profilePicUrl');
        
        testFileId = response.body.file.id;
      });

      it('should get profile picture', async () => {
        const response = await request(app.getHttpServer())
          .get(`/user/${testUserId}/profile-pic`)
          .expect(200);

        expect(response.headers['content-type']).toMatch(/image/);
      });

      it('should get profile picture URL', async () => {
        const response = await request(app.getHttpServer())
          .get(`/user/${testUserId}/profile-pic-url`)
          .expect(200);

        expect(response.body).toHaveProperty('url');
        expect(response.body.url).toBeTruthy();
      });

      it('should update profile picture', async () => {
        const testImagePath = path.join(__dirname, 'test-image-2.jpg');
        
        const imageBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64'
        );
        await fs.writeFile(testImagePath, imageBuffer);

        const response = await request(app.getHttpServer())
          .post(`/user/${testUserId}/update-profile-pic`)
          .attach('file', testImagePath)
          .expect(201);

        expect(response.body.message).toContain('updated');
      });

      it('should get all user files', async () => {
        const response = await request(app.getHttpServer())
          .get(`/user/${testUserId}/files`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });

    describe('DELETE /user/:id', () => {
      it('should delete user', async () => {
        await request(app.getHttpServer())
          .delete(`/user/${testUserId}`)
          .expect(204);
      });
    });
  });

  describe('Company Module', () => {
    beforeAll(async () => {
      // Create a user for company tests
      const userResponse = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: `company-owner${Date.now()}@example.com`,
          fname: 'Owner',
          lname: 'User',
          address: '789 Owner St',
          password: 'password123',
        });
      
      testUserId = userResponse.body.id;
    });

    describe('POST /company', () => {
      it('should create a new company', async () => {
        const response = await request(app.getHttpServer())
          .post('/company')
          .send(testCompany)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(testCompany.name);
        expect(response.body.email).toBe(testCompany.email);
        
        testCompanyId = response.body.id;
      });
    });

    describe('GET /company', () => {
      it('should get all companies', async () => {
        const response = await request(app.getHttpServer())
          .get('/company')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });

    describe('GET /company/:id', () => {
      it('should get company by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/company/${testCompanyId}`)
          .expect(200);

        expect(response.body.id).toBe(testCompanyId);
        expect(response.body.name).toBe(testCompany.name);
      });
    });

    describe('PATCH /company/:id', () => {
      it('should update company', async () => {
        const updateData = { name: 'Updated Company Name' };
        
        const response = await request(app.getHttpServer())
          .patch(`/company/${testCompanyId}`)
          .send(updateData)
          .expect(200);

        expect(response.body.name).toBe('Updated Company Name');
      });
    });

    describe('Company Logo Operations', () => {
      it('should upload company logo', async () => {
        const testImagePath = path.join(__dirname, 'company-logo.jpg');
        
        const imageBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64'
        );
        await fs.writeFile(testImagePath, imageBuffer);

        const response = await request(app.getHttpServer())
          .post(`/company/${testCompanyId}/upload-logo`)
          .attach('file', testImagePath)
          .expect(201);

        expect(response.body.message).toBe('Logo uploaded successfully');
        expect(response.body.file).toHaveProperty('id');
      });

      it('should get company logo', async () => {
        const response = await request(app.getHttpServer())
          .get(`/company/${testCompanyId}/logo`)
          .expect(200);

        expect(response.headers['content-type']).toMatch(/image/);
      });

      it('should update company logo', async () => {
        const testImagePath = path.join(__dirname, 'company-logo-2.jpg');
        
        const imageBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64'
        );
        await fs.writeFile(testImagePath, imageBuffer);

        const response = await request(app.getHttpServer())
          .post(`/company/${testCompanyId}/update-logo`)
          .attach('file', testImagePath)
          .expect(201);

        expect(response.body.message).toContain('updated');
      });

      it('should upload company cover image', async () => {
        const testImagePath = path.join(__dirname, 'company-cover.jpg');
        
        const imageBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64'
        );
        await fs.writeFile(testImagePath, imageBuffer);

        const response = await request(app.getHttpServer())
          .post(`/company/${testCompanyId}/upload-cover-image`)
          .attach('file', testImagePath)
          .expect(201);

        expect(response.body.message).toBe('Cover image uploaded successfully');
      });

      it('should get company cover image', async () => {
        const response = await request(app.getHttpServer())
          .get(`/company/${testCompanyId}/cover-image`)
          .expect(200);

        expect(response.headers['content-type']).toMatch(/image/);
      });
    });

    describe('DELETE /company/:id', () => {
      it('should delete company logo', async () => {
        await request(app.getHttpServer())
          .delete(`/company/${testCompanyId}/logo`)
          .expect(200);
      });

      it('should delete company cover image', async () => {
        await request(app.getHttpServer())
          .delete(`/company/${testCompanyId}/cover-image`)
          .expect(200);
      });

      it('should delete company', async () => {
        await request(app.getHttpServer())
          .delete(`/company/${testCompanyId}`)
          .expect(204);
      });
    });
  });

  describe('Product Module', () => {
    beforeAll(async () => {
      // Create a user and company for product tests
      const userResponse = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: `product-owner${Date.now()}@example.com`,
          fname: 'Product',
          lname: 'Owner',
          address: '101 Product St',
          password: 'password123',
        });
      
      testUserId = userResponse.body.id;

      const companyResponse = await request(app.getHttpServer())
        .post('/company')
        .send(testCompany);
      
      testCompanyId = companyResponse.body.id;
    });

    describe('POST /products', () => {
      it('should create a new product', async () => {
        const response = await request(app.getHttpServer())
          .post(`/products?companyId=${testCompanyId}`)
          .send(testProduct)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(testProduct.name);
        expect(response.body.price).toBe(testProduct.price);
        
        testProductId = response.body.id;
      });
    });

    describe('GET /products', () => {
      it('should get all products for company', async () => {
        const response = await request(app.getHttpServer())
          .get(`/products?companyId=${testCompanyId}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].companyInfoId).toBe(testCompanyId);
      });
    });

    describe('GET /products/:id', () => {
      it('should get product by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/products/${testProductId}`)
          .expect(200);

        expect(response.body.id).toBe(testProductId);
        expect(response.body.name).toBe(testProduct.name);
      });
    });

    describe('PATCH /products/:id', () => {
      it('should update product', async () => {
        const updateData = { price: 149.99 };
        
        const response = await request(app.getHttpServer())
          .patch(`/products/${testProductId}`)
          .send(updateData)
          .expect(200);

        expect(response.body.price).toBe(149.99);
      });
    });

    describe('Product Image Operations', () => {
      it('should upload product image', async () => {
        const testImagePath = path.join(__dirname, 'product-image.jpg');
        
        const imageBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64'
        );
        await fs.writeFile(testImagePath, imageBuffer);

        const response = await request(app.getHttpServer())
          .post(`/products/${testProductId}/upload-image`)
          .attach('file', testImagePath)
          .expect(201);

        expect(response.body.message).toBe('Product image uploaded successfully');
        expect(response.body.file).toHaveProperty('id');
      });

      it('should get product image', async () => {
        const response = await request(app.getHttpServer())
          .get(`/products/${testProductId}/image`)
          .expect(200);

        expect(response.headers['content-type']).toMatch(/image/);
      });

      it('should get product image URL', async () => {
        const response = await request(app.getHttpServer())
          .get(`/products/${testProductId}/image-url`)
          .expect(200);

        expect(response.body).toHaveProperty('url');
      });

      it('should upload multiple product images', async () => {
        const testImagePath1 = path.join(__dirname, 'product-image-1.jpg');
        const testImagePath2 = path.join(__dirname, 'product-image-2.jpg');
        
        const imageBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64'
        );
        await fs.writeFile(testImagePath1, imageBuffer);
        await fs.writeFile(testImagePath2, imageBuffer);

        const response = await request(app.getHttpServer())
          .post(`/products/${testProductId}/upload-multiple-images`)
          .attach('files', testImagePath1)
          .attach('files', testImagePath2)
          .expect(201);

        expect(response.body.message).toContain('files uploaded successfully');
      });

      it('should update product image', async () => {
        const testImagePath = path.join(__dirname, 'product-image-updated.jpg');
        
        const imageBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64'
        );
        await fs.writeFile(testImagePath, imageBuffer);

        const response = await request(app.getHttpServer())
          .post(`/products/${testProductId}/update-image`)
          .attach('file', testImagePath)
          .expect(201);

        expect(response.body.message).toContain('updated');
      });

      it('should get all product files', async () => {
        const response = await request(app.getHttpServer())
          .get(`/products/${testProductId}/files`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });

    describe('DELETE /products/:id', () => {
      it('should delete product image', async () => {
        await request(app.getHttpServer())
          .delete(`/products/${testProductId}/image`)
          .expect(200);
      });

      it('should delete product', async () => {
        await request(app.getHttpServer())
          .delete(`/products/${testProductId}`)
          .expect(204);
      });
    });
  });

  describe('File Module Direct Tests', () => {
    let directFileId: string;
    let tempUserId: string;

    beforeAll(async () => {
      // Create a test user for file operations
      const userResponse = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: `file-test${Date.now()}@example.com`,
          fname: 'File',
          lname: 'Tester',
          address: '202 File St',
          password: 'password123',
        });
      
      tempUserId = userResponse.body.id;
    });

    describe('POST /files/upload', () => {
      it('should upload a file directly', async () => {
        const testImagePath = path.join(__dirname, 'direct-upload.jpg');
        
        const imageBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64'
        );
        await fs.writeFile(testImagePath, imageBuffer);

        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .field('entityType', 'User')
          .field('entityId', tempUserId)
          .field('fieldName', 'profilePicUrl')
          .attach('file', testImagePath)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.fieldName).toBe('profilePicUrl');
        
        directFileId = response.body.id;
      });
    });

    describe('GET /files/entity/:entityType/:entityId', () => {
      it('should get files by entity', async () => {
        const response = await request(app.getHttpServer())
          .get(`/files/entity/User/${tempUserId}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });

    describe('GET /files/entity/:entityType/:entityId/field/:fieldName', () => {
      it('should get file by field', async () => {
        const response = await request(app.getHttpServer())
          .get(`/files/entity/User/${tempUserId}/field/profilePicUrl`)
          .expect(200);

        expect(response.body.fieldName).toBe('profilePicUrl');
        expect(response.body.entityId).toBe(tempUserId);
      });
    });

    describe('GET /files/stream/:id', () => {
      it('should stream file', async () => {
        const response = await request(app.getHttpServer())
          .get(`/files/stream/${directFileId}`)
          .expect(200);

        expect(response.headers['content-type']).toMatch(/image/);
      });
    });

    describe('PUT /files/:id', () => {
      it('should update file metadata', async () => {
        const updateData = { originalName: 'updated-name.jpg' };
        
        const response = await request(app.getHttpServer())
          .put(`/files/${directFileId}`)
          .send(updateData)
          .expect(200);

        expect(response.body.originalName).toBe('updated-name.jpg');
      });
    });

    describe('DELETE /files/:id', () => {
      it('should delete file', async () => {
        await request(app.getHttpServer())
          .delete(`/files/${directFileId}`)
          .expect(204);
      });
    });
  });

  describe('Cross-Module Integration Tests', () => {
    let crossUserId: string;
    let crossCompanyId: string;
    let crossProductId: string;

    it('should create complete flow: User -> Company -> Product with files', async () => {
      // 1. Create user
      const userResponse = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: `cross-user${Date.now()}@example.com`,
          fname: 'Cross',
          lname: 'User',
          address: '303 Cross St',
          password: 'password123',
        });
      
      crossUserId = userResponse.body.id;

      // 2. Upload user profile picture
      const testImagePath = path.join(__dirname, 'cross-user-image.jpg');
      const imageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      await fs.writeFile(testImagePath, imageBuffer);

      await request(app.getHttpServer())
        .post(`/user/${crossUserId}/upload-profile-pic`)
        .attach('file', testImagePath)
        .expect(201);

      // 3. Create company
      const companyResponse = await request(app.getHttpServer())
        .post('/company')
        .send(testCompany);
      
      crossCompanyId = companyResponse.body.id;

      // 4. Upload company logo
      await request(app.getHttpServer())
        .post(`/company/${crossCompanyId}/upload-logo`)
        .attach('file', testImagePath)
        .expect(201);

      // 5. Create product
      const productResponse = await request(app.getHttpServer())
        .post(`/products?companyId=${crossCompanyId}`)
        .send(testProduct);
      
      crossProductId = productResponse.body.id;

      // 6. Upload product image
      await request(app.getHttpServer())
        .post(`/products/${crossProductId}/upload-image`)
        .attach('file', testImagePath)
        .expect(201);

      // 7. Verify all entities have files
      const userFiles = await request(app.getHttpServer())
        .get(`/user/${crossUserId}/files`)
        .expect(200);
      
      expect(userFiles.body.length).toBeGreaterThan(0);

      const companyFiles = await request(app.getHttpServer())
        .get(`/company/${crossCompanyId}/files`)
        .expect(200);
      
      expect(companyFiles.body.length).toBeGreaterThan(0);

      const productFiles = await request(app.getHttpServer())
        .get(`/products/${crossProductId}/files`)
        .expect(200);
      
      expect(productFiles.body.length).toBeGreaterThan(0);
    });

    it('should cleanup files when parent entities are deleted', async () => {
      // Delete product (should delete product images)
      await request(app.getHttpServer())
        .delete(`/products/${crossProductId}`)
        .expect(204);

      // Verify product files are deleted
      const productFiles = await request(app.getHttpServer())
        .get(`/products/${crossProductId}/files`)
        .expect(200);
      
      expect(productFiles.body.length).toBe(0);

      // Delete company (should delete company files)
      await request(app.getHttpServer())
        .delete(`/company/${crossCompanyId}`)
        .expect(204);

      // Delete user (should delete user files)
      await request(app.getHttpServer())
        .delete(`/user/${crossUserId}`)
        .expect(204);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid file upload', async () => {
      const response = await request(app.getHttpServer())
        .post('/user/invalid-id/upload-profile-pic')
        .attach('file', Buffer.from('not an image'), 'test.txt')
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should handle non-existent entity', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/non-existent-id/profile-pic')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should handle duplicate file upload for same field', async () => {
      // Create a test user
      const userResponse = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: `duplicate-test${Date.now()}@example.com`,
          fname: 'Duplicate',
          lname: 'Test',
          address: '404 Test St',
          password: 'password123',
        });
      
      const userId = userResponse.body.id;

      const testImagePath = path.join(__dirname, 'duplicate-test.jpg');
      const imageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      await fs.writeFile(testImagePath, imageBuffer);

      // First upload
      await request(app.getHttpServer())
        .post(`/user/${userId}/upload-profile-pic`)
        .attach('file', testImagePath)
        .expect(201);

      // Second upload (should replace existing)
      const response = await request(app.getHttpServer())
        .post(`/user/${userId}/upload-profile-pic`)
        .attach('file', testImagePath)
        .expect(201);

      expect(response.body.message).toBe('Profile picture uploaded successfully');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent file uploads', async () => {
      const promises = [] as any;
      const uploadCount = 5;

      // Create a test user
      const userResponse = await request(app.getHttpServer())
        .post('/user')
        .send({
          email: `concurrent${Date.now()}@example.com`,
          fname: 'Concurrent',
          lname: 'User',
          address: '505 Test St',
          password: 'password123',
        });
      
      const userId = userResponse.body.id;

      const testImagePath = path.join(__dirname, 'concurrent-test.jpg');
      const imageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      await fs.writeFile(testImagePath, imageBuffer);

      // Create multiple upload promises
      for (let i = 0; i < uploadCount; i++) {
        promises.push(
          request(app.getHttpServer())
            .post(`/user/${userId}/upload-profile-pic`)
            .attach('file', testImagePath)
        );
      }

      const results = await Promise.all(promises);
      
      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe(201);
      });
    }, 30000); // 30 second timeout
  });
});

// Helper function to clean up test files after tests
afterAll(async () => {
  const testFiles = [
    'test-image.jpg',
    'test-image-2.jpg',
    'company-logo.jpg',
    'company-logo-2.jpg',
    'company-cover.jpg',
    'product-image.jpg',
    'product-image-1.jpg',
    'product-image-2.jpg',
    'product-image-updated.jpg',
    'direct-upload.jpg',
    'cross-user-image.jpg',
    'duplicate-test.jpg',
    'concurrent-test.jpg',
  ];

  for (const file of testFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      await fs.remove(filePath);
    }
  }
});