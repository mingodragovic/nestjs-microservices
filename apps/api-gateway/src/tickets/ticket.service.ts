import {
  CheckInTicketDto,
  PurchaseTicketDto,
  SERVICES_PORTS,
} from '@app/common';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TicketService {
  private readonly ticketServiceUrl = `http://localhost:${SERVICES_PORTS.TICKETS_SERVICE}`;

  constructor(private readonly httpService: HttpService) {}

  async purchase(data: PurchaseTicketDto, userId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.ticketServiceUrl}/purchase`, data, {
          headers: { 'x-user-id': userId },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findMyTickets(userId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.ticketServiceUrl}/my-tickets`, {
          headers: { 'x-user-id': userId },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findOne(id: string, userId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.ticketServiceUrl}/${id}`, {
          headers: { 'x-user-id': userId },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancel(id: string, userId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.ticketServiceUrl}/${id}/cancel`,
          {},
          { headers: { 'x-user-id': userId } },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async checkIn(data: CheckInTicketDto, organizerId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.ticketServiceUrl}/check-in`, data, {
          headers: { 'x-user-id': organizerId },
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findEventTickets(eventId: string, organizerId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.ticketServiceUrl}/event/${eventId}`, {
          headers: { 'x-user-id': organizerId },
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    const err = error as {
      response?: { data: string | object; status: number };
    };
    if (err.response) {
      throw new HttpException(err.response.data, err.response.status);
    }
    throw new HttpException('Something went wrong', 503);
  }
}
