import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisReport, GroundingSource, RiskLevel, ConfidenceLevel } from "../types";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

async function getGeoLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) return null;
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

export async function analyzeWaterImage(file: File, context: string): Promise<{ report: AnalysisReport; sources: GroundingSource[] }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;
  const location = await getGeoLocation();

  const prompt = `
    Act as a World-Class Environmental Systems Architect and Forensic Scientist. 
    Perform a production-grade environmental intelligence audit of this surface water sample.

    CONTEXTUAL GUIDANCE:
    ${context ? `Site Metadata: ${context}` : 'No metadata provided.'}
    Geolocation: ${location ? `Lat ${location.latitude}, Lng ${location.longitude}` : 'Unknown.'}

    YOUR ANALYSIS MUST INCLUDE:
    1. **AQUA-IMPACT SCORE™ (AIS)**: A standardized 0–100 score. 
       Formula components: Severity (0-40), Visible Area (0-20), Ecosystem Sensitivity (0-20), Human Risk (0-20).
    2. **Optical Diagnostics**: Explicitly separate what IS visibly detected vs. what is INVISIBLE but suspected.
    3. **Action Intelligence**: Clear directives (Monitor/Escalate/Contain).
    4. **Biological Reasoning**: Quantitative estimation of ecological stress.

    OUTPUT FORMAT: Strictly valid JSON.
    {
      "detectedOptics": ["e.g., Iridescent oil sheen", "High turbidity"],
      "nonDetectableOptics": ["e.g., Heavy metals", "PFAS", "Dissolved nitrates"],
      "aquaImpactScore": number,
      "scoreBreakdown": {
        "opticalSeverity": number,
        "visibleArea": number,
        "ecosystemSensitivity": number,
        "humanProximity": number
      },
      "scoreExplanation": "string",
      "likelyPollutionCategory": "string",
      "environmentalImpactExplanation": "string",
      "humanHealthImplications": "string",
      "environmentalRiskLevel": "Low" | "Moderate" | "High" | "Critical",
      "riskJustification": "string",
      "actionIntelligence": {
        "recommendedAction": "Monitor" | "Escalate" | "Contain",
        "notificationTargets": ["string"],
        "followUpEvidence": ["string"],
        "labValidationAdvisory": "string"
      },
      "confidencePercentage": number,
      "confidenceLevel": "Low" | "Moderate" | "High",
      "assessmentLimitations": ["string"]
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      tools: [{ googleSearch: {} }, { googleMaps: {} }],
      ...(location && {
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: location.latitude, longitude: location.longitude }
          }
        }
      })
    }
  });

  const text = response.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Scientific synthesis failed. Data quality insufficient.");
  const report: AnalysisReport = JSON.parse(jsonMatch[0]);
  
  const sources: GroundingSource[] = [];
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  for (const chunk of groundingChunks) {
    if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
    else if (chunk.maps) sources.push({ title: chunk.maps.title, uri: chunk.maps.uri });
  }

  return { report, sources };
}

export async function generateAudioReport(report: AnalysisReport): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    AQUA-TRACE Command Briefing:
    Impact Analysis complete. AIS Score: ${report.aquaImpactScore}/100.
    Classification: ${report.likelyPollutionCategory}.
    Severity: ${report.environmentalRiskLevel}.
    Recommended Action: ${report.actionIntelligence.recommendedAction}.
    Briefly explain the risk: ${report.riskJustification}.
    Field Officer Directive: ${report.actionIntelligence.labValidationAdvisory}.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio synthesis failed.");
  return base64Audio;
}
