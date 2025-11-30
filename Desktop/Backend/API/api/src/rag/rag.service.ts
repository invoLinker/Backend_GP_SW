import { Injectable } from "@nestjs/common";
import { EmbeddingService } from "./embedding.service";
import * as fs from "fs";
import * as path from "path";

export interface RagItem {
  id: string;
  text: string;
  embedding: number[];
}

@Injectable()
export class RagService {
  private dataFile = path.join(__dirname, "data.json");

  constructor(private embeddingService: EmbeddingService) {}

  private loadData(): RagItem[] {
    if (!fs.existsSync(this.dataFile)) {
      fs.writeFileSync(this.dataFile, "[]");
    }
    return JSON.parse(fs.readFileSync(this.dataFile, "utf8"));
  }

  private saveData(data: RagItem[]) {
    fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
  }

  async addDocument(id: string, text: string) {
    const embedding = await this.embeddingService.embed(text);
    const data = this.loadData();

    data.push({ id, text, embedding });

    this.saveData(data);

    return { message: "Document added", id };
  }

  // cosine similarity
  private cosine(a: number[], b: number[]) {
    let dot = 0,
      normA = 0,
      normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async ask(query: string) {
    const queryEmbedding = await this.embeddingService.embed(query);
    const data = this.loadData();

    if (!data.length) return { answer: "No documents found." };

    let best: RagItem | null = null;
    let bestScore = -1;

    for (const item of data) {
      const score = this.cosine(queryEmbedding, item.embedding);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    return {
      match: best,
      confidence: bestScore,
      answer: best
        ? `Based on your data: ${best.text}`
        : "No relevant match found."
    };
  }
}
