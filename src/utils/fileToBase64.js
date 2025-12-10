export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.onload = () => {
            const result = String(reader.result || "");
            // data:<mime>;base64,<payload>
            const match = result.match(/^data:(.*?);base64,(.*)$/);
            if (!match) return reject(new Error("Unexpected data URL format"));
            const [, contentType, payload] = match;
            resolve({ filename: file.name, contentType, base64: payload });
        };
        reader.readAsDataURL(file);
    });
}