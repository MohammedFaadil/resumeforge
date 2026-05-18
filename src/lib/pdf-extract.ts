const pdf = require('pdf-parse');

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    let text = data.text;

    // Clean up pdf-parse artifacts so the AI doesn't penalize formatting
    text = text
      // Replace multiple spaces with a single space
      .replace(/ {2,}/g, ' ')
      // Ensure bullet points have a space after them
      .replace(/•([A-Za-z])/g, '• $1')
      // Normalize multiple newlines into max two newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace on each line
      .split('\n').map((line: string) => line.trim()).join('\n');

    return text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}
