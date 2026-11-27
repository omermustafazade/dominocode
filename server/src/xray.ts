import { GoogleGenAI, Type } from '@google/genai';
import type { PrReviewResponse, XRayResponse } from './types.js';

function buildFallbackXRay(
  filePath: string,
  directDependents: string[],
  totalImpact: number,
  circularPartners: string[]
): XRayResponse {
  return {
    summary: `${filePath} modülü, projedeki ${directDependents.length} doğrudan bağımlı bileşene temel veri veya iş mantığı sağlar.`,
    riskReason:
      totalImpact > 0
        ? `Bu dosyadaki imzaların veya dönüş tiplerinin değişmesi toplam ${totalImpact} dosyada domino etkisi yaratarak derleme veya çalışma zamanı hatasına yol açar.`
        : 'Bu dosya uç katmanda yer alır; doğrudan başka bir modül tarafından import edilmediği için kırılma riski düşüktür.',
    checklist: [
      'Dışa aktarılan (export) fonksiyon ve tip imzalarının geriye dönük uyumlu kaldığını doğrula.',
      directDependents[0]
        ? `Birincil tüketici olan ${directDependents[0]} dosyasını değişiklik sonrası test et.`
        : 'Dosya içi uç durum (null/undefined) kontrollerini gözden geçir.',
      'Bağımlı modüllerdeki birim veya entegrasyon testlerini çalıştır.',
    ],
    circularFix:
      circularPartners.length > 0
        ? `${filePath} ile ${circularPartners.join(', ')} arasındaki çift yönlü import döngüsünü kırmak için ortak arayüzleri (types/interfaces) ayrı bir paylaşılan modüle taşıyın veya bağımlılık enjeksiyonu (Dependency Injection) kullanın.`
        : undefined,
  };
}

export async function generateFileXRay(
  filePath: string,
  codeSnippet: string,
  directDependents: string[],
  totalImpact: number,
  circularPartners: string[] = []
): Promise<XRayResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildFallbackXRay(filePath, directDependents, totalImpact, circularPartners);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const trimmedCode = codeSnippet.split('\n').slice(0, 140).join('\n');
    const circularNote =
      circularPartners.length > 0
        ? `DİKKAT: Bu dosyanın şu dosyalarla DÖNGÜSEL BAĞIMLILIĞI (Circular Dependency) var: ${circularPartners.join(', ')}. circularFix alanında bu döngüyü mimari olarak nasıl kıracağımızı tek net Türkçe paragrafta öner.`
        : 'Bu dosyada döngüsel bağımlılık yok, circularFix alanını boş bırak.';

    const prompt = `Sen kıdemli bir yazılım mimarısın. Aşağıdaki kaynak kod dosyasını analiz et ve Türkçe olarak kısa, net bir risk raporu üret.
Dosya Yolu: ${filePath}
Doğrudan Etkilenen Dosyalar (${directDependents.length}): ${directDependents.slice(0, 10).join(', ') || 'Yok'}
Toplam Domino Etkisi: ${totalImpact} dosya
${circularNote}

Kod İçeriği (ilk 140 satır):
\`\`\`
${trimmedCode}
\`\`\``;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'Bu dosyanın sistemdeki görevini açıklayan tek net Türkçe cümle.',
            },
            riskReason: {
              type: Type.STRING,
              description: 'Bu dosyaya dokunmanın neden riskli olduğunu açıklayan kısa Türkçe analiz.',
            },
            checklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Değişiklik yapmadan önce kontrol edilecek 3 somut Türkçe madde.',
            },
            circularFix: {
              type: Type.STRING,
              description: 'Varsa döngüsel bağımlılığı kırmak için somut refactor önerisi.',
            },
          },
          required: ['summary', 'riskReason', 'checklist'],
        },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      return buildFallbackXRay(filePath, directDependents, totalImpact, circularPartners);
    }

    const parsed = JSON.parse(rawText) as XRayResponse;
    return {
      summary: parsed.summary,
      riskReason: parsed.riskReason,
      checklist: parsed.checklist.slice(0, 3),
      circularFix:
        circularPartners.length > 0
          ? parsed.circularFix ||
            buildFallbackXRay(filePath, directDependents, totalImpact, circularPartners).circularFix
          : undefined,
    };
  } catch {
    return buildFallbackXRay(filePath, directDependents, totalImpact, circularPartners);
  }
}

function buildFallbackPrReview(
  prTitle: string,
  changedFiles: string[],
  blastPercentage: number,
  circularCount: number
): PrReviewResponse {
  let verdict: PrReviewResponse['verdict'] = 'DÜŞÜK RİSK';
  if (blastPercentage >= 30 || circularCount > 0) verdict = 'YÜKSEK RİSK';
  else if (blastPercentage >= 12 || changedFiles.length >= 3) verdict = 'DİKKATLİ OL';

  return {
    verdict,
    reason: `"${prTitle}" değişikliği ${changedFiles.length} kaynak dosyaya dokunuyor ve kod tabanının %${blastPercentage}'lik bölümünde domino etkisi oluşturuyor.`,
    reviewComment: `DominoCode Otomatik Etki Analizi: Bu değişiklik kod tabanının %${blastPercentage}'ini doğrudan veya dolaylı etkiliyor. Merge öncesi etkilenen üst katman modüllerin entegrasyon testlerini doğrulayın.`,
  };
}

export async function generatePrReview(
  prTitle: string,
  changedFiles: string[],
  directCount: number,
  indirectCount: number,
  blastPercentage: number,
  circularCount: number
): Promise<PrReviewResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildFallbackPrReview(prTitle, changedFiles, blastPercentage, circularCount);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Sen kıdemli bir tech lead'sin. Aşağıdaki Pull Request etki analizine göre Türkçe merge kararı ver.
PR Başlığı: ${prTitle}
Değişen Dosyalar: ${changedFiles.join(', ')}
Doğrudan Etkilenen Dosya Sayısı: ${directCount}
Dolaylı Etkilenen Dosya Sayısı: ${indirectCount}
Toplam Kod Tabanı Etki Yüzdesi: %${blastPercentage}
Repodaki Döngüsel Bağımlılık Sayısı: ${circularCount}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: {
              type: Type.STRING,
              enum: ['DÜŞÜK RİSK', 'DİKKATLİ OL', 'YÜKSEK RİSK'],
            },
            reason: {
              type: Type.STRING,
              description: 'Merge kararının arkasındaki 1-2 cümlelik net Türkçe gerekçe.',
            },
            reviewComment: {
              type: Type.STRING,
              description: 'GitHub PR altına yapıştırılabilecek profesyonel Türkçe code review notu.',
            },
          },
          required: ['verdict', 'reason', 'reviewComment'],
        },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      return buildFallbackPrReview(prTitle, changedFiles, blastPercentage, circularCount);
    }
    return JSON.parse(rawText) as PrReviewResponse;
  } catch {
    return buildFallbackPrReview(prTitle, changedFiles, blastPercentage, circularCount);
  }
}