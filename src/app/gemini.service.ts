import { Injectable } from '@angular/core';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export interface CompendiumEntry {
  objeto_identificado: boolean;
  nome_adaptado: string;
  descricao: string;
  categoria: string;
  box_2d?: number[]; 
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai = new GoogleGenAI({ apiKey: 'AIzaSyBHc8cZDdYE7qEBzwFpVXkV3lSxSIrjLIM' });
  
  // O aluno pode mudar isso aqui para testar outros temas!
  private temaAtivo = 'The Legend of Zelda';

  async analisarObjeto(imageBase64: string): Promise<CompendiumEntry> {
    const prompt = `Aja como um scanner do universo ${this.temaAtivo}. 
    Analise a imagem e identifique o objeto principal. 
    Se não for possível identificar um objeto claro, retorne objeto_identificado: false.
    Caso identifique, use muita criatividade para dar um nome e descrição que combine com ${this.temaAtivo}.
    Retorne também as coordenadas [ymin, xmin, ymax, xmax] do objeto (escala 0-1000).`;

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        objeto_identificado: { type: Type.BOOLEAN },
        nome_adaptado: { type: Type.STRING },
        descricao: { type: Type.STRING },
        categoria: { type: Type.STRING },
        box_2d: { type: Type.ARRAY, items: { type: Type.INTEGER } }
      },
      required: ["objeto_identificado", "nome_adaptado", "descricao", "categoria"]
    };

    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { data: base64Data, mimeType: "image/jpeg" } }] }],
      config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.8 }
    });

    return JSON.parse(response.text!);
  }
}