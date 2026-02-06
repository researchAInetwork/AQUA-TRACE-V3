import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisReport, GroundingSource, RiskLevel, ConfidenceLevel, TimeSensitivity } from "../types";

const SYSTEM_DISCLAIMER = "AQUA-TRACE provides probabilistic, optical-based environmental intelligence for prioritization and early warning. Outputs are non-prescriptive and must be validated through laboratory and field investigation before regulatory or remediation action.";

const MOCK_REPORTS: AnalysisReport[] = [
  {
    detectedOptics: ["Iridescent hydrocarbon sheen", "Surface film stratification", "Dark plume at discharge point"],
    nonDetectableOptics: ["Dissolved benzene/toluene", "Polycyclic Aromatic Hydrocarbons (PAHs)", "Heavy metals (Lead/Mercury)"],
    aquaImpactScore: 78,
    comparativeIntelligence: "AIS 78 indicates higher projected impact than approximately 92% of comparable surface-water observations in our reference dataset.",
    timeSensitivity: TimeSensitivity.IMMEDIATE_VERIFICATION,
    plainLanguageSummary: "This water body shows strong visual indicators consistent with a petroleum-based discharge. If confirmed, this event may pose a significant threat to aquatic ecosystems and downstream water quality.",
    scoreBreakdown: {
      opticalSeverity: 32,
      visibleArea: 14,
      ecosystemSensitivity: 18,
      humanProximity: 14
    },
    scoreExplanation: "Visual markers suggest a fresh release of light refined oils. The observed iridescence correlates with established optical thickness charts for hydrocarbon films.",
    likelyPollutionCategory: "Petrochemical Discharge (Inferred)",
    environmentalImpactExplanation: "Oil films may inhibit atmospheric gas exchange, potentially leading to localized hypoxia. Direct coating of waterfowl is a high-probability risk if left uncontained.",
    humanHealthImplications: "Potential inhalation risk of volatile compounds for nearby residents. Avoid direct contact pending chemical verification.",
    environmentalRiskLevel: RiskLevel.HIGH,
    riskJustification: "The classification is driven by the presence of a continuous 'rainbow' sheen pattern. High urgency is suggested due to proximity to sensitive wetlands.",
    actionIntelligence: {
      recommendedAction: "Escalate",
      notificationTargets: ["Coast Guard Sector Command", "Regional EPA Emergency Response", "Downstream Municipal Intakes"],
      followUpEvidence: [
        "Upstream forensic photo-documentation of storm drains within 2km.",
        "Shoreline oiling intensity mapping (SCAT method).",
        "Verification of sheen thickness using standard ASTM visual guides."
      ],
      labValidationAdvisory: "Evaluation via EPA Method 1664 (Oil & Grease) and EPA Method 8260 (VOC/BTEX) is suggested for definitive assessment.",
      remediationStrategy: [
        "Deployment of containment booms may be considered to capture surface sheens.",
        "Hydrophobic sorbent pads are suggested for spot recovery in low-flow areas.",
        "Continuous monitoring of dissolved oxygen is recommended."
      ]
    },
    confidencePercentage: 92,
    confidenceLevel: ConfidenceLevel.HIGH,
    confidenceFactors: ["High optical clarity", "Multiple point source triangulation", "Strong spectral iridescence"],
    assessmentLimitations: ["Sub-surface mass cannot be quantified via optics", "Molecular weight requires laboratory chromatography"],
    systemAdvisory: SYSTEM_DISCLAIMER,
    sourceMode: 'Demo'
  }
];

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

export async function analyzeWaterImage(file: File, context: string, granularity: 'Standard' | 'Expert'): Promise<{ report: AnalysisReport; sources: GroundingSource[]; mode: 'Live' | 'Demo' }> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = await fileToBase64(file);
    const mimeType = file.type;
    const isExpert = granularity === 'Expert';

    const prompt = `
      Act as a World-Class Environmental Systems Architect and Forensic Scientist. 
      Perform a probabilistic environmental intelligence audit of this surface water sample.

      ANALYSIS MODE: ${granularity}
      ${isExpert ? 'FOCUS: Deep forensic reasoning and chemical pathway analysis.' : 'FOCUS: Rapid field triage and safety protocols.'}

      ENVIRONMENTAL CONTEXT:
      ${context ? `Site Metadata: ${context}` : 'No metadata provided.'}

      PROMPT PROTOCOL:
      - Use conditional language ("may indicate", "suggests", "possible").
      - Prioritize risk prioritization over definitive diagnosis.
      - Explicitly state that visual evidence requires laboratory confirmation.
    `;

    // Using gemini-3-pro-preview for advanced multimodal reasoning with search grounding.
    // We use responseSchema for structured output when combined with googleSearch.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedOptics: { type: Type.ARRAY, items: { type: Type.STRING } },
            nonDetectableOptics: { type: Type.ARRAY, items: { type: Type.STRING } },
            aquaImpactScore: { type: Type.NUMBER },
            comparativeIntelligence: { type: Type.STRING },
            timeSensitivity: { type: Type.STRING },
            plainLanguageSummary: { type: Type.STRING },
            scoreBreakdown: {
              type: Type.OBJECT,
              properties: {
                opticalSeverity: { type: Type.NUMBER },
                visibleArea: { type: Type.NUMBER },
                ecosystemSensitivity: { type: Type.NUMBER },
                humanProximity: { type: Type.NUMBER }
              }
            },
            scoreExplanation: { type: Type.STRING },
            likelyPollutionCategory: { type: Type.STRING },
            environmentalImpactExplanation: { type: Type.STRING },
            humanHealthImplications: { type: Type.STRING },
            environmentalRiskLevel: { type: Type.STRING },
            riskJustification: { type: Type.STRING },
            actionIntelligence: {
              type: Type.OBJECT,
              properties: {
                recommendedAction: { type: Type.STRING },
                notificationTargets: { type: Type.ARRAY, items: { type: Type.STRING } },
                followUpEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                labValidationAdvisory: { type: Type.STRING },
                remediationStrategy: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            confidencePercentage: { type: Type.NUMBER },
            confidenceLevel: { type: Type.STRING },
            confidenceFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
            assessmentLimitations: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const text = response.text || '';
    const report: AnalysisReport = JSON.parse(text);
    report.sourceMode = 'Live';
    report.systemAdvisory = SYSTEM_DISCLAIMER;
    
    const sources: GroundingSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    for (const chunk of groundingChunks) {
      if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
    }

    return { report, sources, mode: 'Live' };

  } catch (error: any) {
    console.warn("Live API unavailable or synthesis failed. Falling back to cached intelligence.", error);
    const index = Math.abs(file.name.length) % MOCK_REPORTS.length;
    return { 
      report: MOCK_REPORTS[index], 
      sources: [
        { title: "Standard Environmental Risk Procedures", uri: "https://www.epa.gov/environmental-topics" }
      ],
      mode: 'Demo' 
    };
  }
}

export async function generateAudioReport(report: AnalysisReport): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      AQUA-TRACE Impact Intelligence Briefing:
      AIS Score: ${report.aquaImpactScore}. Urgency: ${report.timeSensitivity}.
      Summary: ${report.plainLanguageSummary}.
      Risk Rationale: ${report.riskJustification}.
      Disclaimer: This briefing is based on optical triage and must be lab-verified.
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
  } catch {
    throw new Error("Audio Briefing currently unavailable.");
  }
}