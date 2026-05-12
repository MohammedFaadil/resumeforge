export async function compileLatexToPdf(latexSource: string): Promise<Buffer> {
  try {
    const formData = new FormData();
    formData.append('filecontents[]', latexSource);
    formData.append('filename[]', 'document.tex');
    formData.append('engine', 'pdflatex');
    formData.append('return', 'pdf');

    const response = await fetch('https://texlive.net/cgi-bin/latexcgi', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok || response.headers.get('content-type') !== 'application/pdf') {
      const text = await response.text();
      console.error("LaTeX compilation error log:", text);
      throw new Error("Failed to compile LaTeX to PDF. TeX Error.");
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("compileLatexToPdf error:", error);
    throw new Error("LaTeX compilation service failed");
  }
}
