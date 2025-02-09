import { useState, ChangeEvent } from "react";

// Use a type-safe environment variable access
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// interface FileReaderEvent extends ProgressEvent {
//   target: (EventTarget & { result: string }) | null;
// }

function App() {
  const [figmaJson, setFigmaJson] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Helper function: Convert file to Base64 string
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const convertFigmaToJSX = async () => {
    setLoading(true);
    setGeneratedCode("");

    let prompt = "";

    if (imageFile) {
      // If an image is uploaded, convert it to Base64 and include it in the prompt.
      try {
        const base64Image = await fileToBase64(imageFile);
        prompt = `
You are an expert converter that transforms an image screenshot of a Figma component into a fully functional React JSX component styled with Tailwind CSS.
Analyze the design from the image below (provided as a base64 encoded string) and output only the React JSX code. Do not include any explanation.

Image (base64):
${base64Image}
        `.trim();
      } catch (error) {
        setGeneratedCode(`Error processing image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
        return;
      }
    } else if (figmaJson) {
      // If Figma JSON is provided, include it in the prompt.
      prompt = `
You are an expert converter that transforms Figma design JSON into a fully functional React JSX component styled with Tailwind CSS.
Generate only the code based on the Figma JSON below. Do not include any additional explanation.

Figma JSON:
${figmaJson}
      `.trim();
    } else {
      setGeneratedCode("Please provide either Figma JSON or upload a screenshot image.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4", // Use "gpt-3.5-turbo" if needed.
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1500,
          temperature: 0,
        }),
      });

      const data = await response.json();
      if (data.choices && data.choices[0].message.content) {
        setGeneratedCode(data.choices[0].message.content);
      } else {
        setGeneratedCode("Error: Could not generate code. Please check your input.");
      }
    } catch (error) {
      setGeneratedCode(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setLoading(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      alert("Copied to clipboard!");
    } catch (_err) {
      console.error("Failed to copy text:", _err);
      alert("Failed to copy!");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Figma to JSX Converter</h1>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Paste Figma JSON:</label>
        <textarea
          className="w-full p-2 border border-gray-300 rounded"
          rows={6}
          placeholder="Paste your Figma JSON here..."
          value={figmaJson}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFigmaJson(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Or Upload a Screenshot Image:</label>
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </div>

      <div className="flex space-x-4 mb-4">
        <button
          onClick={convertFigmaToJSX}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? "Converting..." : "Convert"}
        </button>
        <button
          onClick={copyToClipboard}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          disabled={!generatedCode}
        >
          Copy
        </button>
      </div>

      <pre className="bg-gray-100 p-4 rounded border border-gray-200 whitespace-pre-wrap">
        {generatedCode || "Your generated JSX code will appear here."}
      </pre>
    </div>
  );
}

export default App;
