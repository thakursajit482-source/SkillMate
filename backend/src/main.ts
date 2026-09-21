import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from '@common/filters/http-exception.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Configuration
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || process.env.PORT || 3000;
  const apiPrefix = configService.get<string>('API_PREFIX') || process.env.API_PREFIX || 'api/v1';

  // Global Prefix
  app.setGlobalPrefix(apiPrefix);

  // CORS Configuration
  const rawFrontendUrl =
    configService.get<string>('FRONTEND_URL') || process.env.FRONTEND_URL;

  const localOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];

  const configuredOrigins = rawFrontendUrl
    ? rawFrontendUrl
        .split(',')
        .map((url) => url.trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, ''))
        .filter(Boolean)
    : [];

  const allowedOrigins = Array.from(
    new Set([
      ...configuredOrigins,
      ...localOrigins,
      'https://skill-mate-seven.vercel.app',
    ]),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      if (
        allowedOrigins.includes(normalizedOrigin) ||
        /^https:\/\/skill-mate[a-z0-9-]*\.vercel\.app$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      logger.warn(`Blocked by CORS: origin '${origin}' is not in allowed list`);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Global Pipes, Filters & Interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('SkillMate API')
    .setDescription(
      'SkillMate Modular Monolith Backend API — Cross-college student network for MMR. Provides endpoints for Auth, Verification, Profiles, Discovery, Requests, Offers, Tasks, Chat, Reputation, and Safety.',
    )
    .setVersion('1.0.0-mvp')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token in the format: Bearer <token>',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Health', 'System and database health indicators')
    .addTag('Auth', 'Authentication, registration, login and session tokens')
    .addTag('Colleges', 'MMR college directory and search')
    .addTag('Verification', 'Student identity and college verification lifecycle')
    .addTag('Profiles', 'Student public and private profiles, skills, and availability')
    .addTag('Discovery', 'Proximity and skill-based discovery of peers and requests')
    .addTag('Requests', 'Typed collaborative requests (Paid, Skill Exchange, Social)')
    .addTag('Offers', 'Proposals and counter-terms on open requests')
    .addTag('Tasks', 'Task lifecycle, term confirmation, completion, and cancellation')
    .addTag('Chat', '1:1 messaging threads scoped to request/offer relationships')
    .addTag('Reputation', 'Behavioral ratings, tags, and peer skill endorsements')
    .addTag('Safety', 'Safety reporting, user blocking, and recourse')
    .addTag('Admin', 'Moderation queues for verification and user safety reports')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`🚀 SkillMate Backend successfully started on http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger API Documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
