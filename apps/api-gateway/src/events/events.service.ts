import {
  CreateEventDto,
  EventResponse,
  SERVICES_PORTS,
  UpdateEventDto,
} from '@app/common';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EventsService {
  private readonly eventServiceUrl =
    process.env.EVENTS_SERVICE_URL ||
    `http://localhost:${SERVICES_PORTS.EVENTS_SERVICE}`;

  constructor(private readonly httpService: HttpService) {}

  async create(
    data: CreateEventDto,
    userId: string,
    userRole: string,
  ): Promise<EventResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<EventResponse>(this.eventServiceUrl, data, {
          headers: { 'x-user-id': userId, 'x-user-role': userRole },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findAll(): Promise<EventResponse[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<EventResponse[]>(this.eventServiceUrl),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findMyEvents(userId: string): Promise<EventResponse[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<EventResponse[]>(
          `${this.eventServiceUrl}/my-events`,
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

  async findOne(id: string): Promise<EventResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<EventResponse>(`${this.eventServiceUrl}/${id}`),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(
    id: string,
    data: UpdateEventDto,
    userId: string,
    userRole: string,
  ): Promise<EventResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.put<EventResponse>(
          `${this.eventServiceUrl}/${id}`,
          data,
          {
            headers: { 'x-user-id': userId, 'x-user-role': userRole },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async publish(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<EventResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<EventResponse>(
          `${this.eventServiceUrl}/${id}/publish`,
          {},
          {
            headers: { 'x-user-id': userId, 'x-user-role': userRole },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancel(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<EventResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<EventResponse>(
          `${this.eventServiceUrl}/${id}/cancel`,
          {},
          {
            headers: { 'x-user-id': userId, 'x-user-role': userRole },
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
