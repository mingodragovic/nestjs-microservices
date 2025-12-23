import {
  CheckInTicketDto,
  PurchaseTicketDto,
  SERVICES_PORTS,
  TicketResponse,
} from '@app/common';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TicketService {
  private readonly ticketServiceUrl =
    process.env.TICKETS_SERVICE_URL ||
    `http://localhost:${SERVICES_PORTS.TICKETS_SERVICE}`;

  constructor(private readonly httpService: HttpService) {}

  async purchase(
    data: PurchaseTicketDto,
    userId: string,
  ): Promise<TicketResponse[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<TicketResponse[]>(
          `${this.ticketServiceUrl}/purchase`,
          data,
          {
            headers: { 'x-user-id': userId },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findMyTickets(userId: string): Promise<TicketResponse[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TicketResponse[]>(
          `${this.ticketServiceUrl}/my-tickets`,
          {
            headers: { 'x-user-id': userId },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findOne(id: string, userId: string): Promise<TicketResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TicketResponse>(`${this.ticketServiceUrl}/${id}`, {
          headers: { 'x-user-id': userId },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancel(id: string, userId: string): Promise<TicketResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<TicketResponse>(
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

  async checkIn(
    data: CheckInTicketDto,
    organizerId: string,
  ): Promise<TicketResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<TicketResponse>(
          `${this.ticketServiceUrl}/check-in`,
          data,
          {
            headers: { 'x-user-id': organizerId },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findEventTickets(
    eventId: string,
    organizerId: string,
  ): Promise<TicketResponse[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TicketResponse[]>(
          `${this.ticketServiceUrl}/event/${eventId}`,
          {
            headers: { 'x-user-id': organizerId },
          },
        ),
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
