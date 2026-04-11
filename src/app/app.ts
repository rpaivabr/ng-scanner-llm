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