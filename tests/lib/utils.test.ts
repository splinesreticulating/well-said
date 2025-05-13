import { parseSummaryToHumanReadable } from '../../src/lib/utils';

describe('parseSummaryToHumanReadable', () => {
  // Silence console.debug during tests
  beforeAll(() => {
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should extract summary when it is on the same line', () => {
    expect(parseSummaryToHumanReadable("Summary: The story so far.")).toBe("The story so far.")
  });

  test('should extract summary when it is on the next line', () => {
    expect(parseSummaryToHumanReadable("Summary:\nThe story so far.")).toBe("The story so far.")
  });

  test('should extract summary when it is on the next next line', () => {
    expect(parseSummaryToHumanReadable("Summary:\n\nThe story so far.")).toBe("The story so far.")
  });

  test('should return raw output when no summary marker is present', () => {
    expect(parseSummaryToHumanReadable("No summary marker present")).toBe("No summary marker present")
  });

  test('should extract only summary part when input contains both Summary and Suggested replies sections', () => {
    const input = `Summary: The conversation is a mix of frustration, gratitude, and shared responsibilities. Your partner expresses dissatisfaction with their current living situation, feeling more like they have a roommate than a partner, and the added stress of the roommate not being COVID-safe. They also mention financial strain and a desire for a partner who can provide for them. They express gratitude for your help with household chores and seem to appreciate your understanding and support. They also mention meeting someone named Henry at the park.

Suggested replies:
Reply 1: I understand how tough it is right now, and I'm here for you. We'll get through this together. And how was meeting Henry at the park?
Reply 2: I'm glad I could help with the dishes. Let's continue to find ways to make our home more comfortable and safe. By the way, how did it go with Henry at the park?
Reply 3: I'm sorry you're feeling this way. I'm doing my best to support us during this tough time. Let's keep communicating about our needs and how we can meet them. Also, tell me more about running into Henry.`;
    
    const expected = "The conversation is a mix of frustration, gratitude, and shared responsibilities. Your partner expresses dissatisfaction with their current living situation, feeling more like they have a roommate than a partner, and the added stress of the roommate not being COVID-safe. They also mention financial strain and a desire for a partner who can provide for them. They express gratitude for your help with household chores and seem to appreciate your understanding and support. They also mention meeting someone named Henry at the park.";
    
    expect(parseSummaryToHumanReadable(input)).toBe(expected);
  });
});
