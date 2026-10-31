import { ServiceUnavailableException } from '@nestjs/common';
import { Connection } from 'mongoose';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports healthy when MongoDB is connected', () => {
    const connection = { readyState: 1 } as unknown as Connection;
    const controller = new HealthController(connection);

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'easy-life-tools-api',
    });
  });

  it('returns service unavailable when MongoDB is disconnected', () => {
    const connection = { readyState: 0 } as unknown as Connection;
    const controller = new HealthController(connection);

    expect(() => controller.getHealth()).toThrow(ServiceUnavailableException);
  });
});
