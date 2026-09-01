import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service.js';
import { JwtService } from '@nestjs/jwt';

describe('AuthService Unit Suite', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock_jwt_access_token'),
            verify: jest.fn().mockReturnValue({ sub: 'user-1', email: 'test@mivo.app' }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
