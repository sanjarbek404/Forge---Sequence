/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Play, 
  Download, 
  Image as ImageIcon, 
  Video as VideoIcon,
  Loader2,
  ArrowRight,
  RefreshCw,
  Info,
  Key
} from "lucide-react";

// Extend Window interface for AI Studio helpers
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type GenerationStage = 'idle' | 'generating-logo' | 'logo-ready' | 'animating' | 'complete';

export default function App() {
  const [description, setDescription] = useState('');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const handleGenerateLogo = async () => {
    if (!description.trim()) return;

    setStage('generating-logo');
    setError(null);
    setStatusMessage('Crafting your unique logo design...');

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            {
              text: `Create a professional, modern logo for a company with this description: ${description}. The logo should be clean, iconic, and suitable for high-end branding. Minimalist aesthetic, vector style.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: imageSize
          },
        },
      });

      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            setLogoUrl(`data:image/png;base64,${base64Data}`);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error('No image was generated. Please try a different description.');
      }

      setStage('logo-ready');
    } catch (err: any) {
      console.error('Logo generation error:', err);
      setError(err.message || 'Failed to generate logo. Please try again.');
      setStage('idle');
    }
  };

  const handleAnimateLogo = async () => {
    if (!logoUrl) return;

    setStage('animating');
    setError(null);
    setStatusMessage('Bringing your logo to life with motion...');

    try {
      const ai = getAI();
      // Extract base64 from data URL
      const base64Image = logoUrl.split(',')[1];

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Animate this logo in a sleek, professional way. Subtle motion, elegant transitions, 3D depth effects, and a dynamic background that complements the logo's aesthetic. High quality, cinematic motion graphics.`,
        image: {
          imageBytes: base64Image,
          mimeType: 'image/png'
        },
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });

      // Poll for completion
      while (!operation.done) {
        const messages = [
          'Analyzing logo structure...',
          'Simulating physics and motion...',
          'Rendering cinematic frames...',
          'Finalizing animation sequences...',
          'Polishing visual effects...'
        ];
        setStatusMessage(messages[Math.floor(Math.random() * messages.length)]);
        
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': process.env.GEMINI_API_KEY || '',
          },
        });
        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        setVideoUrl(videoUrl);
        setStage('complete');
      } else {
        throw new Error('Failed to retrieve the generated video URI.');
      }

    } catch (err: any) {
      console.error('Animation error:', err);
      setError(err.message || 'Failed to animate logo. Please try again.');
      setStage('logo-ready');
    }
  };

  const reset = () => {
    setStage('idle');
    setLogoUrl(null);
    setVideoUrl(null);
    setError(null);
    setDescription('');
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full border border-editorial-border p-12 text-center space-y-8 bg-white/50 backdrop-blur-sm"
        >
          <div className="w-16 h-16 border border-ink flex items-center justify-center mx-auto rotate-45">
            <Key className="w-6 h-6 text-ink -rotate-45" />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-serif italic">Authorization Required</h2>
            <p className="text-ink/60 text-xs leading-relaxed uppercase tracking-widest font-bold">
              Access to high-fidelity synthesis requires a validated Gemini API key.
            </p>
          </div>
          <button 
            onClick={handleSelectKey}
            className="w-full bg-ink text-bg font-bold py-4 text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center justify-center gap-3"
          >
            Select API Key
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="pt-4">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-30 hover:opacity-100 underline transition-all"
            >
              Billing Documentation
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent/20">
      <header className="h-[60px] border-b border-editorial-border flex items-center justify-between px-10 bg-bg/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="font-serif italic text-xl tracking-tight">Forge & Sequence</div>
        <div className="flex gap-8 text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">
          <button onClick={reset} className="hover:opacity-100 transition-opacity flex items-center gap-2">
            <RefreshCw className="w-3 h-3" />
            Restart Study
          </button>
          <span className="cursor-default">Theory</span>
          <span className="cursor-default">Archive</span>
        </div>
      </header>

      <main className="grid lg:grid-cols-[320px_1fr] min-h-[calc(100vh-60px)]">
        {/* Sidebar: Controls */}
        <div className="p-10 border-r border-editorial-border flex flex-col gap-10 bg-bg">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col h-full"
          >
            <div className="space-y-8 flex-1">
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.15em] font-bold opacity-60 block">
                  The Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter brand essence..."
                  className="w-full h-40 bg-transparent border border-editorial-border p-4 font-serif text-lg resize-none focus:outline-none focus:border-ink transition-colors leading-relaxed"
                  disabled={stage !== 'idle'}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.15em] font-bold opacity-60 block">
                  Visual Fidelity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1K', '2K', '4K'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setImageSize(size)}
                      className={`py-2 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                        imageSize === size 
                          ? 'bg-ink text-bg border-ink' 
                          : 'bg-transparent border-editorial-border text-ink/40 hover:border-ink/30'
                      }`}
                      disabled={stage !== 'idle'}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.15em] font-bold opacity-60 block">
                  Study Status
                </label>
                <div className="text-xs font-serif italic opacity-80">
                  {stage === 'idle' && "Awaiting input parameters..."}
                  {stage === 'generating-logo' && "Synthesizing visual identity..."}
                  {stage === 'logo-ready' && "Static identity finalized."}
                  {stage === 'animating' && "Calculating temporal dynamics..."}
                  {stage === 'complete' && "Motion study concluded."}
                </div>
              </div>
            </div>

            <div className="pt-10">
              {stage === 'idle' && (
                <button
                  onClick={handleGenerateLogo}
                  disabled={!description.trim()}
                  className="w-full bg-ink text-bg py-4 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-90 disabled:opacity-30 transition-all flex items-center justify-center gap-3"
                >
                  Generate Identity
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {stage === 'logo-ready' && (
                <button
                  onClick={handleAnimateLogo}
                  className="w-full bg-accent text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center justify-center gap-3"
                >
                  Initiate Motion
                  <Play className="w-4 h-4" />
                </button>
              )}

              {(stage === 'generating-logo' || stage === 'animating') && (
                <div className="w-full border border-editorial-border py-4 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin opacity-40" />
                  <span className="text-[9px] uppercase tracking-widest font-bold opacity-40">{statusMessage}</span>
                </div>
              )}

              {stage === 'complete' && (
                <button
                  onClick={reset}
                  className="w-full border border-ink py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-ink hover:text-bg transition-all"
                >
                  New Study
                </button>
              )}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 p-4 border border-red-500/20 text-red-800 text-[10px] uppercase tracking-widest font-bold"
              >
                Error: {error}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Right Panel: Canvas & Motion Strip */}
        <div className="flex flex-col bg-white">
          {/* Canvas Area */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden p-12">
            <div className="absolute top-10 right-10 font-serif italic text-2xl opacity-5 pointer-events-none rotate-[-90deg] origin-top-right">
              Draft {new Date().toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}
            </div>
            
            <AnimatePresence mode="wait">
              {stage === 'idle' && (
                <motion.div
                  key="idle-preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4"
                >
                  <div className="w-20 h-20 border border-editorial-border flex items-center justify-center mx-auto mb-4 rotate-45">
                    <ImageIcon className="w-6 h-6 text-ink/10 -rotate-45" />
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-20">Identity Canvas</p>
                </motion.div>
              )}

              {(stage === 'generating-logo' || stage === 'logo-ready' || stage === 'animating') && logoUrl && !videoUrl && (
                <motion.div
                  key="logo-preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="relative w-full max-w-lg aspect-square flex flex-col items-center justify-center"
                >
                  <img 
                    src={logoUrl} 
                    alt="Generated Identity" 
                    className={`w-full h-full object-contain p-12 transition-all duration-1000 ${stage === 'animating' ? 'blur-md opacity-30 scale-110' : ''}`}
                    referrerPolicy="no-referrer"
                  />
                  
                  {stage === 'animating' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 animate-pulse">
                        Processing Temporal Frames
                      </div>
                    </div>
                  )}

                  {stage === 'logo-ready' && (
                    <div className="absolute bottom-0 flex justify-center w-full">
                      <a 
                        href={logoUrl} 
                        download="identity-static.png"
                        className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-30 hover:opacity-100 flex items-center gap-2 transition-all"
                      >
                        <Download className="w-3 h-3" />
                        Export Static
                      </a>
                    </div>
                  )}
                </motion.div>
              )}

              {stage === 'complete' && videoUrl && (
                <motion.div
                  key="video-preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full max-w-3xl space-y-8"
                >
                  <div className="relative aspect-video bg-[#eee] border border-editorial-border shadow-sm">
                    <video 
                      src={videoUrl} 
                      autoPlay 
                      loop 
                      controls 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-6 left-6 px-3 py-1 bg-bg/80 backdrop-blur-md border border-editorial-border text-[9px] font-bold uppercase tracking-widest">
                      Motion Study 01
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end border-t border-editorial-border pt-8">
                    <div className="space-y-1">
                      <h3 className="font-serif italic text-xl">Temporal Identity</h3>
                      <p className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-40">1080p • Sequence Study • MP4</p>
                    </div>
                    <a 
                      href={videoUrl} 
                      download="identity-motion.mp4"
                      className="px-8 py-3 bg-ink text-bg text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center gap-2"
                    >
                      <Download className="w-3 h-3" />
                      Export Study
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Motion Strip */}
          <div className="h-[180px] border-t border-editorial-border flex items-center px-10 gap-10 bg-bg/30">
            <div className="w-[180px]">
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold opacity-60 block mb-2">Motion Study</span>
              <div className="text-xs font-bold uppercase tracking-widest">
                {stage === 'complete' ? "Linear Growth" : "Awaiting Sequence"}
              </div>
            </div>
            
            <div className="flex-1 flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i}
                  className={`flex-shrink-0 w-32 h-20 border border-editorial-border relative bg-white/50 ${
                    stage === 'complete' && i === 2 ? 'border-ink border-2 opacity-100' : 'opacity-30'
                  }`}
                >
                  <span className="absolute bottom-2 left-2 text-[8px] font-mono font-bold">00:0{i}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-full border border-ink flex items-center justify-center text-[9px] font-bold uppercase tracking-widest cursor-pointer hover:bg-ink hover:text-bg transition-all">
                Play
              </div>
              <div className="text-[10px] tracking-[0.1em] font-bold opacity-40">
                {stage === 'complete' ? "02.4s / 05.0s" : "00.0s / 05.0s"}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center border-t border-editorial-border text-[9px] uppercase tracking-[0.3em] font-bold opacity-20 bg-bg">
        Forge & Sequence • Computational Identity Studio • Powered by Gemini & Veo
      </footer>
    </div>
  );
}
