import { GoogleGenAI, Type } from '@google/genai';
import type { XRayResponse } from './types.js';

function buildFallbackXRay(
  filePath: string,
  directDependents: string[],
  totalImpact: number,
  commitCount: number,
  topAuthor: string
): XRayResponse {
  const churnNote =
    commitCount > 0
      ? ` Son commit'lerde ${commitCount} kez değiştirildi (ana geliştirici: ${topAuthor}).`
      : '';

  return {
    summary: `${filePath} modülü, projedeki ${directDependents.length} doğrudan bağımlı bileşene temel veri veya iş mantığı sağlar.${churnNote}`,
    riskReason:
      totalImpact > 0
        ? `Bu dosyadaki imzaların veya dönüş tiplerinin değişmesi toplam ${totalImpact} dosyada domino etkisi yaratarak derleme veya çalışma zamanı hatasına yol açar.`
        : 'Bu dosya uç katmanda yer alır; doğrudan başka bir modül tarafından import edilmediği için kırılma riski düşüktür.',
    checklist: [
      'Dışa aktarılan (export) fonksiyon ve tip imzalarının geriye dönük uyumlu kaldığını doğrula.',
      directDependents[0]
        ? `Birincil tüketici olan ${directDependents[0]} dosyasını değişiklik sonrası test et.`
        : 'Dosya içi uç durum (null/undefined) kontrollerini gözden geçir.',
      topAuthor && topAuthor !== '—'
        ? `Kod sahibi (${topAuthor}) ile kritik iş kurallarını teyit et.`
        : 'Varsa döngüsel import zinciri oluşturmadığından emin ol.',
    ],
  };
}

export async function generateFileXRay(
  filePath: string,
  codeSnippet: string,
  directDependents: string[],
  totalImpact: number,
  commitCount = 0,
  topAuthor = '—'
): Promise<XRayResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildFallbackXRay(filePath, directDependents, totalImpact, commitCount, topAuthor);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const trimmedCode = codeSnippet.split('\n').slice(0, 140).join('\n');

    const prompt = `Sen kıdemli bir yazılım mimarısın. Aşağıdaki kaynak kod dosyasını analiz et ve Türkçe olarak kısa, net bir risk raporu üret.
Dosya Yolu: ${filePath}
Doğrudan Etkilenen Dosyalar (${directDependents.length}): ${directDependents.slice(0, 10).join(', ') || 'Yok'}
Toplam Domino Etkisi: ${totalImpact} dosya
Son Commit Değişim Sayısı (Churn): ${commitCount}
Ana Kod Sahibi (Bus Factor): ${topAuthor}

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
              description:
                'Bu dosyaya dokunmanın neden riskli olduğunu (hem domino etkisini hem commit sıklığını dikkate alarak) açıklayan kısa Türkçe analiz.',
            },
            checklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Değişiklik yapmadan önce kontrol edilecek 3 somut Türkçe madde.',
            },
          },
          required: ['summary', 'riskReason', 'checklist'],
        },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      return buildFallbackXRay(filePath, directDependents, totalImpact, commitCount, topAuthor);
    }

    const parsed = JSON.parse(rawText) as XRayResponse;
    return {
      summary: parsed.summary,
      riskReason: parsed.riskReason,
      checklist: parsed.checklist.slice(0, 3),
    };
  } catch {
    return buildFallbackXRay(filePath, directDependents, totalImpact, commitCount, topAuthor);
  }
}