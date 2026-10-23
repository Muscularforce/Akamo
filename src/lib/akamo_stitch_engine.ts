/**
 * Akamo Stitch UI Ingestion & MCP Bridge Engine
 * Direct DOM controller preserving all 100% Stitch aesthetic layout classes.
 */

export interface TrackState {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  streamUrl: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  volume: number;
}

export class AkamoStitchEngine {
  private audioElement: HTMLAudioElement;
  private state: TrackState;
  private mcpEndpoint: string;

  constructor(mcpEndpoint: string = '/api/mcp') {
    this.mcpEndpoint = mcpEndpoint;
    this.audioElement = new Audio();
    this.state = {
      id: 'trk_default_01',
      title: 'ABHANG.mpeg',
      artist: 'whiteman31',
      coverUrl: '',
      streamUrl: '',
      duration: 0,
      currentTime: 0,
      isPlaying: false,
      volume: 0.8
    };

    if (typeof window !== 'undefined') {
      this.initDOMBindings();
      this.initAudioListeners();
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 1. DOM HOOKS INGESTION
  // ══════════════════════════════════════════════════════════════════════

  private initDOMBindings(): void {
    // Play/Pause Main Control
    const playBtn = document.querySelector<HTMLButtonElement>(
      'div.fixed.bottom-16 button.w-12.h-12.rounded-full, div.fixed.bottom-0 button.w-12.h-12.rounded-full'
    );
    if (playBtn) {
      playBtn.addEventListener('click', () => this.togglePlayback());
    }

    // Skip Buttons
    const prevBtn = document.querySelector('button:has(span:contains("skip_previous"))');
    const nextBtn = document.querySelector('button:has(span:contains("skip_next"))');
    prevBtn?.addEventListener('click', () => this.seekDelta(-10));
    nextBtn?.addEventListener('click', () => this.seekDelta(10));

    // Progress Bar Scrubbing
    const progressTrack = document.querySelector<HTMLElement>('.fixed.bottom-16 .h-1.bg-surface-variant, .fixed.bottom-0 .h-1.bg-surface-variant');
    if (progressTrack) {
      progressTrack.addEventListener('click', (e: MouseEvent) => {
        const rect = progressTrack.getBoundingClientRect();
        const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (this.audioElement.duration) {
          this.seekTo(fraction * this.audioElement.duration);
        }
      });
    }

    // Upload Modal Triggering
    const uploadTriggers = document.querySelectorAll<HTMLButtonElement>(
      'header button:has(span:contains("cloud_upload")), nav button:has(span:contains("cloud_upload")), main button:has(span:contains("cloud_upload"))'
    );
    uploadTriggers.forEach(btn => {
      btn.addEventListener('click', () => this.showUploadModal());
    });

    this.initUploadModalEvents();
  }

  // ══════════════════════════════════════════════════════════════════════
  // 2. AUDIO ENGINE & LED STATE SYNC
  // ══════════════════════════════════════════════════════════════════════

  private initAudioListeners(): void {
    this.audioElement.addEventListener('timeupdate', () => {
      this.state.currentTime = this.audioElement.currentTime;
      this.updateProgressDOM();
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      this.state.duration = this.audioElement.duration;
      this.updateProgressDOM();
    });

    this.audioElement.addEventListener('ended', () => {
      this.setPlayState(false);
    });
  }

  public async loadTrack(track: Partial<TrackState>): Promise<void> {
    Object.assign(this.state, track);
    
    const titleEl = document.querySelector('div.truncate h4.crt-glow');
    const artistEl = document.querySelector('div.truncate p.text-code-sm');
    if (titleEl) titleEl.textContent = this.state.title;
    if (artistEl) artistEl.textContent = this.state.artist;

    await this.callMCPTool('stream_audio_track', {
      track_id: this.state.id,
      audio_url: this.state.streamUrl
    });

    if (this.state.streamUrl) {
      this.audioElement.src = this.state.streamUrl;
      this.audioElement.load();
      await this.play();
    }
  }

  public async togglePlayback(): Promise<void> {
    if (this.state.isPlaying) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  public async play(): Promise<void> {
    if (!this.audioElement.src) return;
    try {
      await this.audioElement.play();
      this.setPlayState(true);
      
      await this.callMCPTool('update_player_state', {
        track_id: this.state.id,
        action: 'PLAY',
        position_seconds: this.audioElement.currentTime,
        volume: this.audioElement.volume
      });
    } catch (e) {
      console.error('[Akamo] Playback error:', e);
    }
  }

  public async pause(): Promise<void> {
    this.audioElement.pause();
    this.setPlayState(false);

    await this.callMCPTool('update_player_state', {
      track_id: this.state.id,
      action: 'PAUSE',
      position_seconds: this.audioElement.currentTime,
      volume: this.audioElement.volume
    });
  }

  public async seekTo(seconds: number): Promise<void> {
    this.audioElement.currentTime = seconds;
    this.state.currentTime = seconds;
    this.updateProgressDOM();

    await this.callMCPTool('update_player_state', {
      track_id: this.state.id,
      action: 'SEEK',
      position_seconds: seconds
    });
  }

  public seekDelta(deltaSeconds: number): void {
    const target = Math.max(0, Math.min(this.audioElement.duration || 0, this.audioElement.currentTime + deltaSeconds));
    this.seekTo(target);
  }

  private setPlayState(isPlaying: boolean): void {
    this.state.isPlaying = isPlaying;
    
    const iconSpan = document.querySelector<HTMLElement>(
      'div.fixed.bottom-16 button.w-12.h-12 span, div.fixed.bottom-0 button.w-12.h-12 span'
    );
    if (iconSpan) {
      iconSpan.textContent = isPlaying ? 'pause' : 'play_arrow';
    }

    const progressFill = document.querySelector<HTMLElement>('.bg-crt-phosphor');
    if (progressFill) {
      if (isPlaying) {
        progressFill.classList.add('shadow-[0_0_12px_rgba(29,185,84,0.9)]');
      } else {
        progressFill.classList.remove('shadow-[0_0_12px_rgba(29,185,84,0.9)]');
      }
    }
  }

  private updateProgressDOM(): void {
    const fraction = this.state.duration > 0 ? (this.state.currentTime / this.state.duration) * 100 : 0;
    
    const progressFill = document.querySelector<HTMLElement>('.bg-crt-phosphor');
    const progressThumb = document.querySelector<HTMLElement>('.fixed.bottom-16 .w-3.h-3.bg-white, .fixed.bottom-0 .w-3.h-3.bg-white');
    const timeDisplay = document.querySelector<HTMLElement>('div.w-1\\/3.justify-end span.text-code-sm');

    if (progressFill) {
      progressFill.style.width = `${fraction}%`;
    }
    if (progressThumb) {
      progressThumb.style.left = `${fraction}%`;
    }
    if (timeDisplay) {
      const mins = Math.floor(this.state.currentTime / 60);
      const secs = Math.floor(this.state.currentTime % 60).toString().padStart(2, '0');
      timeDisplay.textContent = `${mins}:${secs}`;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. FULL UPLOAD WORKFLOW & MODAL WIRING
  // ══════════════════════════════════════════════════════════════════════

  public showUploadModal(): void {
    let modal = document.getElementById('akamo-publish-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'akamo-publish-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md';
      modal.innerHTML = `
        <div class="absolute inset-0 crt-overlay"></div>
        <div class="relative w-full max-w-lg bg-charcoal-case rounded-[32px] chiseled-panel p-8 md:p-12 overflow-hidden flex flex-col items-center shadow-2xl">
          <button id="modal-close-btn" class="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-surface-container-high rounded-full chiseled-button text-on-surface-variant hover:text-on-surface transition-colors">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div class="text-center mb-10 w-full mt-4">
            <h1 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2 tracking-tight">Publish Sounds</h1>
            <p class="font-body-md text-body-md text-on-surface-variant">Broadcast your frequencies to the global network.</p>
          </div>
          <div id="modal-dropzone" class="w-full flex-1 rounded-[24px] border-2 border-dashed border-outline-variant bg-surface-dim p-10 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-colors hover:bg-surface-container-lowest">
            <div class="absolute inset-0 shadow-[inset_0_4px_20px_rgba(0,0,0,0.4)] pointer-events-none"></div>
            <div class="w-20 h-20 bg-surface-container-highest rounded-2xl chiseled-button flex items-center justify-center mb-8 group-hover:bg-surface-variant transition-colors">
              <span class="material-symbols-outlined text-[32px] text-on-surface">upload</span>
            </div>
            <div class="text-center space-y-2 mb-6">
              <h2 id="dropzone-status-header" class="font-headline-md text-headline-md text-on-surface">Synchronize Audio</h2>
              <p id="dropzone-status-sub" class="font-body-md text-body-md text-on-surface-variant">Drag assets here or select manually</p>
            </div>
            <div id="modal-progress-container" class="w-full hidden mt-4">
              <div class="w-full h-2 bg-surface-variant rounded-full overflow-hidden recessed-well">
                <div id="modal-progress-bar" class="h-full bg-crt-phosphor shadow-[0_0_8px_rgba(29,185,84,0.8)] transition-all duration-200" style="width: 0%"></div>
              </div>
              <p id="modal-progress-text" class="text-code-sm font-code-sm text-primary text-center mt-2">TRANSMITTING: 0%</p>
            </div>
            <div class="mt-4">
              <span class="font-label-caps text-label-caps text-crt-phosphor glow-text uppercase tracking-widest">WAV &amp; FLAC FILES ARE NOW SUPPORTED</span>
            </div>
          </div>
          <input id="modal-file-input" accept=".wav,.flac,.mp3" class="hidden" type="file" />
        </div>
      `;
      document.body.appendChild(modal);
      this.initUploadModalEvents();
    }
    modal.classList.remove('hidden');
  }

  private initUploadModalEvents(): void {
    const modal = document.getElementById('akamo-publish-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const dropzone = document.getElementById('modal-dropzone');
    const fileInput = document.getElementById('modal-file-input') as HTMLInputElement;

    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-primary', 'bg-primary/5');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-primary', 'bg-primary/5');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-primary', 'bg-primary/5');
        if (e.dataTransfer?.files.length) {
          this.executeUploadPipeline(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files?.length) {
          this.executeUploadPipeline(fileInput.files[0]);
        }
      });
    }
  }

  private async executeUploadPipeline(file: File): Promise<void> {
    const progressContainer = document.getElementById('modal-progress-container');
    const progressBar = document.getElementById('modal-progress-bar');
    const progressText = document.getElementById('modal-progress-text');
    const statusHeader = document.getElementById('dropzone-status-header');
    const statusSub = document.getElementById('dropzone-status-sub');

    if (progressContainer) progressContainer.classList.remove('hidden');
    if (statusHeader) statusHeader.textContent = 'TRANSMITTING FREQUENCY';
    if (statusSub) statusSub.textContent = file.name;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      
      let progress = 10;
      const interval = setInterval(() => {
        progress = Math.min(90, progress + 15);
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `INGESTING SIGNAL: ${progress}%`;
      }, 150);

      const response = await this.callMCPTool('process_audio_upload', {
        filename: file.name,
        file_bytes_base64: base64Data,
        target_album: 'User Uploads'
      });

      clearInterval(interval);

      if (response && response.status === 'success') {
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = 'BROADCAST VERIFIED // 100%';
        if (statusHeader) statusHeader.textContent = 'UPLOAD SUCCESSFUL';
        
        setTimeout(() => {
          document.getElementById('akamo-publish-modal')?.classList.add('hidden');
          if (progressContainer) progressContainer.classList.add('hidden');
          if (statusHeader) statusHeader.textContent = 'Synchronize Audio';
        }, 1200);
      } else {
        if (statusHeader) statusHeader.textContent = 'TRANSMISSION ABORTED';
        if (progressText) progressText.textContent = response?.message || 'INGESTION_ERROR';
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // 4. JSON-RPC 2.0 MCP DISPATCHER
  // ══════════════════════════════════════════════════════════════════════

  public async callMCPTool(toolName: string, args: Record<string, any>): Promise<any> {
    try {
      const payload = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      const res = await fetch(this.mcpEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      return json.result?.content?.[0]?.text ? JSON.parse(json.result.content[0].text) : json.result;
    } catch (err) {
      console.warn(`[Akamo MCP] Tool call to ${toolName} failed:`, err);
      return null;
    }
  }
}
