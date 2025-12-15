import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class AuthServiceService implements OnModuleInit {
  constructor(
    @Inject(KAFKA_SERVICE) private readonly kafkClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // connect to kafka when module initializes
    await this.kafkClient.connect();
  }

  getHello(): string {
    return 'Hello World!';
  }

  simulateUserRegistration(email: string) {
    // publish event to kafka
    this.kafkClient.emit(KAFKA_TOPICS.USER_REGISTERED, {
      email,
      timestamp: new Date().toISOString(),
    });

    return { message: `User registered: ${email}` };
  }
}
