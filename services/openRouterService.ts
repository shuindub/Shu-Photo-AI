
export const analyzeImageOpenRouter = async (
    apiKey: string,
    base64Image: string,
    prompt: string,
    model: string
): Promise<string> => {
    if (!apiKey) {
        throw new Error("OpenRouter API Key is missing. Please add it in the BackRoom settings.");
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.origin, // Optional, for including your app on openrouter.ai rankings.
                "X-Title": "Shu Photo AI",
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: prompt
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `OpenRouter Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "No response text from OpenRouter model.";

    } catch (error) {
        console.error("OpenRouter Analysis Failed:", error);
        throw error;
    }
};
