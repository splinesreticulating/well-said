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
    const input = `Summary: The summary.

Suggested replies:
Reply 1: Reply 1
Reply 2: Reply 2
Reply 3: Reply 3`;
    
    const expected = "The summary.";
    
    expect(parseSummaryToHumanReadable(input)).toBe(expected);
  });
});
