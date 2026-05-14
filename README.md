# ng-scanner-llm (Build With AI 2026 - Angular)

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 19.2.x.

## Links Úteis
 - [Documentação Angular Oficial](https://angular.dev/)
 - [Google AI for Developers](https://ai.google.dev/gemini-api/docs/get-started/tutorial?hl=pt-br&lang=node)
 - [AI Studio API keys](https://aistudio.google.com/app/api-keys)
 - [Firebase Studio](https://idx.google.com/)
 - [Angularizando](https://angularizando.com.br/artigos)

## 1. Instalação das dependências

### Terminal
```
node -v
npm i -g @angular/cli

ng new ng-scanner-llm
// Which stylesheet format would you like to use? css
// Do you want to enable Server-Side Rendering (SSR) and Static Site Generation (SSG/Prerendering)? No

cd ng-scanner-llm

npm i @google/genai

npm run start
```

## 2. Integrando Gemini com Angular (Apenas texto)

### src/app/app.component.ts
```typescript
import { Component, signal } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = 'SUA_API_KEY';

@Component({
  selector: 'app-root',
  template: `
    <h1>Integrando Angular com Gemini</h1>
    <input [value]="initialQuestion" #input />
    <button (click)="generateText(input.value)">Gerar texto</button>
    <p>{{ text() }}</p>
  `,
})
export class App {
  private ai = new GoogleGenAI({apiKey: GEMINI_API_KEY });
  initialQuestion = "Quem é esse pokémon?"
  text = signal('');

  async generateText(prompt: string) {   
    const result = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    this.text.set(result.text || '');
  }
}
```

## 3. Integrando Gemini com Angular (Multimodal: texto + imagem)

```
Image url: https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/025.png
```

### src/app/app.component.ts
```typescript
import { Component, signal } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = 'SUA_API_KEY';

@Component({
  selector: 'app-root',
  template: `
    <h1>Integrando Angular com Gemini</h1>
    <input [value]="initialQuestion" #input />
    <button (click)="generateText(input.value)">Gerar texto</button>
    <p>{{ text() }}</p>
  `,
})
export class App {
  private ai = new GoogleGenAI({apiKey: GEMINI_API_KEY });
  initialQuestion = "Quem é esse pokémon?"
  text = signal('');

  async generateText(prompt: string) {   
    const base64Data = 'SUA_IMAGEM_COMO_BASE64';
    const result = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: prompt },
        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
      ],
    });
    this.text.set(result.text || '');
  }
}
```

## 4. Criação do Layout principal (Scanner utilizando camera)

### src/app/gemini.service.ts
```typescript
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const GEMINI_API_KEY = 'SUA_API_KEY';

export interface CompendiumEntry {
  objeto_identificado: boolean;
  nome_adaptado: string;
  descricao: string;
  categoria: string;
  box_2d?: number[]; 
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
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
```

### src/app/app.component.ts
```typescript
import { Component, ElementRef, ViewChild, signal, inject } from '@angular/core';
import { GeminiService, CompendiumEntry } from './gemini.service';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <div class="main-container">
      <h1>Sheikah Scanner</h1>

      <div class="camera-box">
        <video #video autoplay playsinline muted [style.display]="isCameraActive() ? 'block' : 'none'"></video>
        
        @if (isCameraActive()) { <div class="scan-line"></div> }
        
        @if (!isCameraActive()) { <div class="placeholder">Câmera Desativada</div> }
        
        <canvas #canvas hidden></canvas>
      </div>

      <div class="controls">
        @if (!isCameraActive()) {
          <button (click)="ligarCamera()">Ativar Scanner</button>
        } @else {
          <button (click)="analisar()" [disabled]="isAnalyzing()">
            {{ isAnalyzing() ? 'Analisando...' : 'Analisar Objeto' }}
          </button>
          <button (click)="desligarCamera()" class="btn-off">Desligar</button>
        }
      </div>

      @if (mostrarModal()) {
        <div class="modal" (click)="fecharModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <canvas #modalCanvas class="result-canvas"></canvas>
            
            <div class="info">
              @if (resultado()?.objeto_identificado) {
                <h2>{{ resultado()?.nome_adaptado }}</h2>
                <p class="badge">{{ resultado()?.categoria }}</p>
                <p>{{ resultado()?.descricao }}</p>
              } @else {
                <h2>Imagem Inconclusiva</h2>
                <p>Tente novamente! A imagem está sem definição ou o objeto não foi detectado.</p>
              }
              <button (click)="fecharModal()">Fechar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class App {
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('modalCanvas') modalCanvasRef!: ElementRef<HTMLCanvasElement>;

  geminiService = inject(GeminiService);
  
  isCameraActive = signal(false);
  isAnalyzing = signal(false);
  mostrarModal = signal(false);
  resultado = signal<CompendiumEntry | null>(null);
  stream: MediaStream | null = null;

  async ligarCamera() {
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    this.videoRef.nativeElement.srcObject = this.stream;
    this.isCameraActive.set(true);
  }

  desligarCamera() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.isCameraActive.set(false);
  }

  async analisar() {
    this.isAnalyzing.set(true);
    
    // 1. Capturar frame atual
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    
    const fotoBase64 = canvas.toDataURL('image/jpeg');

    try {
      // 2. Chamar Gemini
      const res = await this.geminiService.analisarObjeto(fotoBase64);
      this.resultado.set(res);
      this.mostrarModal.set(true);

      // 3. Desenhar no canvas do Modal (após o Angular renderizar o elemento)
      setTimeout(() => this.renderizarResultado(fotoBase64, res.box_2d), 100);
      
    } catch (e) {
      alert("Erro ao conectar com Hyrule!");
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  renderizarResultado(foto: string, box?: number[]) {
    const canvas = this.modalCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      if (box && box.length === 4) {
        const [ymin, xmin, ymax, xmax] = box;
        ctx!.strokeStyle = '#00bcd4';
        ctx!.lineWidth = 10;
        ctx?.strokeRect(
          (xmin / 1000) * canvas.width,
          (ymin / 1000) * canvas.height,
          ((xmax - xmin) / 1000) * canvas.width,
          ((ymax - ymin) / 1000) * canvas.height
        );
      }
    };
    img.src = foto;
  }

  fecharModal() {
    this.mostrarModal.set(false);
  }
}
```

### src/styles.scss
```scss
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
.main-container {
  text-align: center;
  background: #050a10;
  color: white;
  min-height: 100vh;
  padding: 20px;
}
.camera-box {
  position: relative;
  width: 300px;
  height: 400px;
  margin: 0 auto;
  border: 2px solid #00bcd4;
  overflow: hidden;
}
video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.placeholder {
  padding-top: 180px;
  color: #444;
}
.scan-line {
  position: absolute;
  top: 0;
  width: 100%;
  height: 5px;
  background: #00bcd4;
  box-shadow: 0 0 15px #00bcd4;
  animation: scan 2s infinite;
}
@keyframes scan {
  from {
    top: 0;
  }
  to {
    top: 100%;
  }
}
.controls {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}
button {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid #00bcd4;
  color: #00bcd4;
  cursor: pointer;
}
.btn-off {
  border-color: #ff5252;
  color: #ff5252;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.modal-card {
  background: #08121c;
  padding: 20px;
  border: 1px solid #00bcd4;
  max-width: 90%;
}
.result-canvas {
  width: 100%;
  max-width: 300px;
  border: 1px solid #222;
}
.badge {
  background: #00bcd4;
  color: #000;
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
}

```