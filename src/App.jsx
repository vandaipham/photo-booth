import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RefreshCcw, Download, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState('welcome'); // 'welcome', 'camera', 'processing', 'result'
  const [photos, setPhotos] = useState([]);
  const [finalImage, setFinalImage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Clean up camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize camera when entering 'camera' step
  useEffect(() => {
    if (step === 'camera') {
      const initCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } 
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraError(null);
        } catch (err) {
          console.error("Error accessing camera:", err);
          setCameraError("Unable to access the camera. Please ensure you have granted permission.");
        }
      };
      initCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [step, stopCamera]);

  // Process photos when 4 are taken
  useEffect(() => {
    if (photos.length === 4 && step === 'camera') {
      setStep('processing');
      generateFinalImage();
    }
  }, [photos, step]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Flip horizontally for a mirror effect
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // High quality for saving locally
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setPhotos(prev => [...prev, dataUrl]);
  };

  const generateFinalImage = async () => {
    try {
      const frameImg = new Image();
      frameImg.crossOrigin = "anonymous";
      frameImg.src = 'Frame_metro.png';
      await new Promise((resolve, reject) => {
        frameImg.onload = resolve;
        frameImg.onerror = () => reject(new Error("Failed to load frame image"));
      });

      const photoImgs = await Promise.all(photos.map(url => {
        return new Promise(resolve => {
          const img = new Image();
          img.src = url;
          img.onload = () => resolve(img);
        });
      }));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Keep full resolution for downloading
      canvas.width = frameImg.width;
      canvas.height = frameImg.height;

      const w = canvas.width;
      const h = canvas.height;

      const boxes = [
        { x: 0.05 * w, y: 0.07 * h, w: 0.9 * w, h: 0.20 * h },
        { x: 0.05 * w, y: 0.29 * h, w: 0.9 * w, h: 0.20 * h },
        { x: 0.05 * w, y: 0.51 * h, w: 0.9 * w, h: 0.20 * h },
        { x: 0.05 * w, y: 0.73 * h, w: 0.9 * w, h: 0.20 * h },
      ];

      photoImgs.forEach((photo, i) => {
        const box = boxes[i];
        const imgRatio = photo.width / photo.height;
        const boxRatio = box.w / box.h;
        let sw = photo.width, sh = photo.height, sx = 0, sy = 0;

        if (imgRatio > boxRatio) {
          sw = photo.height * boxRatio;
          sx = (photo.width - sw) / 2;
        } else {
          sh = photo.width / boxRatio;
          sy = (photo.height - sh) / 2;
        }

        ctx.drawImage(photo, sx, sy, sw, sh, box.x, box.y, box.w, box.h);
      });

      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = canvas.width;
      frameCanvas.height = canvas.height;
      const fCtx = frameCanvas.getContext('2d');
      fCtx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

      const imgData = fCtx.getImageData(0, 0, frameCanvas.width, frameCanvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 20 && data[i + 1] < 20 && data[i + 2] < 20) {
          data[i + 3] = 0;
        }
      }
      fCtx.putImageData(imgData, 0, 0);

      ctx.drawImage(frameCanvas, 0, 0);

      // High quality export
      setFinalImage(canvas.toDataURL('image/jpeg', 0.95));
      setStep('result');

    } catch (err) {
      console.error(err);
      showToast("Error processing image. Please try again.");
      setStep('welcome');
      setPhotos([]);
    }
  };

  const handleDownload = () => {
    if (!finalImage) return;
    
    // Create a temporary link element to trigger the download
    const link = document.createElement('a');
    link.href = finalImage;
    link.download = `Metropolia_PhotoBooth_${new Date().getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Photo saved successfully!");
  };

  const resetBooth = () => {
    setPhotos([]);
    setFinalImage(null);
    setStep('welcome');
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 relative font-sans"
      style={{ backgroundImage: `url('image_ddad45.jpg')` }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden border border-white/20">
        
        <div className="bg-[#f25c27] p-6 text-center text-white">
          <h1 className="text-3xl font-extrabold tracking-tight">Metropolia</h1>
          <p className="text-orange-100 text-sm font-medium mt-1 uppercase tracking-wider">Photo Booth</p>
        </div>

        <div className="p-6">
          {step === 'welcome' && (
            <div className="text-center py-8 space-y-6">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Camera className="w-12 h-12 text-[#f25c27]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Ready for your close-up?</h2>
              <p className="text-gray-600">Take 4 fun photos and get a personalized Metropolia souvenir frame.</p>
              <button 
                onClick={() => setStep('camera')}
                className="w-full py-4 bg-[#f25c27] hover:bg-[#d94a1a] text-white rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
              >
                Start Photo Booth
              </button>
            </div>
          )}

          {step === 'camera' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-full flex justify-between items-center mb-2 px-1">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Photo {photos.length + 1} of 4</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-3 h-3 rounded-full ${i < photos.length ? 'bg-[#f25c27]' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>

              {cameraError ? (
                <div className="w-full aspect-[3/4] bg-gray-100 rounded-2xl flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-red-300">
                  <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                  <p className="text-red-600 font-medium">{cameraError}</p>
                  <button 
                    onClick={resetBooth}
                    className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              ) : (
                <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-inner group">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                  />
                  <div className="absolute inset-0 pointer-events-none opacity-20 border border-white/50">
                    <div className="absolute top-1/3 w-full border-t border-white/50"></div>
                    <div className="absolute top-2/3 w-full border-t border-white/50"></div>
                    <div className="absolute left-1/3 h-full border-l border-white/50"></div>
                    <div className="absolute left-2/3 h-full border-l border-white/50"></div>
                  </div>
                </div>
              )}

              {!cameraError && (
                <button 
                  onClick={takePhoto}
                  className="w-20 h-20 bg-[#f25c27] hover:bg-[#d94a1a] rounded-full border-4 border-white shadow-xl flex items-center justify-center transition-transform active:scale-95 mt-4"
                >
                  <Camera className="w-8 h-8 text-white" />
                </button>
              )}
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-16 flex flex-col items-center justify-center">
              <Loader2 className="w-16 h-16 text-[#f25c27] animate-spin mb-6" />
              <h2 className="text-2xl font-bold text-gray-800">Developing photos...</h2>
              <p className="text-gray-500 mt-2">Adding the Metropolia magic.</p>
            </div>
          )}

          {step === 'result' && finalImage && (
            <div className="flex flex-col items-center animate-fade-in">
              <div className="w-full max-h-[50vh] overflow-hidden rounded-xl border-4 border-gray-100 shadow-md mb-6 bg-gray-50">
                <img 
                  src={finalImage} 
                  alt="Your Photo Booth Strip" 
                  className="w-full h-auto object-contain max-h-[50vh]"
                />
              </div>

              <div className="w-full mb-4">
                <button
                  onClick={handleDownload}
                  className="w-full py-4 bg-[#f25c27] hover:bg-[#d94a1a] text-white rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center"
                >
                  <Download className="w-6 h-6 mr-2" />
                  Save Photo to Device
                </button>
              </div>

              <button 
                onClick={resetBooth}
                className="flex items-center justify-center w-full py-3 text-gray-600 bg-white border-2 border-gray-200 hover:bg-gray-50 hover:text-gray-800 rounded-xl font-bold transition-colors"
              >
                <RefreshCcw className="w-5 h-5 mr-2" />
                Take New Photos
              </button>
            </div>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2 animate-bounce-short">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        @keyframes bounce-short {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -5px); }
        }
        .animate-bounce-short {
          animation: bounce-short 0.3s ease-in-out;
        }
      `}} />
    </div>
  );
}