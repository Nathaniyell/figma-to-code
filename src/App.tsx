import { useState, ChangeEvent, ClipboardEvent } from "react";

// Use a type-safe environment variable access
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;


function App() {
  const [figmaJson, setFigmaJson] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Helper function: Convert file to Base64 string
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // For the Vision API, we need the full data URL
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;

    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          try {
            setImageFile(file);
            // Create a preview URL for display
            const imageUrl = URL.createObjectURL(file);
            setImagePreview(imageUrl);
            setFigmaJson(""); // Clear the JSON input when image is pasted

          } catch (error) {
            console.error('Error processing pasted image:', error);
          }
        }
        break;
      }
    }
  };

  const convertFigmaToJSX = async () => {
    setLoading(true);
    setGeneratedCode("");

    if (imageFile) {
      try {
        const base64Image = await fileToBase64(imageFile);
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are an expert UI developer who converts UI designs into React components with Tailwind CSS. You analyze UI screenshots and generate pixel-perfect code."
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Convert this UI design into React JSX code with Tailwind CSS. Include all text content, styling, and layout exactly as shown. Make it responsive and use semantic HTML."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: base64Image,
                      detail: "high"
                    }
                  }
                ]
              }
            ],
            max_tokens: 4000,
            temperature: 0,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        console.log('API Response:', data); // For debugging

        if (data.choices && data.choices[0].message.content) {
          // Extract just the code from the response
          const content = data.choices[0].message.content;
          const codeMatch = content.match(/```(?:jsx|tsx)?\s*([\s\S]*?)```/);
          const cleanedCode = codeMatch ? codeMatch[1].trim() : content;
          setGeneratedCode(cleanedCode);
        } else {
          setGeneratedCode("Error: Could not generate code. Please check your input.");
        }
      } catch (error) {
        console.error('API Error:', error);
        setGeneratedCode(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      setLoading(false);
    } else if (figmaJson) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [{
              role: "user",
              content: `Create a React component with Tailwind CSS based on this Figma JSON. Return ONLY the JSX code without any explanation.\n\nFigma JSON:\n${figmaJson}`
            }],
            max_tokens: 4096,
            temperature: 0.1,
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
    } else {
      setGeneratedCode("Please provide either Figma JSON or upload a screenshot image.");
      setLoading(false);
    }
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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
      setFigmaJson(""); // Clear the JSON input when image is uploaded
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Figma to JSX Converter</h1>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Paste Figma JSON or Image:</label>
        {imagePreview ? (
          <div className="relative mb-2">
            <img
              src={imagePreview}
              alt="Pasted preview"
              className="max-w-full h-auto rounded border border-gray-300"
            />
            <button
              onClick={() => {
                setImagePreview(null);
                setImageFile(null);
              }}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
            >
              ✕
            </button>
          </div>
        ) : (
          <textarea
            className="w-full p-2 border border-gray-300 rounded"
            rows={6}
            placeholder="Paste your Figma JSON here or paste an image directly..."
            value={figmaJson}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFigmaJson(e.target.value)}
            onPaste={handlePaste}
          />
        )}
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
