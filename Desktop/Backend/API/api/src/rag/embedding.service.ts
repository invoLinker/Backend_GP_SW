import { Injectable } from "@nestjs/common";

@Injectable()
export class EmbeddingService {
  private extractor: any;

  constructor() {
    this.init();
  }

  async init() {
    const { pipeline } = await import("@xenova/transformers");

    this.extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }

  async embed(text: string): Promise<number[]> {
    if (!this.extractor) {
      await this.init();
    }

    const output = await this.extractor(text, {
      pooling: "mean",
      normalize: true,
    });

    return Array.from(output.data);
  }
}
