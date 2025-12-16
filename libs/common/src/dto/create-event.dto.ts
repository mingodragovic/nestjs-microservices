import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(255)
  title: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;

  @IsDateString({}, { message: 'Date must be a valid date string' })
  @IsNotEmpty({ message: 'Date is required' })
  date: string;

  @IsString({ message: 'Location must be a string' })
  @IsNotEmpty({ message: 'Location is required' })
  @MaxLength(255)
  location: string;

  @IsInt()
  @Min(1, { message: 'Capacity must be at least 1' })
  capacity: number;

  @IsInt()
  @Min(0, { message: 'Price must be at least 0' })
  @IsOptional()
  price: number;
}
