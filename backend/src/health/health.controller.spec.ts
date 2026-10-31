import { ServiceUnavailableException } from '@nestjs/common';
import { Connection } from 'mongoose';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const connection = { readyState: 1 } as Connection;
  const controller = new HealthController(connection);

  it('reports healthy when MongoDB is connected', () => {
    connection.readyState = 1;

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'easy-life-tools-api',
    });
  });

  it('returns service unavailable when MongoDB is disconnected', () => {
    connection.readyState = 0;

    expect(() => controller.getHealth()).toThrow(ServiceUnavailableException);
  });
});
