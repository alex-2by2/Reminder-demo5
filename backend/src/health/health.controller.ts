import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  getHealth(): { status: 'ok'; service: string } {
    if (this.connection.readyState !== 1) {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        database: 'disconnected',
      });
    }
    return { status: 'ok', service: 'easy-life-tools-api' };
  }
}
