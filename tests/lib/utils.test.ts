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
});
