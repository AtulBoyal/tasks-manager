import { describe, it, expect } from 'vitest';
import { generateAutoTags } from '../../utils/tagEngine';

describe('generateAutoTags', () => {

  it('adds coding tag for coding tasks', () => {
    const result = generateAutoTags(
      'Solve Leetcode problems',
      []
    );

    expect(result).toContain('cp');
  });

  it('keeps existing tags', () => {
    const result = generateAutoTags(
      'Workout today',
      ['health']
    );

    expect(result).toContain('health');
  });

  it('does not duplicate tags', () => {
    const result = generateAutoTags(
      'Coding practice',
      ['coding']
    );

    const codingTags = result.filter(
      tag => tag === 'coding'
    );

    expect(codingTags.length).toBe(1);
  });
});