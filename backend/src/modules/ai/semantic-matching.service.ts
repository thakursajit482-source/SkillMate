import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { GeminiEmbeddingProvider } from './providers/gemini-embedding.provider';
import { LocalSemanticEmbeddingProvider } from './providers/local-semantic-embedding.provider';
import { SemanticMatchQueryDto } from './dto/semantic-match-query.dto';
import { SemanticMatchCandidateDto } from './dto/semantic-match-response.dto';
import { UserStatus, VerificationStatus } from '@prisma/client';

@Injectable()
export class SemanticMatchingService {
  private readonly logger = new Logger(SemanticMatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiEmbeddingProvider: GeminiEmbeddingProvider,
    private readonly localSemanticEmbeddingProvider: LocalSemanticEmbeddingProvider,
  ) {}

  async findSemanticMatches(
    dto: SemanticMatchQueryDto,
    currentUserId?: string,
  ): Promise<SemanticMatchCandidateDto[]> {
    const rawQuery = dto?.query;
    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return [];
    }

    const query = rawQuery.trim();
    const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
    const minSimilarity = dto.minSimilarity !== undefined ? dto.minSimilarity : 0.2;

    // -------------------------------------------------------------
    // Step 1: Hard Constraints (Safety, Status, Blocking)
    // -------------------------------------------------------------
    const excludedUserIds = new Set<string>();
    if (currentUserId) {
      excludedUserIds.add(currentUserId);

      // Fetch blocks initiated and received
      const [blocksSent, blocksReceived] = await Promise.all([
        this.prisma.block.findMany({
          where: { blockerId: currentUserId },
          select: { blockedId: true },
        }),
        this.prisma.block.findMany({
          where: { blockedId: currentUserId },
          select: { blockerId: true },
        }),
      ]);

      blocksSent.forEach((b) => excludedUserIds.add(b.blockedId));
      blocksReceived.forEach((b) => excludedUserIds.add(b.blockerId));
    }

    // Retrieve active candidate student profiles
    const candidates = await this.prisma.profile.findMany({
      where: {
        user: {
          status: UserStatus.ACTIVE,
          ...(excludedUserIds.size > 0
            ? { id: { notIn: Array.from(excludedUserIds) } }
            : {}),
        },
      },
      include: {
        user: {
          include: {
            verification: {
              include: { college: true },
            },
          },
        },
        skills: {
          include: { skill: true },
        },
      },
    });

    if (candidates.length === 0) {
      return [];
    }

    // -------------------------------------------------------------
    // Step 2: Generate Query Embedding
    // -------------------------------------------------------------
    let queryVector = await this.getEmbedding(query);
    if (!queryVector) {
      // Fallback to local embedding provider
      queryVector = await this.localSemanticEmbeddingProvider.generateEmbedding(query);
    }

    if (!queryVector) {
      return [];
    }

    // -------------------------------------------------------------
    // Step 3: Embed Candidates & Calculate Cosine Similarity
    // -------------------------------------------------------------
    const scoredCandidates: SemanticMatchCandidateDto[] = [];

    for (const candidate of candidates) {
      const studentText = this.buildStudentRepresentation(candidate);
      let candidateVector = await this.getCachedOrGeneratedEmbedding(
        candidate.id,
        'USER_PROFILE',
        studentText,
      );

      if (!candidateVector) {
        // Fallback to local
        candidateVector = await this.localSemanticEmbeddingProvider.generateEmbedding(studentText);
      }

      if (!candidateVector) {
        continue;
      }

      const similarity = this.computeCosineSimilarity(queryVector, candidateVector);

      if (similarity >= minSimilarity) {
        const matchedSkills = this.extractMatchedSkills(query, candidate.skills);

        scoredCandidates.push({
          userId: candidate.userId,
          profileId: candidate.id,
          similarityScore: Number(similarity.toFixed(2)),
          matchedSkills,
          student: {
            name: candidate.user.name,
            approximateArea: candidate.approximateArea || null,
            collegeName: candidate.user.verification?.college?.name || null,
            isVerified: candidate.user.verification?.status === VerificationStatus.VERIFIED,
            bio: candidate.bio || null,
            skills: candidate.skills.map((s) => ({
              name: s.skill.name,
              level: s.level,
              isVerifiedSkill: s.isVerifiedSkill,
            })),
          },
        });
      }
    }

    // -------------------------------------------------------------
    // Step 4: Rank in descending order of similarity
    // -------------------------------------------------------------
    scoredCandidates.sort((a, b) => b.similarityScore - a.similarityScore);

    return scoredCandidates.slice(0, limit);
  }

  /**
   * Builds safe search representation of a student.
   * STRICT PRIVACY: Omits passwords, phones, emails, exact GPS buckets, and ID documents.
   */
  buildStudentRepresentation(candidate: any): string {
    const skillDescriptions = (candidate.skills || []).map((s: any) => {
      const levelStr = s.level ? `(${s.level.toLowerCase()})` : '';
      const categoryStr = s.skill?.category ? `in ${s.skill.category}` : '';
      return `${s.skill?.name || 'Skill'} ${levelStr} ${categoryStr}`.trim();
    });

    const parts: string[] = [];
    if (skillDescriptions.length > 0) {
      parts.push(`Skills: ${skillDescriptions.join(', ')}.`);
    }

    if (candidate.bio && typeof candidate.bio === 'string' && candidate.bio.trim()) {
      parts.push(`About: ${candidate.bio.trim()}`);
    }

    if (candidate.approximateArea) {
      parts.push(`Area: ${candidate.approximateArea}.`);
    }

    return parts.join(' ');
  }

  /**
   * Retrieves or computes candidate embedding, caching it in DB/cache.
   */
  private async getCachedOrGeneratedEmbedding(
    entityId: string,
    entityType: string,
    content: string,
  ): Promise<number[] | null> {
    try {
      if (this.prisma.embedding) {
        const cached = await this.prisma.embedding.findUnique({
          where: {
            entityType_entityId: {
              entityType,
              entityId,
            },
          },
        });

        if (cached && Array.isArray(cached.vector) && cached.vector.length > 0 && cached.content === content) {
          return cached.vector;
        }
      }
    } catch (err: any) {
      this.logger.debug(`Embedding cache read omitted: ${err.message}`);
    }

    // Generate new embedding
    let vector = await this.getEmbedding(content);
    if (!vector) {
      vector = await this.localSemanticEmbeddingProvider.generateEmbedding(content);
    }

    // Cache if DB available
    if (vector && this.prisma.embedding) {
      try {
        await this.prisma.embedding.upsert({
          where: {
            entityType_entityId: {
              entityType,
              entityId,
            },
          },
          create: {
            entityType,
            entityId,
            content,
            vector,
          },
          update: {
            content,
            vector,
          },
        });
      } catch (err: any) {
        this.logger.debug(`Embedding cache write omitted: ${err.message}`);
      }
    }

    return vector;
  }

  private async getEmbedding(text: string): Promise<number[] | null> {
    if (this.geminiEmbeddingProvider.isAvailable()) {
      try {
        const vec = await this.geminiEmbeddingProvider.generateEmbedding(text);
        if (vec) return vec;
      } catch (err: any) {
        this.logger.warn(`Gemini embedding failed: ${err.message}. Using local fallback.`);
      }
    }
    return this.localSemanticEmbeddingProvider.generateEmbedding(text);
  }

  async getQueryEmbedding(query: string): Promise<number[] | null> {
    let vec = await this.getEmbedding(query);
    if (!vec) {
      vec = await this.localSemanticEmbeddingProvider.generateEmbedding(query);
    }
    return vec;
  }

  async getCandidateEmbedding(candidateId: string, text: string): Promise<number[] | null> {
    let vec = await this.getCachedOrGeneratedEmbedding(candidateId, 'USER_PROFILE', text);
    if (!vec) {
      vec = await this.localSemanticEmbeddingProvider.generateEmbedding(text);
    }
    return vec;
  }

  /**
   * Computes cosine similarity between two numeric vectors.
   */
  computeCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    const similarity = dotProduct / denominator;
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Identifies candidate skills that match or relate to terms in the user query.
   */
  extractMatchedSkills(query: string, candidateSkills: any[]): string[] {
    const qLower = query.toLowerCase();
    const matched: string[] = [];

    const synonymsMap: Record<string, string[]> = {
      'machine learning': ['python', 'ml', 'data science', 'scikit-learn', 'scikit', 'deep learning', 'ai', 'tensorflow', 'pytorch'],
      'ml': ['machine learning', 'python', 'data science', 'scikit-learn', 'ai'],
      'data science': ['python', 'machine learning', 'ml', 'pandas', 'numpy', 'scikit-learn', 'sql'],
      'web': ['react', 'node.js', 'javascript', 'typescript', 'html', 'css', 'frontend'],
      'frontend': ['react', 'vue', 'javascript', 'typescript', 'tailwind', 'html', 'css', 'ui'],
      'backend': ['node.js', 'express', 'nestjs', 'python', 'django', 'fastapi', 'sql', 'postgresql', 'mongodb'],
      'mobile': ['flutter', 'react native', 'android', 'ios', 'kotlin', 'swift'],
      'design': ['figma', 'ui/ux', 'ui/ux design', 'graphic design', 'photoshop', 'illustrator'],
    };

    for (const item of candidateSkills || []) {
      const skillName = item.skill?.name;
      if (!skillName) continue;
      const sLower = skillName.toLowerCase();

      // Direct match
      if (qLower.includes(sLower) || sLower.includes(qLower)) {
        if (!matched.includes(skillName)) matched.push(skillName);
        continue;
      }

      // Synonym / cluster match
      for (const [key, relatedList] of Object.entries(synonymsMap)) {
        if (qLower.includes(key) && relatedList.includes(sLower)) {
          if (!matched.includes(skillName)) matched.push(skillName);
        }
      }
    }

    return matched;
  }
}
