export interface EmbeddingProvider {
  readonly name: string;
  readonly dimension: number;
  isAvailable(): boolean;
  generateEmbedding(text: string): Promise<number[] | null>;
  generateEmbeddings(texts: string[]): Promise<(number[] | null)[]>;
}
