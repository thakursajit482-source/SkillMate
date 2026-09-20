import { Injectable } from '@nestjs/common';
import { EmbeddingProvider } from './embedding-provider.interface';

interface SemanticCluster {
  id: number;
  weight: number;
  terms: string[];
}

@Injectable()
export class LocalSemanticEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'LocalSemanticEmbeddingProvider';
  readonly dimension = 64;

  private readonly clusters: SemanticCluster[] = [
    {
      id: 0,
      weight: 3.0,
      terms: [
        'machine learning',
        'ml',
        'deep learning',
        'data science',
        'scikit-learn',
        'scikit',
        'sklearn',
        'tensorflow',
        'pytorch',
        'ai',
        'artificial intelligence',
        'neural networks',
        'model',
        'nlp',
      ],
    },
    {
      id: 1,
      weight: 2.5,
      terms: ['python', 'py', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'scipy', 'jupyter'],
    },
    {
      id: 2,
      weight: 2.5,
      terms: ['react', 'reactjs', 'react native', 'frontend', 'ui', 'redux', 'nextjs', 'html', 'css', 'tailwind', 'javascript', 'typescript', 'js', 'ts'],
    },
    {
      id: 3,
      weight: 2.5,
      terms: ['node', 'nodejs', 'express', 'nestjs', 'backend', 'api', 'rest', 'microservices', 'server'],
    },
    {
      id: 4,
      weight: 2.5,
      terms: ['database', 'sql', 'postgresql', 'postgres', 'mysql', 'mongodb', 'mongo', 'redis', 'prisma', 'orm'],
    },
    {
      id: 5,
      weight: 2.5,
      terms: ['dsa', 'data structures', 'algorithms', 'c++', 'cpp', 'java', 'c programming', 'problem solving', 'leetcode'],
    },
    {
      id: 6,
      weight: 2.5,
      terms: ['flutter', 'dart', 'mobile app', 'android', 'ios', 'kotlin', 'swift'],
    },
    {
      id: 7,
      weight: 2.5,
      terms: ['figma', 'ui/ux', 'ui design', 'ux design', 'wireframing', 'prototyping', 'design', 'user experience', 'user interface'],
    },
    {
      id: 8,
      weight: 2.5,
      terms: ['graphic design', 'photoshop', 'illustrator', 'canva', 'video editing', 'premiere pro', 'after effects', 'multimedia'],
    },
    {
      id: 9,
      weight: 2.5,
      terms: ['math', 'mathematics', 'calculus', 'linear algebra', 'statistics', 'probability', 'discrete math'],
    },
    {
      id: 10,
      weight: 2.0,
      terms: ['project', 'project help', 'capstone', 'development', 'build', 'application', 'software'],
    },
    {
      id: 11,
      weight: 2.0,
      terms: ['tutor', 'tutoring', 'teaching', 'learn', 'mentoring', 'guidance', 'concepts'],
    },
    {
      id: 12,
      weight: 2.0,
      terms: ['exam', 'test', 'preparation', 'gate', 'cat', 'gre', 'revision', 'finals', 'midterm'],
    },
  ];

  isAvailable(): boolean {
    return true;
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!text || !text.trim()) {
      return null;
    }

    const vector = new Array(this.dimension).fill(0);
    const normalizedText = text.toLowerCase();

    // 1. Semantic cluster activations
    for (const cluster of this.clusters) {
      let clusterHits = 0;
      for (const term of cluster.terms) {
        // Match word boundaries or substring
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(normalizedText)) {
          clusterHits++;
        }
      }

      if (clusterHits > 0) {
        // Activate cluster dimension and adjacent correlated dimensions with sublinear scaling
        const scaledWeight = (1 + Math.log(clusterHits)) * 4.0;
        const baseIdx = cluster.id * 2;
        if (baseIdx < this.dimension) {
          vector[baseIdx] += scaledWeight;
          if (baseIdx + 1 < this.dimension) {
            vector[baseIdx + 1] += scaledWeight * 0.7;
          }
        }
      }
    }

    // 2. Token hash for content words (filtering structural filler words)
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'who', 'this', 'that', 'from',
      'skills', 'skill', 'about', 'area', 'level', 'looking', 'need',
      'someone', 'intermediate', 'advanced', 'beginner', 'experienced',
    ]);

    const tokens = normalizedText
      .replace(/[^a-z0-9+#\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t));

    for (const token of tokens) {
      const hash = this.simpleHash(token);
      const idx = 26 + (Math.abs(hash) % (this.dimension - 26));
      vector[idx] += 0.8;
    }

    // 3. L2 Normalize vector
    let norm = 0;
    for (let i = 0; i < this.dimension; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) {
        vector[i] = Number((vector[i] / norm).toFixed(6));
      }
    }

    return vector;
  }

  async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  }
}
