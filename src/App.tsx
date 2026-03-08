import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scan, Upload, Zap, AlertTriangle, CheckCircle2, Fingerprint, Activity, Camera, Mic, X, RefreshCw, StopCircle } from 'lucide-react';
import { analyzeVibe, type ScanResult } from './services/gemini';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream when component unmounts or camera closes
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please check permissions.");
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Calculate dimensions to maintain aspect ratio with a max width/height of 1024
      const MAX_DIM = 1024;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > height) {
        if (width > MAX_DIM) {
          height *= MAX_DIM / width;
          width = MAX_DIM;
        }
      } else {
        if (height > MAX_DIM) {
          width *= MAX_DIM / height;
          height = MAX_DIM;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      const context = canvas.getContext('2d');
      if (context) {
        // Flip horizontally for mirror effect if using front camera (standard UX)
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Compress to 80% quality
        setImage(dataUrl);
        setIsCameraOpen(false);
        stopCameraStream();
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
      setError("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImage(result);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const startScan = async () => {
    if (!image) return;

    setIsScanning(true);
    setError(null);

    try {
      // Extract base64 data and mime type for image
      const match = image.match(/^data:(.*);base64,(.*)$/);
      if (!match) throw new Error("Invalid image format");
      
      const imageMimeType = match[1];
      const imageBase64 = match[2];

      let audioData;
      if (audioBlob) {
        const audioBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(audioBlob);
        });
        audioData = { base64: audioBase64, mimeType: audioBlob.type };
      }

      const scanResult = await analyzeVibe(
        { base64: imageBase64, mimeType: imageMimeType },
        audioData
      );
      setResult(scanResult);
    } catch (err: any) {
      setError(err.message || "Scan failed. The subject's energy field is too complex or the connection was interrupted.");
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const reset = () => {
    setImage(null);
    setAudioBlob(null);
    setResult(null);
    setError(null);
    setIsCameraOpen(false);
    stopCameraStream();
  };

  return (
    <div className="min-h-screen bg-black text-orange-500 font-mono selection:bg-pink-500/30 selection:text-pink-200 overflow-x-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(255, 165, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 105, 180, 0.1) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }}>
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-2xl min-h-screen flex flex-col">
        {/* Header */}
        <header className="mb-8 text-center border-b border-orange-500/30 pb-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 mb-2"
          >
            <Scan className="w-8 h-8 text-pink-500" />
            <h1 className="text-3xl font-bold tracking-tighter uppercase bg-gradient-to-r from-orange-500 via-white to-pink-500 text-transparent bg-clip-text">LezVibe<span className="text-xs align-top ml-1 opacity-60 text-orange-500">v3.0</span></h1>
          </motion.div>
          <p className="text-pink-500/60 text-sm uppercase tracking-widest">Sapphic Energy Scanner</p>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {!image && !isCameraOpen ? (
              <motion.div 
                key="start"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md"
              >
                <button 
                  onClick={startCamera}
                  className="w-full border-2 border-dashed border-pink-500/30 rounded-2xl p-12 flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-pink-500/5 hover:border-pink-500/60 transition-all group min-h-[400px]"
                >
                  <div className="w-24 h-24 rounded-full bg-pink-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(255,105,180,0.2)]">
                    <Camera className="w-10 h-10 opacity-60 group-hover:opacity-100 text-pink-400" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-pink-400">Start Live Scan</h3>
                    <p className="text-pink-500/50 text-sm">Initialize biometric sensors</p>
                  </div>
                </button>
              </motion.div>
            ) : isCameraOpen ? (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full relative rounded-2xl overflow-hidden border border-orange-500/30 bg-black aspect-[3/4] max-w-md"
              >
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-8">
                  <button 
                    onClick={() => {
                      setIsCameraOpen(false);
                      stopCameraStream();
                    }}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <div className="w-12 h-12 bg-white rounded-full" />
                  </button>
                </div>
              </motion.div>
            ) : !result ? (
              <motion.div 
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center gap-6"
              >
                <div className="relative w-full aspect-square max-w-sm rounded-2xl overflow-hidden border border-orange-500/30 bg-black group">
                  <img src={image} alt="Subject" className="w-full h-full object-cover opacity-80" />
                  
                  {/* Scanning Overlay */}
                  {isScanning && (
                    <motion.div 
                      className="absolute inset-0 bg-orange-500/20"
                      initial={{ clipPath: 'inset(0 0 100% 0)' }}
                      animate={{ clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0 0)', 'inset(100% 0 0 0)'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-white to-pink-500 shadow-[0_0_20px_rgba(255,165,0,1)]"></div>
                    </motion.div>
                  )}
                  
                  <button 
                    onClick={reset}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Audio Recorder Controls */}
                <div className="w-full max-w-sm flex items-center gap-4 p-4 rounded-xl border border-pink-500/20 bg-pink-500/5">
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-widest opacity-60 mb-1 text-pink-400">Voice Sample</div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      {audioBlob ? (
                        <span className="text-pink-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Captured</span>
                      ) : isRecording ? (
                        <span className="text-red-400 animate-pulse flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full" /> Recording...</span>
                      ) : (
                        <span className="opacity-50 text-pink-300">Optional: Add vocal data</span>
                      )}
                    </div>
                  </div>
                  
                  {!audioBlob ? (
                    <button
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onTouchStart={startRecording}
                      onTouchEnd={stopRecording}
                      className={`p-3 rounded-full transition-all ${
                        isRecording 
                          ? 'bg-red-500 text-white scale-110 shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                          : 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-500'
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setAudioBlob(null)}
                      className="p-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex gap-4 w-full max-w-sm">
                  <button 
                    onClick={startScan}
                    disabled={isScanning}
                    className="flex-1 py-4 bg-gradient-to-r from-orange-500 via-white to-pink-500 text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50 uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,105,180,0.3)] transition-all"
                  >
                    {isScanning ? (
                      <>
                        <Zap className="w-4 h-4 animate-pulse" /> Processing
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" /> Verify Vibe
                      </>
                    )}
                  </button>
                </div>
                
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg border border-red-500/30"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md space-y-6"
              >
                <div className="border border-orange-500 rounded-2xl p-6 bg-orange-500/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-20 text-pink-500">
                    <CheckCircle2 className="w-24 h-24" />
                  </div>
                  
                  <div className="relative z-10 space-y-6">
                    <div className="text-center pb-6 border-b border-white/10">
                      <div className="text-[10px] uppercase tracking-widest opacity-60 mb-2 text-orange-300">Detected Subject</div>
                      <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400 uppercase tracking-tighter">
                        {result.genderResult}
                      </h2>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1 text-orange-300">Vibe Identity</div>
                      <h3 className="text-2xl font-bold text-white uppercase break-words">{result.vibeIdentity}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-black/40 rounded-xl border border-orange-500/20">
                        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-2 text-orange-300">Chaos Level</div>
                        <div className="text-2xl font-bold text-white">{result.chaosLevel}%</div>
                        <div className="w-full h-1 bg-gray-800 mt-2 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${result.chaosLevel}%` }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="h-full bg-gradient-to-r from-orange-500 to-pink-500"
                          />
                        </div>
                      </div>
                      <div className="p-4 bg-black/40 rounded-xl border border-pink-500/20">
                        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-2 text-pink-300">Aura Color</div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full border border-white/20 shadow-[0_0_10px_currentColor]"
                            style={{ backgroundColor: result.auraColor, color: result.auraColor }}
                          />
                          <span className="text-sm font-bold text-white">{result.auraColor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1 text-orange-300">Secret Power</div>
                        <p className="text-lg text-white">{result.secretPower}</p>
                      </div>
                      
                      {result.vocalAnalysis && (
                        <div>
                          <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1 text-pink-300">Sonic Signature</div>
                          <p className="text-sm text-pink-200 italic">"{result.vocalAnalysis}"</p>
                        </div>
                      )}

                      <div>
                        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1 text-white/50">The Truth</div>
                        <p className="text-sm italic opacity-80 text-white">"{result.theTruth}"</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={reset}
                  className="w-full py-4 border border-orange-500/30 rounded-xl hover:bg-orange-500/10 uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2 text-orange-400"
                >
                  <RefreshCw className="w-4 h-4" /> Scan Another Subject
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-[10px] uppercase tracking-widest opacity-30 text-pink-300">
          <p>System Status: Online</p>
          <p className="mt-2">Disclaimer: For entertainment purposes only. Results generated by AI.</p>
        </footer>
      </main>
    </div>
  );
}
