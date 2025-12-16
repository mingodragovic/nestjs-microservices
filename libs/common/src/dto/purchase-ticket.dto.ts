import { IsUUID, IsInt, Min, Max, IsNotEmpty } from 'class-validator';

export class PurchaseTicketDto {
  @IsUUID('4', { message: 'Event ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Event ID is required' })
  eventId: string;

  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(10, { message: 'Quantity must be at most 10' })
  quantity: number;
}
