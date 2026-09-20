import { ParsedQueryResponseDto } from '../dto/parsed-query-response.dto';

export interface AiQueryProvider {
  readonly name: string;
  isAvailable(): boolean;
  parseQuery(query: string): Promise<ParsedQueryResponseDto | null>;
}
