import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkHealth() {
    let databaseStatus = 'disconnected';
    let databaseLatencyMs: number | null = null;

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      databaseLatencyMs = Date.now() - start;
      databaseStatus = 'connected';
    } catch (err: any) {
      databaseStatus = 'unavailable';
      this.logger.debug(`Health check DB ping failed: ${err.message}`);
    }

    return {
      status: 'ok',
      service: 'SkillMate Backend (Modular Monolith)',
      version: '1.0.0-mvp',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: databaseStatus,
        latencyMs: databaseLatencyMs,
      },
    };
  }
}
