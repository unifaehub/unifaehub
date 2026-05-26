import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AppHomeModule } from './modules/app-home/app-home.module';
import { IdentityAccessModule } from './modules/identity-access/identity-access.module';

function applySwaggerBasicAuth(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
  user: string,
  password: string,
) {
  if (!user || !password) return;

  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path || req.url;
    const isProtectedSwagger =
      path.startsWith('/api/docs/general') || path.startsWith('/api/docs/general-json');
    if (!isProtectedSwagger) return next();

    const header = req.headers.authorization ?? '';
    const [scheme, encoded] = header.split(' ');
    const [sentUser, sentPassword] =
      scheme === 'Basic' && encoded ? Buffer.from(encoded, 'base64').toString('utf8').split(':') : [];

    if (sentUser === user && sentPassword === password) return next();

    res.setHeader('WWW-Authenticate', 'Basic realm="UNIFAE Care Swagger"');
    return res.status(401).send('Autenticação necessária para acessar a documentação geral.');
  });
}

function filterAppSwaggerDocument(document: OpenAPIObject): OpenAPIObject {
  const allowedPrefixes = ['/api/v1/app/home'];
  const allowedExact = ['/api/v1/auth/apps', '/api/v1/auth/login'];
  const paths = Object.fromEntries(
    Object.entries(document.paths).filter(([path]) => {
      return allowedExact.includes(path) || allowedPrefixes.some((prefix) => path.startsWith(prefix));
    }),
  );
  return { ...document, paths };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const allowLocalhostOrigin = (origin: string | undefined) => {
    if (!origin) return true;
    return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  };

  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) =>
      cb(null, allowLocalhostOrigin(origin)),
    credentials: true,
  });

  const config = app.get(ConfigService);
  if (config.get<boolean>('swagger.enabled')) {
    const generalSwaggerConfig = new DocumentBuilder()
      .setTitle('UNIFAE Care API')
      .setDescription('Documentação técnica da API do painel e do app do paciente.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const appSwaggerConfig = new DocumentBuilder()
      .setTitle('UNIFAE Care App API')
      .setDescription('Documentação técnica das rotas usadas pelo app do paciente.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    applySwaggerBasicAuth(
      app,
      config.get<string>('swagger.user') ?? '',
      config.get<string>('swagger.password') ?? '',
    );

    const generalDocument = SwaggerModule.createDocument(app, generalSwaggerConfig);
    SwaggerModule.setup('api/docs/general', app, generalDocument, {
      swaggerOptions: { persistAuthorization: true },
    });

    const appDocument = SwaggerModule.createDocument(app, appSwaggerConfig, {
      include: [IdentityAccessModule, AppHomeModule],
      deepScanRoutes: true,
    });
    SwaggerModule.setup('api/docs/app', app, filterAppSwaggerDocument(appDocument), {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
