/**
 * Tests for SkeletonLoader.tsx components
 * Tests for SkeletonLoader, SkeletonCard, and SkeletonRankingItem components
 */

import React from 'react';

// Mock Animated before importing component
const mockAnimatedValue = {
  setValue: jest.fn(),
  interpolate: jest.fn(),
};

const mockLoop = jest.fn().mockReturnValue({
  start: jest.fn(),
  stop: jest.fn(),
});

const mockSequence = jest.fn().mockReturnValue({});
const mockTiming = jest.fn().mockReturnValue({});

jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Animated: {
    View: 'Animated.View',
    Value: jest.fn().mockImplementation(() => mockAnimatedValue),
    loop: mockLoop,
    sequence: mockSequence,
    timing: mockTiming,
  },
}));

describe('SkeletonLoader Components', () => {
  let SkeletonLoader: any;
  let SkeletonCard: any;
  let SkeletonRankingItem: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    const components = require('../src/components/SkeletonLoader');
    SkeletonLoader = components.SkeletonLoader;
    SkeletonCard = components.SkeletonCard;
    SkeletonRankingItem = components.SkeletonRankingItem;
  });

  describe('SkeletonLoader', () => {
    test('is exported and is a function', () => {
      expect(SkeletonLoader).toBeDefined();
      expect(typeof SkeletonLoader).toBe('function');
    });

    test('renders an Animated.View', () => {
      const result = SkeletonLoader({});
      expect(result).not.toBeNull();
      expect(result.type).toBe('Animated.View');
    });

    test('uses default props when no props provided', () => {
      const result = SkeletonLoader({});
      const styleArray = result.props.style;

      // Check for default values in the style
      const inlineStyle = styleArray.find(
        (s: any) => s && typeof s === 'object' && 'width' in s
      );

      expect(inlineStyle.width).toBe('100%');
      expect(inlineStyle.height).toBe(20);
      expect(inlineStyle.borderRadius).toBe(4);
    });

    test('applies custom width prop', () => {
      const result = SkeletonLoader({ width: 200 });
      const styleArray = result.props.style;

      const inlineStyle = styleArray.find(
        (s: any) => s && typeof s === 'object' && 'width' in s
      );

      expect(inlineStyle.width).toBe(200);
    });

    test('applies percentage width prop', () => {
      const result = SkeletonLoader({ width: '50%' });
      const styleArray = result.props.style;

      const inlineStyle = styleArray.find(
        (s: any) => s && typeof s === 'object' && 'width' in s
      );

      expect(inlineStyle.width).toBe('50%');
    });

    test('applies custom height prop', () => {
      const result = SkeletonLoader({ height: 100 });
      const styleArray = result.props.style;

      const inlineStyle = styleArray.find(
        (s: any) => s && typeof s === 'object' && 'height' in s
      );

      expect(inlineStyle.height).toBe(100);
    });

    test('applies custom borderRadius prop', () => {
      const result = SkeletonLoader({ borderRadius: 25 });
      const styleArray = result.props.style;

      const inlineStyle = styleArray.find(
        (s: any) => s && typeof s === 'object' && 'borderRadius' in s
      );

      expect(inlineStyle.borderRadius).toBe(25);
    });

    test('applies custom style prop', () => {
      const customStyle = { marginBottom: 10, marginTop: 5 };
      const result = SkeletonLoader({ style: customStyle });
      const styleArray = result.props.style;

      expect(styleArray).toContainEqual(customStyle);
    });

    test('includes skeleton base style', () => {
      const result = SkeletonLoader({});
      const styleArray = result.props.style;

      // First item should be the skeleton base style
      expect(styleArray[0]).toEqual(
        expect.objectContaining({
          backgroundColor: '#333',
        })
      );
    });

    test('combines all style props correctly', () => {
      const customStyle = { marginLeft: 8 };
      const result = SkeletonLoader({
        width: 150,
        height: 50,
        borderRadius: 10,
        style: customStyle,
      });
      const styleArray = result.props.style;

      // Should have base skeleton style, inline styles, and custom style
      expect(styleArray).toHaveLength(4);
      expect(styleArray[0]).toEqual({ backgroundColor: '#333' });
      expect(styleArray[1]).toEqual({
        width: 150,
        height: 50,
        borderRadius: 10,
        opacity: mockAnimatedValue,
      });
      expect(styleArray[2]).toEqual(customStyle);
    });

    test('starts animation on mount', () => {
      // The animation should be started via Animated.loop().start()
      SkeletonLoader({});

      expect(mockSequence).toHaveBeenCalled();
      expect(mockLoop).toHaveBeenCalled();
    });

    test('animation uses correct timing values', () => {
      SkeletonLoader({});

      // Verify timing was called with correct parameters
      expect(mockTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        })
      );

      expect(mockTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        })
      );
    });
  });

  describe('SkeletonCard', () => {
    test('is exported and is a function', () => {
      expect(SkeletonCard).toBeDefined();
      expect(typeof SkeletonCard).toBe('function');
    });

    test('renders a View container', () => {
      const result = SkeletonCard();
      expect(result).not.toBeNull();
      expect(result.type).toBe('View');
    });

    test('applies card style to container', () => {
      const result = SkeletonCard();

      expect(result.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          marginHorizontal: 15,
        })
      );
    });

    test('contains a card row View', () => {
      const result = SkeletonCard();
      const cardRow = result.props.children;

      expect(cardRow.type).toBe('View');
      expect(cardRow.props.style).toEqual(
        expect.objectContaining({
          flexDirection: 'row',
          alignItems: 'center',
        })
      );
    });

    test('contains circular avatar skeleton', () => {
      const result = SkeletonCard();
      const cardRow = result.props.children;
      const avatarSkeleton = cardRow.props.children[0];

      expect(avatarSkeleton.type).toBe('Animated.View');

      const inlineStyle = avatarSkeleton.props.style.find(
        (s: any) => s && typeof s === 'object' && 'width' in s
      );

      expect(inlineStyle.width).toBe(50);
      expect(inlineStyle.height).toBe(50);
      expect(inlineStyle.borderRadius).toBe(25);
    });

    test('contains content area with two skeleton lines', () => {
      const result = SkeletonCard();
      const cardRow = result.props.children;
      const contentArea = cardRow.props.children[1];

      expect(contentArea.type).toBe('View');
      expect(contentArea.props.style).toEqual(
        expect.objectContaining({
          flex: 1,
          marginLeft: 12,
        })
      );

      // Should have two children (title and subtitle skeletons)
      expect(contentArea.props.children).toHaveLength(2);
    });

    test('renders title skeleton with correct dimensions', () => {
      const result = SkeletonCard();
      const cardRow = result.props.children;
      const contentArea = cardRow.props.children[1];
      const titleSkeleton = contentArea.props.children[0];

      expect(titleSkeleton.type).toBe('Animated.View');

      const inlineStyle = titleSkeleton.props.style.find(
        (s: any) => s && typeof s === 'object' && 'width' in s
      );

      expect(inlineStyle.width).toBe('60%');
      expect(inlineStyle.height).toBe(18);
    });

    test('renders subtitle skeleton with correct dimensions', () => {
      const result = SkeletonCard();
      const cardRow = result.props.children;
      const contentArea = cardRow.props.children[1];
      const subtitleSkeleton = contentArea.props.children[1];

      expect(subtitleSkeleton.type).toBe('Animated.View');

      const inlineStyle = subtitleSkeleton.props.style.find(
        (s: any) => s && typeof s === 'object' && 'width' in s
      );

      expect(inlineStyle.width).toBe('40%');
      expect(inlineStyle.height).toBe(14);
    });

    test('title skeleton has margin bottom for spacing', () => {
      const result = SkeletonCard();
      const cardRow = result.props.children;
      const contentArea = cardRow.props.children[1];
      const titleSkeleton = contentArea.props.children[0];

      // Custom style should be applied
      expect(titleSkeleton.props.style).toContainEqual({ marginBottom: 8 });
    });
  });

  describe('SkeletonRankingItem', () => {
    test('is exported and is a function', () => {
      expect(SkeletonRankingItem).toBeDefined();
      expect(typeof SkeletonRankingItem).toBe('function');
    });

    test('renders a View container', () => {
      const result = SkeletonRankingItem();
      expect(result).not.toBeNull();
      expect(result.type).toBe('View');
    });

    test('applies ranking item style to container', () => {
      const result = SkeletonRankingItem();

      expect(result.props.style).toEqual(
        expect.objectContaining({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          padding: 15,
          marginBottom: 10,
          marginHorizontal: 15,
        })
      );
    });

    test('contains three children elements', () => {
      const result = SkeletonRankingItem();
      const children = result.props.children;

      expect(children).toHaveLength(3);
    });

    test('contains left circular skeleton (profile image)', () => {
      const result = SkeletonRankingItem();
      const leftSkeleton = result.props.children[0];

      expect(leftSkeleton.type).toBe('Animated.View');

      const inlineStyle = leftSkeleton.props.style.find(
        (s: any) => s && typeof s === 'object' && 'width' in s
      );

      expect(inlineStyle.width).toBe(40);
      expect(inlineStyle.height).toBe(40);
      expect(inlineStyle.borderRadius).toBe(20);
    });

    test('contains content area with text skeletons', () => {
      const result = SkeletonRankingItem();
      const contentArea = result.props.children[1];

      expect(contentArea.type).toBe('View');
      expect(contentArea.props.style).toEqual(
        expect.objectContaining({
          flex: 1,
          marginLeft: 15,
        })
      );

      // Should have two children (name and subtitle skeletons)
      expect(contentArea.props.children).toHaveLength(2);
    });

    test('renders name skeleton with correct dimensions', () => {
      const result = SkeletonRankingItem();
      const contentArea = result.props.children[1];
      const nameSkeleton = contentArea.props.children[0];

      expect(nameSkeleton.type).toBe('Animated.View');

      const inlineStyle = nameSkeleton.props.style.find(
        (s: any) => s && typeof s === 'object' && 'width' in s
      );

      expect(inlineStyle.width).toBe('50%');
      expect(inlineStyle.height).toBe(16);
    });

    test('name skeleton has margin bottom for spacing', () => {
      const result = SkeletonRankingItem();
      const contentArea = result.props.children[1];
      const nameSkeleton = contentArea.props.children[0];

      expect(nameSkeleton.props.style).toContainEqual({ marginBottom: 6 });
    });

    test('renders subtitle skeleton with correct dimensions', () => {
      const result = SkeletonRankingItem();
      const contentArea = result.props.children[1];
      const subtitleSkeleton = contentArea.props.children[1];

      expect(subtitleSkeleton.type).toBe('Animated.View');

      const inlineStyle = subtitleSkeleton.props.style.find(
        (s: any) => s && typeof s === 'object' && 'width' in s
      );

      expect(inlineStyle.width).toBe('30%');
      expect(inlineStyle.height).toBe(12);
    });

    test('contains right rounded skeleton (score/badge)', () => {
      const result = SkeletonRankingItem();
      const rightSkeleton = result.props.children[2];

      expect(rightSkeleton.type).toBe('Animated.View');

      const inlineStyle = rightSkeleton.props.style.find(
        (s: any) => s && typeof s === 'object' && 'width' in s
      );

      expect(inlineStyle.width).toBe(40);
      expect(inlineStyle.height).toBe(40);
      expect(inlineStyle.borderRadius).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    test('SkeletonLoader handles zero width', () => {
      const result = SkeletonLoader({ width: 0 });
      const styleArray = result.props.style;

      const inlineStyle = styleArray.find(
        (s: any) => s && typeof s === 'object' && 'width' in s
      );

      expect(inlineStyle.width).toBe(0);
    });

    test('SkeletonLoader handles zero height', () => {
      const result = SkeletonLoader({ height: 0 });
      const styleArray = result.props.style;

      const inlineStyle = styleArray.find(
        (s: any) => s && typeof s === 'object' && 'height' in s
      );

      expect(inlineStyle.height).toBe(0);
    });

    test('SkeletonLoader handles zero borderRadius', () => {
      const result = SkeletonLoader({ borderRadius: 0 });
      const styleArray = result.props.style;

      const inlineStyle = styleArray.find(
        (s: any) => s && typeof s === 'object' && 'borderRadius' in s
      );

      expect(inlineStyle.borderRadius).toBe(0);
    });

    test('SkeletonLoader handles empty style object', () => {
      const result = SkeletonLoader({ style: {} });
      const styleArray = result.props.style;

      expect(styleArray).toContainEqual({});
    });

    test('SkeletonLoader handles large dimensions', () => {
      const result = SkeletonLoader({ width: 9999, height: 9999 });
      const styleArray = result.props.style;

      const inlineStyle = styleArray.find(
        (s: any) => s && typeof s === 'object' && 'width' in s
      );

      expect(inlineStyle.width).toBe(9999);
      expect(inlineStyle.height).toBe(9999);
    });

    test('SkeletonLoader handles various percentage widths', () => {
      const percentages = ['10%', '25%', '75%', '100%'];

      percentages.forEach((percentage) => {
        const result = SkeletonLoader({ width: percentage });
        const styleArray = result.props.style;

        const inlineStyle = styleArray.find(
          (s: any) => s && typeof s === 'object' && 'width' in s
        );

        expect(inlineStyle.width).toBe(percentage);
      });
    });

    test('SkeletonCard maintains structure integrity', () => {
      const result = SkeletonCard();

      // Verify nested structure
      expect(result.type).toBe('View');
      expect(result.props.children.type).toBe('View');
      expect(result.props.children.props.children).toHaveLength(2);
    });

    test('SkeletonRankingItem maintains structure integrity', () => {
      const result = SkeletonRankingItem();

      // Verify nested structure
      expect(result.type).toBe('View');
      expect(result.props.children).toHaveLength(3);
    });

    test('multiple SkeletonLoader instances have independent animations', () => {
      // Clear mocks before test
      jest.clearAllMocks();

      // Render multiple instances
      SkeletonLoader({});
      SkeletonLoader({});
      SkeletonLoader({});

      // Each should create its own animation loop
      expect(mockLoop).toHaveBeenCalledTimes(3);
    });
  });

  describe('Style Consistency', () => {
    test('all skeletons use the same background color', () => {
      const loaderResult = SkeletonLoader({});
      const cardResult = SkeletonCard();
      const rankingResult = SkeletonRankingItem();

      // All should have skeleton base style with same background
      const loaderBaseStyle = loaderResult.props.style[0];
      expect(loaderBaseStyle.backgroundColor).toBe('#333');

      // Card's avatar skeleton
      const cardAvatar = cardResult.props.children.props.children[0];
      const cardAvatarBaseStyle = cardAvatar.props.style[0];
      expect(cardAvatarBaseStyle.backgroundColor).toBe('#333');

      // Ranking's profile skeleton
      const rankingProfile = rankingResult.props.children[0];
      const rankingProfileBaseStyle = rankingProfile.props.style[0];
      expect(rankingProfileBaseStyle.backgroundColor).toBe('#333');
    });

    test('card and ranking item use same semi-transparent background', () => {
      const cardResult = SkeletonCard();
      const rankingResult = SkeletonRankingItem();

      expect(cardResult.props.style.backgroundColor).toBe(
        'rgba(255,255,255,0.05)'
      );
      expect(rankingResult.props.style.backgroundColor).toBe(
        'rgba(255,255,255,0.05)'
      );
    });

    test('card and ranking item use same border radius', () => {
      const cardResult = SkeletonCard();
      const rankingResult = SkeletonRankingItem();

      expect(cardResult.props.style.borderRadius).toBe(12);
      expect(rankingResult.props.style.borderRadius).toBe(12);
    });

    test('card and ranking item use same horizontal margin', () => {
      const cardResult = SkeletonCard();
      const rankingResult = SkeletonRankingItem();

      expect(cardResult.props.style.marginHorizontal).toBe(15);
      expect(rankingResult.props.style.marginHorizontal).toBe(15);
    });
  });

  describe('Animation Configuration', () => {
    test('animation sequence contains two timing animations', () => {
      SkeletonLoader({});

      // Verify sequence was called with array of timing animations
      expect(mockSequence).toHaveBeenCalledWith([
        expect.anything(), // First timing animation (opacity 0.3 -> 0.6)
        expect.anything(), // Second timing animation (opacity 0.6 -> 0.3)
      ]);
    });

    test('animation uses native driver for performance', () => {
      SkeletonLoader({});

      // Both timing calls should use native driver
      const calls = mockTiming.mock.calls;

      calls.forEach((call) => {
        expect(call[1].useNativeDriver).toBe(true);
      });
    });

    test('animation loops infinitely', () => {
      SkeletonLoader({});

      // Verify loop was called with the sequence
      expect(mockLoop).toHaveBeenCalled();
    });
  });
});
