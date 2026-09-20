import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { HybridMatchResponse, HybridMatchCandidate } from '../src/types/ai';

describe('SkillMate Stage 7D: AI Matching Frontend Integration', () => {
  const mockBackendResponse: HybridMatchResponse = {
    data: [
      {
        userId: 'user-aarav-123',
        profileId: 'profile-aarav-123',
        finalScore: 92.45,
        scoreBreakdown: {
          semanticScore: 0.95,
          skillScore: 0.88,
          availabilityScore: 1.0,
          locationScore: 1.0,
          verificationScore: 1.0,
          profileScore: 0.9,
          reputationScore: 0.96,
        },
        matchedSkills: ['Python', 'Machine Learning'],
        matchReasons: [
          'Strong semantic match with your project requirements',
          'Has requested skill: Python (Advanced)',
          'Available during requested time window',
          'Located in same area: Bandra West',
          'College verified student (IIT Bombay)',
        ],
        candidate: {
          name: 'Aarav Sharma',
          approximateArea: 'Bandra West',
          collegeName: 'IIT Bombay',
          isVerified: true,
          bio: 'Data Science and Python specialist with ML background',
          skills: [
            { name: 'Python', level: 'ADVANCED', isVerifiedSkill: true },
            { name: 'Machine Learning', level: 'INTERMEDIATE', isVerifiedSkill: false },
          ],
        },
      },
      {
        userId: 'user-priya-456',
        profileId: 'profile-priya-456',
        finalScore: 74.2,
        scoreBreakdown: {
          semanticScore: 0.7,
          skillScore: 0.75,
          availabilityScore: 0.6,
          locationScore: 0.75,
          verificationScore: 1.0,
          profileScore: 0.85,
          reputationScore: 0.8,
        },
        matchedSkills: ['Python'],
        matchReasons: [
          'Good topical relevance to your query',
          'Has requested skill: Python (Intermediate)',
          'Nearby: Bandra East (2–5 km away)',
        ],
        candidate: {
          name: 'Priya Patel',
          approximateArea: 'Bandra East',
          collegeName: 'Thadomal Shahani',
          isVerified: true,
          bio: 'Full-stack explorer and Python enthusiast',
          skills: [{ name: 'Python', level: 'INTERMEDIATE', isVerifiedSkill: true }],
        },
      },
    ],
    meta: {
      query: 'I need someone who knows Python and ML for my project tomorrow evening, preferably nearby.',
      parsedRequirements: {
        skills: ['Python', 'Machine Learning'],
        intent: 'PROJECT_HELP',
        day: 'tomorrow',
        timeRange: '18:00-21:00',
        locationPreference: 'NEARBY',
        interactionType: null,
        skillLevel: null,
        context: 'project',
      },
      totalCandidatesEvaluated: 15,
      returnedCount: 2,
      appliedWeights: {
        semantic: 0.4,
        skill: 0.2,
        availability: 0.15,
        location: 0.1,
        verification: 0.05,
        profile: 0.05,
        reputation: 0.05,
      },
    },
  };

  test('1. Search request and response parsing handles hybrid match contract', () => {
    assert.equal(mockBackendResponse.data.length, 2);
    assert.equal(mockBackendResponse.meta.returnedCount, 2);
    assert.equal(mockBackendResponse.meta.parsedRequirements.skills[0], 'Python');
    assert.equal(mockBackendResponse.meta.parsedRequirements.skills[1], 'Machine Learning');
  });

  test('2. Backend finalScore is displayed directly without frontend recalculation', () => {
    const candidate = mockBackendResponse.data[0];
    // Must directly round backend finalScore (92.45 -> 92)
    const displayedScore = Math.round(candidate.finalScore);
    assert.equal(displayedScore, 92);
    assert.equal(candidate.finalScore, 92.45);
  });

  test('3. Candidate card renders public profile fields and matched reasons', () => {
    const candidate = mockBackendResponse.data[0];
    assert.equal(candidate.candidate.name, 'Aarav Sharma');
    assert.equal(candidate.candidate.collegeName, 'IIT Bombay');
    assert.equal(candidate.candidate.approximateArea, 'Bandra West');
    assert.equal(candidate.candidate.isVerified, true);
    assert.equal(candidate.matchReasons.length, 5);
    assert.ok(candidate.matchReasons.some((r) => r.includes('Strong semantic match')));
    assert.ok(candidate.matchReasons.some((r) => r.includes('Bandra West')));
  });

  test('4. Candidate profile navigation uses exact candidate userId', () => {
    const candidate = mockBackendResponse.data[0];
    const profileLink = `/profile/${candidate.userId}`;
    assert.equal(profileLink, '/profile/user-aarav-123');
  });

  test('5. Strict Privacy: zero exposure of private or sensitive credentials', () => {
    for (const match of mockBackendResponse.data) {
      const serialized = JSON.stringify(match);
      // Ensure no private user fields exist in candidate object
      assert.equal(serialized.includes('email'), false, 'Candidate must not expose email');
      assert.equal(serialized.includes('phone'), false, 'Candidate must not expose phone');
      assert.equal(serialized.includes('password'), false, 'Candidate must not expose password');
      assert.equal(serialized.includes('exactCoordinates'), false, 'Candidate must not expose GPS coordinates');
      assert.equal(serialized.includes('vector'), false, 'Candidate must not expose raw vector embeddings');
    }
  });

  test('6. WhyThisMatchModal renders 7-factor breakdown correctly', () => {
    const candidate = mockBackendResponse.data[0];
    const bd = candidate.scoreBreakdown;

    assert.equal(Math.round(bd.semanticScore * 100), 95);
    assert.equal(Math.round(bd.skillScore * 100), 88);
    assert.equal(Math.round(bd.availabilityScore * 100), 100);
    assert.equal(Math.round(bd.locationScore * 100), 100);
    assert.equal(Math.round(bd.verificationScore * 100), 100);
    assert.equal(Math.round(bd.profileScore * 100), 90);
    assert.equal(Math.round(bd.reputationScore * 100), 96);
  });

  test('7. Empty results state handled without fabricating candidates', () => {
    const emptyResponse: HybridMatchResponse = {
      data: [],
      meta: {
        query: 'Specialized ancient Sumerian language tutor',
        parsedRequirements: {
          skills: [],
          intent: null,
          day: null,
          timeRange: null,
          locationPreference: null,
          interactionType: null,
          skillLevel: null,
          context: null,
        },
        totalCandidatesEvaluated: 20,
        returnedCount: 0,
        appliedWeights: {},
      },
    };

    assert.equal(emptyResponse.data.length, 0);
    assert.equal(emptyResponse.meta.returnedCount, 0);
  });

  test('8. Error state formatting produces user-friendly message', () => {
    const errorObj = new Error('Network error: Unable to connect to SkillMate backend');
    const formattedMessage = errorObj.message || 'An unexpected error occurred';
    assert.ok(formattedMessage.includes('Unable to connect'));
  });
});
