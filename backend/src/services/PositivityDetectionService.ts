import { logger } from '../utils/logger';

/**
 * PositivityDetectionService - Detects positive/kind comments
 * Uses rule-based approach with keyword matching (fast, no API cost)
 */
export class PositivityDetectionService {
  // Positive keywords and emojis that indicate kindness
  private static readonly POSITIVE_KEYWORDS = [
    'love', 'great', 'awesome', 'beautiful', 'amazing', 'wonderful',
    'fantastic', 'excellent', 'nice', 'good', 'cool', 'thank', 'thanks',
    'appreciate', 'helpful', 'inspiring', 'motivating', 'gorgeous',
    'stunning', 'incredible', 'brilliant', 'perfect', 'lovely', 'sweet',
    'kind', 'thoughtful', 'caring', 'supportive', 'encouraging',
    '❤️', '😊', '🙌', '👏', '🎉', '💪', '✨', '🌟', '💙', '💚', '💛',
    '💜', '🧡', '❤', '💕', '💖', '💗', '💝', '😍', '🥰', '😘', '🤗',
    '👍', '🔥', '💯', '🙏'
  ];

  // Negative keywords that override positive detection
  private static readonly NEGATIVE_KEYWORDS = [
    'hate', 'ugly', 'stupid', 'bad', 'terrible', 'awful', 'horrible',
    'disgusting', 'trash', 'suck', 'worst', 'idiot', 'dumb', 'pathetic',
    'loser', 'annoying', 'boring', 'lame', 'weak', 'fail'
  ];

  /**
   * Detect if comment is positive/kind
   * Returns true if positive, false otherwise
   *
   * Criteria:
   * - At least 10 characters long
   * - Contains positive keywords or emojis
   * - Does NOT contain negative keywords
   */
  static isPositiveComment(commentText: string): boolean {
    try {
      // Minimum length check
      if (!commentText || commentText.trim().length < 10) {
        return false;
      }

      const lowerComment = commentText.toLowerCase();

      // Check for negative keywords (disqualifies the comment)
      const hasNegativeWords = this.NEGATIVE_KEYWORDS.some(word =>
        lowerComment.includes(word)
      );

      if (hasNegativeWords) {
        return false;
      }

      // Check for positive keywords or emojis
      const hasPositiveWords = this.POSITIVE_KEYWORDS.some(word =>
        commentText.includes(word) || lowerComment.includes(word)
      );

      logger.debug('Positivity check', {
        commentLength: commentText.length,
        hasPositiveWords,
        hasNegativeWords,
        result: hasPositiveWords && !hasNegativeWords
      });

      return hasPositiveWords && !hasNegativeWords;

    } catch (error) {
      logger.error('Error in positivity detection', { error, commentText });
      return false; // Default to false on error
    }
  }

  /**
   * Get positivity score (0-100)
   * Can be used for future enhancements
   */
  static getPositivityScore(commentText: string): number {
    if (!commentText || commentText.trim().length < 10) {
      return 0;
    }

    const lowerComment = commentText.toLowerCase();

    // Count positive words
    const positiveCount = this.POSITIVE_KEYWORDS.filter(word =>
      commentText.includes(word) || lowerComment.includes(word)
    ).length;

    // Count negative words
    const negativeCount = this.NEGATIVE_KEYWORDS.filter(word =>
      lowerComment.includes(word)
    ).length;

    // If any negative words, score is 0
    if (negativeCount > 0) {
      return 0;
    }

    // Score based on positive word count (capped at 100)
    const score = Math.min(100, positiveCount * 20);

    return score;
  }
}

export default PositivityDetectionService;
